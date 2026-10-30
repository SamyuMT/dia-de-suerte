"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { checkNewPassword, passwordUpdateError } from "@/lib/passwords";
import { NICKNAME_PATTERN, NicknameError, updateMyNickname } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error: string | null; done: string | null; attempt: number };

export async function saveNickname(prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireUser();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const next = { error: null, done: null, attempt: prev.attempt + 1 };
  if (!NICKNAME_PATTERN.test(nickname)) {
    return {
      ...next,
      error: "El apodo debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo (sin espacios).",
    };
  }

  try {
    await updateMyNickname(nickname);
  } catch (e) {
    if (e instanceof NicknameError) return { ...next, error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ...next, done: "Apodo guardado." };
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

  // Ya no usa la contraseña inicial que le envió el administrador.
  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
  if (error) return { ...next, error: passwordUpdateError(error.code) };
  return { ...next, done: "Listo, tu contraseña cambió." };
}
