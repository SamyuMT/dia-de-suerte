import { createClient } from "@/lib/supabase/server";
import type { DirectoryEntry, Profile } from "@/types/memory";

// Usuarios del libro (tabla profiles) y amistades (tabla friendships).
// De los demás solo se puede leer el apodo; los correos no se exponen.
// Las amistades se escriben con las funciones send_friend_request, respond_friend_request
// y remove_friendship de la base.

/** Apodo: 3 a 30 letras, números, punto, guion o guion bajo (igual que en la base). */
export const NICKNAME_PATTERN = /^[A-Za-z0-9_.ÁÉÍÓÚÜÑáéíóúüñ-]{3,30}$/;

interface ProfileRow {
  id: string;
  display_name: string;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
}

const toProfile = (row: ProfileRow): Profile => ({ id: row.id, displayName: row.display_name });

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function currentUserId(supabase: Supabase) {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function myFriendships(supabase: Supabase, userId: string): Promise<FriendshipRow[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw new Error(`Error leyendo amistades: ${error.message}`);
  return data as FriendshipRow[];
}

/** Mi perfil: apodo (de profiles) y correo (de mi sesión). */
export async function getMyProfile(): Promise<(Profile & { email: string }) | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo tu perfil: ${error.message}`);
  if (!data) return null;
  return { ...toProfile(data as ProfileRow), email: auth.user.email ?? "" };
}

/** Error al guardar el apodo con un mensaje listo para mostrar. */
export class NicknameError extends Error {}

export async function updateMyNickname(nickname: string): Promise<void> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) throw new NicknameError("Necesitas iniciar sesión.");
  const { error } = await supabase.from("profiles").update({ display_name: nickname }).eq("id", userId);
  if (error?.code === "23505") throw new NicknameError("Ese apodo ya lo usa alguien. Prueba con otro.");
  if (error?.code === "23514") throw new NicknameError("El apodo solo puede tener letras, números, punto y guiones.");
  if (error) throw new NicknameError(`No se pudo guardar tu apodo: ${error.message}`);
}

/** Mis amigos (para compartir recuerdos con ellos). */
export async function getFriends(): Promise<Profile[]> {
  return (await getDirectory()).filter((entry) => entry.status === "friends");
}

/**
 * Busca a alguien por su apodo exacto (sin importar mayúsculas), con su relación conmigo.
 * Es la única forma de encontrar a quien todavía no es amigo: el directorio completo no es visible.
 */
export async function findByNickname(nickname: string): Promise<DirectoryEntry | null> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return null;

  const { data, error } = await supabase.rpc("find_profile_by_nickname", { p_nickname: nickname });
  if (error) throw new Error(`Error buscando el apodo: ${error.message}`);
  const row = (data as ProfileRow[])[0];
  if (!row) return null;

  const f = (await myFriendships(supabase, userId)).find(
    (f) => f.requester_id === row.id || f.addressee_id === row.id,
  );
  const status = !f ? "none" : f.status === "accepted" ? "friends" : f.requester_id === userId ? "sent" : "received";
  return { ...toProfile(row), status, requestId: status === "received" ? f?.id : undefined };
}

/**
 * Personas con las que tengo relación (amigos y solicitudes), ordenadas por apodo.
 * El RLS de profiles solo deja ver a estas personas.
 */
export async function getDirectory(): Promise<DirectoryEntry[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return [];

  const [{ data, error }, friendships] = await Promise.all([
    supabase.from("profiles").select("id, display_name").neq("id", userId).order("display_name"),
    myFriendships(supabase, userId),
  ]);
  if (error) throw new Error(`Error leyendo usuarios: ${error.message}`);

  const byOther = new Map(
    friendships.map((f) => [f.requester_id === userId ? f.addressee_id : f.requester_id, f]),
  );

  return (data as ProfileRow[]).map((row) => {
    const f = byOther.get(row.id);
    const status = !f
      ? "none"
      : f.status === "accepted"
        ? "friends"
        : f.requester_id === userId
          ? "sent"
          : "received";
    return { ...toProfile(row), status, requestId: status === "received" ? f?.id : undefined };
  });
}

/** Solicitudes de amistad que me enviaron y no he respondido (para el aviso del menú). */
export async function getPendingRequestCount(): Promise<number> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return 0;
  const { count, error } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

/** Error de una acción de amistad con un mensaje listo para mostrar. */
export class FriendError extends Error {}

function friendError(error: { code?: string; message: string }): never {
  // Los mensajes de las funciones de la base ya vienen en español.
  if (error.code === "P0001" || error.code === "42501") throw new FriendError(error.message);
  throw new FriendError(`No se pudo completar: ${error.message}`);
}

/** Envía una solicitud. Si la otra persona ya me había enviado una, quedamos como amigos. */
export async function sendFriendRequest(userId: string): Promise<"sent" | "accepted"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_friend_request", { p_user_id: userId });
  if (error) friendError(error);
  return data as "sent" | "accepted";
}

export async function respondFriendRequest(requestId: string, accept: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_friend_request", { p_request_id: requestId, p_accept: accept });
  if (error) friendError(error);
}

/** Cancela una solicitud enviada o deja de ser amigos. */
export async function removeFriendship(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_friendship", { p_user_id: userId });
  if (error) friendError(error);
}
