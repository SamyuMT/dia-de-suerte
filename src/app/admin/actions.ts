"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { MemoryWriteError, createMemory, deleteMemory, updateMemory } from "@/lib/memories";
import {
  MEMORY_DECORATIONS,
  MEMORY_VISIBILITIES,
  type MemoryDecoration,
  type MemoryInput,
  type MemoryVisibility,
} from "@/types/memory";

export type MemoryFormState = {
  error: string | null;
  /** Valores enviados, para no perderlos si hay un error */
  values: Record<string, string>;
  /** Cambia en cada envío para volver a montar el formulario con los valores */
  attempt: number;
};

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function excerptFrom(paragraph: string) {
  return paragraph.length > 160 ? `${paragraph.slice(0, 157).trimEnd()}...` : paragraph;
}

function optional(value: string) {
  return value === "" ? undefined : value;
}

function parseForm(formData: FormData): { input?: MemoryInput; error?: string } {
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const title = field("title");
  if (!title) return { error: "La página necesita un título." };

  const slug = slugify(field("slug") || title);
  if (!slug) return { error: "La dirección (slug) solo puede tener letras, números y guiones." };

  const date = field("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Elige una fecha válida." };

  const content = field("content")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);
  if (content.length === 0) return { error: "Escribe al menos un párrafo." };

  const decorationValue = field("decoration");
  const decoration = MEMORY_DECORATIONS.includes(decorationValue as MemoryDecoration)
    ? (decorationValue as MemoryDecoration)
    : undefined;

  const visibilityValue = field("visibility");
  const visibility = MEMORY_VISIBILITIES.includes(visibilityValue as MemoryVisibility)
    ? (visibilityValue as MemoryVisibility)
    : "draft";

  const viewerIds = formData.getAll("viewers").map(String).filter(Boolean);
  if (visibility === "selected" && viewerIds.length === 0) {
    return { error: "Elige al menos una persona que pueda ver la página." };
  }

  return {
    input: {
      slug,
      title,
      date,
      excerpt: field("excerpt") || excerptFrom(content[0]),
      content,
      greeting: optional(field("greeting")),
      signature: optional(field("signature")),
      decoration,
      decorationCaption: decoration ? optional(field("decorationCaption")) : undefined,
      tags: field("tags")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      visibility,
      viewerIds,
    },
  };
}

/** Crea (id = null) o actualiza una página. */
export async function saveMemory(
  id: string | null,
  prev: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  await requireUser();

  const values = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string") as [string, string][],
  );
  values.viewers = formData.getAll("viewers").map(String).join(",");
  const fail = (error: string) => ({ error, values, attempt: prev.attempt + 1 });

  const { input, error } = parseForm(formData);
  if (!input) return fail(error ?? "Revisa los datos.");

  try {
    if (id) await updateMemory(id, input);
    else await createMemory(input);
  } catch (e) {
    if (e instanceof MemoryWriteError) return fail(e.message);
    throw e;
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function removeMemory(id: string) {
  await requireUser();
  // Si no es su página, el RLS no borra nada y deleteMemory lanza un error.
  await deleteMemory(id);
  revalidatePath("/", "layout");
  redirect("/admin");
}
