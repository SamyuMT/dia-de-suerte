import { createClient } from "@/lib/supabase/server";
import type { Memory, MemoryDecoration, MemoryInput, MemoryVisibility, Profile } from "@/types/memory";

// Capa de acceso a datos (tablas memories, memory_viewers y profiles en Supabase).
// Las páginas nunca consultan Supabase directamente: pasan por aquí.
// Quién ve qué lo decide el RLS de la base; aquí solo se filtra lo que se muestra.

interface MemoryRow {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string[];
  greeting: string | null;
  signature: string | null;
  decoration: MemoryDecoration | null;
  decoration_caption: string | null;
  tags: string[];
  visibility: MemoryVisibility;
  created_by: string | null;
}

const COLUMNS =
  "id, slug, title, date, excerpt, content, greeting, signature, decoration, decoration_caption, tags, visibility, created_by";

function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    excerpt: row.excerpt,
    content: row.content,
    greeting: row.greeting ?? undefined,
    signature: row.signature ?? undefined,
    decoration: row.decoration ?? undefined,
    decorationCaption: row.decoration_caption ?? undefined,
    tags: row.tags,
    visibility: row.visibility,
    createdBy: row.created_by,
  };
}

function toRow(input: MemoryInput) {
  return {
    slug: input.slug,
    title: input.title,
    date: input.date,
    excerpt: input.excerpt,
    content: input.content,
    greeting: input.greeting ?? null,
    signature: input.signature ?? null,
    decoration: input.decoration ?? null,
    decoration_caption: input.decorationCaption ?? null,
    tags: input.tags,
    visibility: input.visibility,
  };
}

/** Error al guardar con un mensaje listo para mostrar en el formulario. */
export class MemoryWriteError extends Error {}

function writeError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new MemoryWriteError("Ya existe una página con esa dirección (slug). Usa otra.");
  }
  if (error.code === "PGRST116") {
    throw new MemoryWriteError("Solo quien escribió esta página puede editarla.");
  }
  throw new MemoryWriteError(`No se pudo guardar: ${error.message}`);
}

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Páginas del libro: todo lo que el usuario puede ver, menos los borradores. */
export async function getMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .neq("visibility", "draft")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Error leyendo recuerdos: ${error.message}`);
  return (data as MemoryRow[]).map(toMemory);
}

/** Páginas escritas por el usuario actual, incluidos borradores (para el panel). */
export async function getMyMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return [];
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .eq("created_by", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Error leyendo recuerdos: ${error.message}`);
  return (data as MemoryRow[]).map(toMemory);
}

/** Una página por su slug, si el usuario (o el visitante sin sesión) puede verla. */
export async function getMemoryBySlug(slug: string): Promise<Memory | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Error leyendo el recuerdo: ${error.message}`);
  return data ? toMemory(data as MemoryRow) : undefined;
}

/** Una página del usuario actual con sus usuarios elegidos (para editarla). */
export async function getMyMemoryById(
  id: string,
): Promise<{ memory: Memory; viewerIds: string[] } | undefined> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return undefined;

  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .eq("id", id)
    .eq("created_by", userId)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo el recuerdo: ${error.message}`);
  if (!data) return undefined;

  const { data: viewers, error: viewersError } = await supabase
    .from("memory_viewers")
    .select("user_id")
    .eq("memory_id", id);
  if (viewersError) throw new Error(`Error leyendo con quién se compartió: ${viewersError.message}`);

  return { memory: toMemory(data as MemoryRow), viewerIds: viewers.map((v) => v.user_id as string) };
}

/** Los demás usuarios del libro (para elegir con quién compartir). */
export async function getOtherProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .neq("id", userId ?? "")
    .order("display_name");
  if (error) throw new Error(`Error leyendo usuarios: ${error.message}`);
  return data.map((p) => ({
    id: p.id as string,
    email: p.email as string,
    displayName: (p.display_name as string | null) ?? (p.email as string),
  }));
}

/** Deja en memory_viewers exactamente los usuarios elegidos (vacío si no es "selected"). */
async function setViewers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memoryId: string,
  input: MemoryInput,
) {
  const viewerIds = input.visibility === "selected" ? input.viewerIds : [];

  const { error: deleteError } = await supabase.from("memory_viewers").delete().eq("memory_id", memoryId);
  if (deleteError) throw new MemoryWriteError(`No se pudo actualizar con quién se comparte: ${deleteError.message}`);

  if (viewerIds.length > 0) {
    const { error } = await supabase
      .from("memory_viewers")
      .insert(viewerIds.map((user_id) => ({ memory_id: memoryId, user_id })));
    if (error) throw new MemoryWriteError(`No se pudo compartir la página: ${error.message}`);
  }
}

export async function createMemory(input: MemoryInput): Promise<Memory> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").insert(toRow(input)).select(COLUMNS).single();
  if (error) writeError(error);
  const memory = toMemory(data as MemoryRow);
  await setViewers(supabase, memory.id, input);
  return memory;
}

export async function updateMemory(id: string, input: MemoryInput): Promise<Memory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .update(toRow(input))
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) writeError(error);
  await setViewers(supabase, id, input);
  return toMemory(data as MemoryRow);
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").delete().eq("id", id).select("id");
  if (error) throw new MemoryWriteError(`No se pudo borrar: ${error.message}`);
  if (data.length === 0) throw new MemoryWriteError("Solo quien escribió esta página puede borrarla.");
}
