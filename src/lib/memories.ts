import { MEDIA_COLUMNS, signMedia, type MediaRow } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import type {
  BlockType,
  Memory,
  MemoryBlock,
  MemoryInput,
  MemoryKind,
  MemorySummary,
  MemoryVisibility,
} from "@/types/memory";

// Capa de acceso a datos de los recuerdos (memories → memory_pages → memory_blocks → block_media).
// Las páginas nunca consultan Supabase directamente: pasan por aquí.
// Quién ve qué lo decide el RLS de la base; aquí solo se filtra lo que se muestra.
// Las escrituras de páginas y bloques pasan por la función save_memory() de la base.

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface MemoryRow {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  visibility: MemoryVisibility;
  kind: MemoryKind;
  created_by: string | null;
}

interface BlockRow {
  position: number;
  type: BlockType;
  heading: string | null;
  body: string | null;
  caption: string | null;
  track_title: string | null;
  track_artist: string | null;
  decoration: "clavel" | null;
  block_media: { position: number; caption: string | null; media: MediaRow | null }[];
}

interface FullMemoryRow extends MemoryRow {
  memory_pages: { position: number; memory_blocks: BlockRow[] }[];
}

const COLUMNS = "id, slug, title, date, excerpt, tags, visibility, kind, created_by";

const FULL_COLUMNS = `${COLUMNS},
  memory_pages (position, memory_blocks (
    position, type, heading, body, caption, track_title, track_artist, decoration,
    block_media (position, caption, media (${MEDIA_COLUMNS}))
  ))`;

function toSummary(row: MemoryRow): MemorySummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    excerpt: row.excerpt,
    tags: row.tags,
    visibility: row.visibility,
    kind: row.kind,
    createdBy: row.created_by,
  };
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/** Arma el recuerdo completo, ordenado y con URLs firmadas para sus archivos. */
async function toMemory(supabase: Supabase, row: FullMemoryRow): Promise<Memory> {
  const pages = [...row.memory_pages].sort(byPosition);
  const mediaRows = pages.flatMap((p) =>
    p.memory_blocks.flatMap((b) => b.block_media.map((bm) => bm.media).filter((m): m is MediaRow => Boolean(m))),
  );
  const signed = await signMedia(supabase, mediaRows);

  return {
    ...toSummary(row),
    pages: pages.map((page) => ({
      blocks: [...page.memory_blocks].sort(byPosition).map(
        (b): MemoryBlock => ({
          type: b.type,
          heading: b.heading ?? undefined,
          body: b.body ?? undefined,
          caption: b.caption ?? undefined,
          trackTitle: b.track_title ?? undefined,
          trackArtist: b.track_artist ?? undefined,
          decoration: b.decoration ?? undefined,
          media: [...b.block_media].sort(byPosition).flatMap((bm) => {
            const media = bm.media ? signed.get(bm.media.id) : undefined;
            return media ? [{ media, caption: bm.caption ?? undefined }] : [];
          }),
        }),
      ),
    })),
  };
}

/** Error al guardar con un mensaje listo para mostrar en el editor. */
export class MemoryWriteError extends Error {}

function writeError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new MemoryWriteError("Ya existe un recuerdo con esa dirección (slug). Usa otra.");
  }
  if (error.code === "23514") {
    throw new MemoryWriteError("Hay un dato que no es válido. Revisa los textos y la dirección (slug).");
  }
  // Los mensajes de save_memory() ya vienen en español (errcode P0001 o 42501).
  if (error.code === "P0001" || error.code === "42501") throw new MemoryWriteError(error.message);
  throw new MemoryWriteError(`No se pudo guardar: ${error.message}`);
}

async function currentUserId(supabase: Supabase) {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Recuerdos del libro: todo lo que el usuario puede ver, menos los borradores. */
export async function getMemories(): Promise<MemorySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .neq("visibility", "draft")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Error leyendo recuerdos: ${error.message}`);
  return (data as MemoryRow[]).map(toSummary);
}

/** Recuerdos escritos por el usuario actual, incluidos borradores (para el panel). */
export async function getMyMemories(): Promise<MemorySummary[]> {
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
  return (data as MemoryRow[]).map(toSummary);
}

/** Un recuerdo completo por su slug, si el usuario (o el visitante sin sesión) puede verlo. */
export async function getMemoryBySlug(slug: string): Promise<Memory | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").select(FULL_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Error leyendo el recuerdo: ${error.message}`);
  return data ? toMemory(supabase, data as unknown as FullMemoryRow) : undefined;
}

/** Un recuerdo del usuario actual con sus usuarios elegidos (para editarlo). */
export async function getMyMemoryById(
  id: string,
): Promise<{ memory: Memory; viewerIds: string[] } | undefined> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return undefined;

  const { data, error } = await supabase
    .from("memories")
    .select(FULL_COLUMNS)
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

  return {
    memory: await toMemory(supabase, data as unknown as FullMemoryRow),
    viewerIds: viewers.map((v) => v.user_id as string),
  };
}

/** Crea (id = null) o actualiza un recuerdo completo. Devuelve su id. */
export async function saveMemory(id: string | null, input: MemoryInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_memory", {
    p_memory_id: id,
    p_memory: {
      slug: input.slug,
      title: input.title,
      date: input.date,
      excerpt: input.excerpt,
      tags: input.tags,
      visibility: input.visibility,
      kind: input.kind,
    },
    p_pages: input.pages,
    p_viewer_ids: input.viewerIds,
  });
  if (error) writeError(error);
  return data as string;
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memories").delete().eq("id", id).select("id");
  if (error) throw new MemoryWriteError(`No se pudo borrar: ${error.message}`);
  if (data.length === 0) throw new MemoryWriteError("Solo quien escribió este recuerdo puede borrarlo.");
}
