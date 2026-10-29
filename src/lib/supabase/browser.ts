import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Cliente de Supabase para el navegador (subir archivos a Storage con la sesión del usuario). */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
