import "server-only";
import { resolveMx } from "node:dns/promises";
import { sendWelcomeEmail } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Solicitudes para entrar al libro (tabla membership_requests) y administradores (app_admins).
// Pedir acceso no crea cuentas: la cuenta la crea un administrador al admitir la solicitud.

export type MembershipStatus = "pending" | "approved" | "rejected";

export interface MembershipRequest {
  id: string;
  nickname: string;
  email: string;
  phone: string;
  status: MembershipStatus;
  createdAt: string;
  reviewedAt?: string;
}

interface RequestRow {
  id: string;
  nickname: string;
  email: string;
  phone: string;
  status: MembershipStatus;
  created_at: string;
  reviewed_at: string | null;
}

const toRequest = (r: RequestRow): MembershipRequest => ({
  id: r.id,
  nickname: r.nickname,
  email: r.email,
  phone: r.phone,
  status: r.status,
  createdAt: r.created_at,
  reviewedAt: r.reviewed_at ?? undefined,
});

/** Error con un mensaje listo para mostrar. */
export class MembershipError extends Error {}

/** true si el dominio del correo puede recibir correos (tiene registros MX). */
export async function emailDomainReceivesMail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    return records.length > 0;
  } catch (e) {
    // Si el DNS tarda o falla por otra razón, no se bloquea a la persona.
    const code = (e as { code?: string }).code;
    return !(code === "ENOTFOUND" || code === "ENODATA");
  }
}

/** Guarda una solicitud (cualquiera puede pedir; no revela si el correo ya tiene cuenta). */
export async function requestMembership(input: { nickname: string; email: string; phone: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_membership", {
    p_nickname: input.nickname,
    p_email: input.email,
    p_phone: input.phone,
  });
  if (error?.code === "P0001") throw new MembershipError(error.message);
  if (error) throw new MembershipError("No se pudo enviar la solicitud. Inténtalo de nuevo en un momento.");
}

/** ¿El usuario actual es administrador? */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from("app_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  return Boolean(data);
}

/** Solicitudes (el RLS solo deja verlas a administradores). */
export async function getMembershipRequests(): Promise<{ pending: MembershipRequest[]; reviewed: MembershipRequest[] }> {
  const supabase = await createClient();
  const [pending, reviewed] = await Promise.all([
    supabase
      .from("membership_requests")
      .select("id, nickname, email, phone, status, created_at, reviewed_at")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("membership_requests")
      .select("id, nickname, email, phone, status, created_at, reviewed_at")
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(20),
  ]);
  if (pending.error) throw new Error(`Error leyendo solicitudes: ${pending.error.message}`);
  if (reviewed.error) throw new Error(`Error leyendo solicitudes: ${reviewed.error.message}`);
  return {
    pending: (pending.data as RequestRow[]).map(toRequest),
    reviewed: (reviewed.data as RequestRow[]).map(toRequest),
  };
}

export async function getPendingMembershipCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("membership_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !(await isAdmin())) throw new MembershipError("Solo un administrador puede hacer esto.");
  return auth.user.id;
}

async function getPendingRequest(admin: ReturnType<typeof createAdminClient>, id: string): Promise<RequestRow> {
  const { data, error } = await admin
    .from("membership_requests")
    .select("id, nickname, email, phone, status, created_at, reviewed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo la solicitud: ${error.message}`);
  if (!data || data.status !== "pending") throw new MembershipError("Esa solicitud ya fue respondida.");
  return data as RequestRow;
}

/**
 * Admite una solicitud: crea la cuenta con la contraseña inicial, le pone su apodo
 * y le envía el correo de bienvenida. Si el correo falla, la cuenta queda creada igual.
 */
export async function approveMembership(
  id: string,
  password: string,
  loginUrl: string,
): Promise<{ nickname: string; email: string; emailSent: boolean; emailError?: string }> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();
  const request = await getPendingRequest(admin, id);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: request.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: request.nickname, must_change_password: true },
  });
  if (createError) {
    if (createError.code === "email_exists") throw new MembershipError("Ese correo ya tiene una cuenta en el libro.");
    if (createError.code === "weak_password") {
      throw new MembershipError("Esa contraseña es muy débil o ya apareció en filtraciones. Elige otra.");
    }
    throw new MembershipError(`No se pudo crear la cuenta: ${createError.message}`);
  }
  const userId = created.user.id;

  // El trigger arma un apodo desde el correo; se reemplaza por el que pidió (si sigue libre).
  await admin.from("profiles").update({ display_name: request.nickname }).eq("id", userId);

  await admin
    .from("membership_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminId, user_id: userId })
    .eq("id", id);

  try {
    await sendWelcomeEmail({ email: request.email, nickname: request.nickname, password, loginUrl });
    return { nickname: request.nickname, email: request.email, emailSent: true };
  } catch (e) {
    return {
      nickname: request.nickname,
      email: request.email,
      emailSent: false,
      emailError: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

export async function rejectMembership(id: string): Promise<{ nickname: string }> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();
  const request = await getPendingRequest(admin, id);
  const { error } = await admin
    .from("membership_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", id);
  if (error) throw new MembershipError(`No se pudo rechazar: ${error.message}`);
  return { nickname: request.nickname };
}
