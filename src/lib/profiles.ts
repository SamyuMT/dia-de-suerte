import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/memory";

// Directorio de usuarios del libro (tabla profiles).

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

function toProfile(row: ProfileRow): Profile {
  return { id: row.id, email: row.email, displayName: row.display_name ?? row.email };
}

/** Los demás usuarios del libro (para elegir con quién compartir). */
export async function getOtherProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .neq("id", auth.user?.id ?? "")
    .order("display_name");
  if (error) throw new Error(`Error leyendo usuarios: ${error.message}`);
  return (data as ProfileRow[]).map(toProfile);
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo tu perfil: ${error.message}`);
  return data ? toProfile(data as ProfileRow) : null;
}

export async function updateMyDisplayName(displayName: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Necesitas iniciar sesión.");
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", auth.user.id);
  if (error) throw new Error(`No se pudo guardar tu nombre: ${error.message}`);
}
