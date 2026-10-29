"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { checkNewPassword, passwordUpdateError } from "@/lib/passwords";
import { updateMyDisplayName } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error: string | null; done: string | null; attempt: number };

export async function saveName(prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireUser();
  const name = String(formData.get("displayName") ?? "").trim();
  const next = { error: null, done: null, attempt: prev.attempt + 1 };
  if (!name) return { ...next, error: "Escribe cómo quieres que te vean." };
  if (name.length > 60) return { ...next, error: "El nombre puede tener hasta 60 caracteres." };

  try {
    await updateMyDisplayName(name);
  } catch (e) {
    return { ...next, error: e instanceof Error ? e.message : "No se pudo guardar tu nombre." };
  }
  revalidatePath("/", "layout");
  return { ...next, done: "Nombre guardado." };
}

export async function changePassword(prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = { error: null, done: null, attempt: prev.attempt + 1 };

  const passwordError = checkNewPassword(password, confirm);
  if (passwordError) return { ...next, error: passwordError };

  const supabase = await createClient();
  // Pedir la contraseña actual evita que alguien la cambie con una sesión abierta ajena.
  const { error: checkError } = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: current });
  if (checkError) return { ...next, error: "La contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ...next, error: passwordUpdateError(error.code) };
  return { ...next, done: "Listo, tu contraseña cambió." };
}
