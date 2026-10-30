"use server";

import { COUNTRIES } from "@/lib/countries";
import { MembershipError, emailDomainReceivesMail, requestMembership } from "@/lib/membership";
import { NICKNAME_PATTERN } from "@/lib/profiles";

export type RequestState = {
  error: string | null;
  sent: boolean;
  values: { nickname: string; email: string; country: string; number: string };
  attempt: number;
};

export async function sendMembershipRequest(prev: RequestState, formData: FormData): Promise<RequestState> {
  const values = {
    nickname: String(formData.get("nickname") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    country: String(formData.get("country") ?? ""),
    number: String(formData.get("number") ?? "").trim(),
  };
  const fail = (error: string): RequestState => ({ error, sent: false, values, attempt: prev.attempt + 1 });

  // Campo trampa: las personas no lo ven; los bots lo llenan. Se responde como si todo fuera bien.
  if (String(formData.get("website") ?? "") !== "") {
    return { error: null, sent: true, values, attempt: prev.attempt + 1 };
  }

  if (!NICKNAME_PATTERN.test(values.nickname)) {
    return fail("El apodo debe tener de 3 a 30 caracteres: letras, números, punto o guiones (sin espacios).");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email) || values.email.length > 254) {
    return fail("Escribe un correo válido, por ejemplo nombre@gmail.com.");
  }
  if (!(await emailDomainReceivesMail(values.email))) {
    return fail(`El dominio "${values.email.split("@")[1]}" no recibe correos. Revisa que el correo esté bien escrito.`);
  }

  const country = COUNTRIES.find((c) => c.code === values.country);
  const digits = values.number.replace(/\D/g, "").replace(/^0+/, "");
  if (!country) return fail("Elige el país de tu número.");
  if (digits.length < 6 || digits.length > 13) return fail("Escribe tu número de teléfono completo, sin el prefijo.");
  const phone = `${country.dial}${digits}`;
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) return fail("Ese número de teléfono no parece válido.");

  try {
    await requestMembership({ nickname: values.nickname, email: values.email, phone });
  } catch (e) {
    if (e instanceof MembershipError) return fail(e.message);
    throw e;
  }

  return {
    error: null,
    sent: true,
    values: { nickname: "", email: "", country: values.country, number: "" },
    attempt: prev.attempt + 1,
  };
}
