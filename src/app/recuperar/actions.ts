"use server";

import { redirect } from "next/navigation";
import { checkNewPassword, passwordUpdateError } from "@/lib/passwords";
import { createClient } from "@/lib/supabase/server";

export type RecoverState = {
  step: "email" | "code";
  email: string;
  error: string | null;
  notice: string | null;
};

/** Paso 1: envía el código al correo. No revela si el correo existe o no. */
export async function requestCode(_prev: RecoverState, formData: FormData): Promise<RecoverState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { step: "email", email, error: "Escribe un correo válido.", notice: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return {
      step: "email",
      email,
      error: "Ya se enviaron varios códigos. Espera unos minutos y vuelve a intentarlo.",
      notice: null,
    };
  }

  return {
    step: "code",
    email,
    error: null,
    notice: "Si ese correo tiene cuenta en el libro, te llegó un código. Revisa también el spam.",
  };
}

/** Paso 2: comprueba el código, inicia sesión y guarda la contraseña nueva. */
export async function resetWithCode(_prev: RecoverState, formData: FormData): Promise<RecoverState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fail = (error: string): RecoverState => ({ step: "code", email, error, notice: null });

  if (!/^\d{6,10}$/.test(code)) return fail("El código son los números que te llegaron al correo.");
  const passwordError = checkNewPassword(password, confirm);
  if (passwordError) return fail(passwordError);

  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (otpError) return fail("El código no es válido o ya venció. Pide uno nuevo.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(passwordUpdateError(error.code));

  redirect("/");
}
