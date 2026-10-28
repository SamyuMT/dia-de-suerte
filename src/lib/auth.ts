import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Usuario con sesión iniciada, o null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Para páginas protegidas: devuelve el usuario o manda al login. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Solo permite volver a rutas internas (evita redirecciones a otros sitios). */
export function safeNextPath(next: unknown) {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}
