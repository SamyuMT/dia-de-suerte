"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deleteMedia, registerMedia, type NewMedia } from "@/lib/media";
import { MemoryWriteError, deleteMemory, saveMemory } from "@/lib/memories";
import {
  BLOCK_MEDIA_LIMITS,
  BLOCK_TYPES,
  MAX_PHOTOS_PER_PAGE,
  MEMORY_KINDS,
  MEMORY_VISIBILITIES,
  type BlockType,
  type MediaItem,
  type MemoryInput,
} from "@/types/memory";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function excerptFrom(input: MemoryInput) {
  const text = input.pages
    .flatMap((p) => p.blocks)
    .map((b) => b.body?.trim())
    .find(Boolean);
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ");
  return flat.length > 160 ? `${flat.slice(0, 157).trimEnd()}...` : flat;
}

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Revisa y normaliza lo que manda el editor; la base vuelve a validar todo en save_memory(). */
function clean(raw: MemoryInput): { input?: MemoryInput; error?: string } {
  const title = text(raw.title, 200);
  if (!title) return { error: "El recuerdo necesita un título." };

  const slug = slugify(raw.slug || title);
  if (!slug) return { error: "La dirección (slug) solo puede tener letras, números y guiones." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date ?? "")) return { error: "Elige una fecha válida." };
  if (!MEMORY_VISIBILITIES.includes(raw.visibility)) return { error: "Elige quién puede ver el recuerdo." };
  if (!MEMORY_KINDS.includes(raw.kind)) return { error: "Elige el tipo de recuerdo." };
  if (!Array.isArray(raw.pages) || raw.pages.length === 0) return { error: "El recuerdo necesita al menos una página." };
  if (raw.pages.length > 100) return { error: "Un recuerdo puede tener hasta 100 páginas." };

  const pages: MemoryInput["pages"] = [];
  for (const [pageIndex, page] of raw.pages.entries()) {
    const blocks: MemoryInput["pages"][number]["blocks"] = [];
    for (const block of page.blocks ?? []) {
      if (!BLOCK_TYPES.includes(block.type as BlockType)) return { error: "Hay un bloque de un tipo desconocido." };
      const where = `en la página ${pageIndex + 1}`;
      const media = (block.media ?? [])
        .filter((m) => typeof m?.id === "string")
        .map((m) => ({ id: m.id, caption: text(m.caption, 300) }));
      const limits = BLOCK_MEDIA_LIMITS[block.type];

      if (block.type === "text" && !text(block.body, 10000)) return { error: `Hay un texto vacío ${where}.` };
      if (block.type === "music" && !text(block.trackTitle, 200)) return { error: `Ponle nombre a la canción ${where}.` };
      if (media.length < limits.min) {
        const what = { photos: "al menos una foto", music: "una canción", gif: "un GIF" }[block.type as string];
        return { error: `Falta subir ${what ?? "un archivo"} ${where}.` };
      }
      if (media.length > limits.max) return { error: `Hay demasiados archivos en un bloque ${where}.` };

      blocks.push({
        type: block.type,
        heading: text(block.heading, 200),
        body: text(block.body, 10000),
        caption: text(block.caption, 300),
        trackTitle: block.type === "music" ? text(block.trackTitle, 200) : undefined,
        trackArtist: block.type === "music" ? text(block.trackArtist, 200) : undefined,
        decoration: block.type === "decoration" ? "clavel" : undefined,
        media,
      });
    }
    if (blocks.length > 50) return { error: `La página ${pageIndex + 1} tiene demasiados bloques.` };
    const photos = blocks.filter((b) => b.type === "photos").reduce((n, b) => n + b.media.length, 0);
    if (photos > MAX_PHOTOS_PER_PAGE) {
      return {
        error: `La página ${pageIndex + 1} tiene más de ${MAX_PHOTOS_PER_PAGE} fotos. Pasa algunas a otra página.`,
      };
    }
    pages.push({ blocks });
  }

  const viewerIds = (raw.viewerIds ?? []).filter((id) => typeof id === "string");
  if (raw.visibility === "selected" && viewerIds.length === 0) {
    return { error: "Elige al menos un amigo que pueda ver el recuerdo." };
  }

  const input: MemoryInput = {
    slug,
    title,
    date: raw.date,
    excerpt: "",
    tags: (raw.tags ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 20),
    visibility: raw.visibility,
    kind: raw.kind,
    viewerIds,
    pages,
  };
  input.excerpt = text(raw.excerpt, 300) ?? excerptFrom(input);
  return { input };
}

/** Crea (id = null) o actualiza un recuerdo. Si sale bien, vuelve al panel. */
export async function saveMemoryAction(id: string | null, raw: MemoryInput): Promise<{ error: string }> {
  await requireUser();

  const { input, error } = clean(raw);
  if (!input) return { error: error ?? "Revisa los datos." };

  try {
    await saveMemory(id, input);
  } catch (e) {
    if (e instanceof MemoryWriteError) return { error: e.message };
    throw e;
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function removeMemory(id: string): Promise<{ error?: string }> {
  await requireUser();
  try {
    // Si no es su recuerdo, el RLS no borra nada y deleteMemory lanza un error.
    await deleteMemory(id);
  } catch (e) {
    if (e instanceof MemoryWriteError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return {};
}

/** Borra un archivo de la biblioteca del usuario (si no está en un recuerdo guardado). */
export async function deleteMediaAction(id: string): Promise<{ error?: string }> {
  await requireUser();
  try {
    await deleteMedia(id);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo borrar el archivo." };
  }
}

/** Registra un archivo que el navegador ya subió a Storage (carpeta <user_id>/). */
export async function registerMediaAction(
  input: NewMedia,
): Promise<{ media: MediaItem; error?: never } | { error: string; media?: never }> {
  const user = await requireUser();
  if (!input.storagePath.startsWith(`${user.id}/`)) return { error: "Ese archivo no está en tu carpeta." };
  try {
    return { media: await registerMedia(input) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo registrar el archivo." };
  }
}
