import { createClient } from "@/lib/supabase/server";
import type { Memory, MemoryDecoration, MemoryInput } from "@/types/memory";

// Capa de acceso a datos (tabla public.memories en Supabase).
// Las páginas nunca consultan Supabase directamente: pasan por aquí.

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
  published: boolean;
}

const COLUMNS =
  "id, slug, title, date, excerpt, content, greeting, signature, decoration, decoration_caption, tags, published";

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
    published: row.published,
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
    published: input.published,
  };
}

/** Error al guardar con un mensaje listo para mostrar en el formulario. */
export class MemoryWriteError extends Error {}

function writeError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new MemoryWriteError("Ya existe una página con esa dirección (slug). Usa otra.");
  }
  throw new MemoryWriteError(`No se pudo guardar: ${error.message}`);
}

/** Páginas publicadas, las más recientes primero (para el libro). */
export async function getMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .eq("published", true)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Error leyendo recuerdos: ${error.message}`);
  return (data as MemoryRow[]).map(toMemory);
}

/** Todas las páginas, incluidos borradores (para el panel). */
export async function getAllMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Error leyendo recuerdos: ${error.message}`);
  return (data as MemoryRow[]).map(toMemory);
}

export async function getMemoryBySlug(slug: string): Promise<Memory | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo el recuerdo: ${error.message}`);
  return data ? toMemory(data as MemoryRow) : undefined;
}

export async function getMemoryById(id: string): Promise<Memory | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Error leyendo el recuerdo: ${error.message}`);
  return data ? toMemory(data as MemoryRow) : undefined;
}

export async function createMemory(input: MemoryInput): Promise<Memory> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").insert(toRow(input)).select(COLUMNS).single();
  if (error) writeError(error);
  return toMemory(data as MemoryRow);
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
  return toMemory(data as MemoryRow);
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw new MemoryWriteError(`No se pudo borrar: ${error.message}`);
}
