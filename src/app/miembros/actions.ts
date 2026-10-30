"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { MembershipError, approveMembership, rejectMembership } from "@/lib/membership";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";

export type ApproveResult =
  | { ok: true; nickname: string; email: string; emailSent: boolean; emailError?: string }
  | { ok: false; error: string };

async function loginUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "dia-de-suerte.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/login`;
}

export async function approveAction(id: string, password: string): Promise<ApproveResult> {
  await requireUser();
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `La contraseña inicial debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  try {
    const result = await approveMembership(id, password, await loginUrl());
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof MembershipError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo admitir a esta persona." };
  }
}

export async function rejectAction(id: string): Promise<{ error?: string; done?: string }> {
  await requireUser();
  try {
    const { nickname } = await rejectMembership(id);
    revalidatePath("/", "layout");
    return { done: `La solicitud de ${nickname} quedó rechazada.` };
  } catch (e) {
    if (e instanceof MembershipError) return { error: e.message };
    throw e;
  }
}
