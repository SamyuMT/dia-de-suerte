import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Cliente con la clave secreta de Supabase: salta el RLS y puede crear usuarios.
 * SOLO para el servidor y solo después de comprobar que quien pide es administrador.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("Falta SUPABASE_SECRET_KEY (clave secreta de Supabase) en las variables de entorno.");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
