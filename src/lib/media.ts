import { createClient } from "@/lib/supabase/server";
import type { MediaItem, MediaKind } from "@/types/memory";

// Archivos del usuario (tabla media + bucket privado "media" de Storage).
// Los archivos se suben desde el navegador directo a Storage y después se registran aquí.

export const MEDIA_BUCKET = "media";
/** Las URLs firmadas duran 1 hora; las páginas se generan en cada visita. */
const SIGNED_URL_SECONDS = 60 * 60;

export interface MediaRow {
  id: string;
  kind: MediaKind;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  original_name: string | null;
}

export const MEDIA_COLUMNS =
  "id, kind, storage_path, mime_type, width, height, duration_seconds, original_name";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Convierte filas de media en MediaItem con URL firmada (una sola petición a Storage). */
export async function signMedia(supabase: Supabase, rows: MediaRow[]): Promise<Map<string, MediaItem>> {
  const result = new Map<string, MediaItem>();
  if (rows.length === 0) return result;

  const paths = [...new Set(rows.map((r) => r.storage_path))];
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw new Error(`Error preparando archivos: ${error.message}`);

  const urlByPath = new Map(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  for (const row of rows) {
    const url = urlByPath.get(row.storage_path);
    if (!url) continue;
    result.set(row.id, {
      id: row.id,
      kind: row.kind,
      url,
      mimeType: row.mime_type,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      originalName: row.original_name ?? undefined,
    });
  }
  return result;
}

/** Biblioteca del usuario: sus archivos más recientes, con URL firmada. */
export async function getMyMedia(): Promise<MediaItem[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("media")
    .select(MEDIA_COLUMNS)
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Error leyendo tus archivos: ${error.message}`);

  const rows = data as MediaRow[];
  const signed = await signMedia(supabase, rows);
  return rows.map((r) => signed.get(r.id)).filter((m): m is MediaItem => Boolean(m));
}

export interface NewMedia {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  originalName?: string;
}

export function mediaKindFor(mimeType: string): MediaKind | null {
  if (mimeType === "image/gif") return "gif";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

/** Borra un archivo del usuario (fila y objeto en Storage). Falla si está en un recuerdo guardado. */
export async function deleteMedia(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("media").delete().eq("id", id).select("storage_path");
  if (error?.code === "23503") {
    throw new Error("Esta foto está en un recuerdo guardado. Quítala del recuerdo y guarda primero.");
  }
  if (error) throw new Error(`No se pudo borrar: ${error.message}`);
  if (data.length === 0) throw new Error("Ese archivo no existe o no es tuyo.");

  const { error: storageError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove(data.map((d) => d.storage_path as string));
  if (storageError) throw new Error(`Se quitó de tu biblioteca, pero no del almacenamiento: ${storageError.message}`);
}

/** Registra en la tabla media un archivo que ya se subió a la carpeta del usuario. */
export async function registerMedia(input: NewMedia): Promise<MediaItem> {
  const supabase = await createClient();
  const kind = mediaKindFor(input.mimeType);
  if (!kind) throw new Error("Ese tipo de archivo no se puede guardar.");

  const { data, error } = await supabase
    .from("media")
    .insert({
      kind,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
      original_name: input.originalName?.slice(0, 255) ?? null,
    })
    .select(MEDIA_COLUMNS)
    .single();
  if (error) throw new Error(`No se pudo registrar el archivo: ${error.message}`);

  const row = data as MediaRow;
  const signed = await signMedia(supabase, [row]);
  const item = signed.get(row.id);
  if (!item) throw new Error("El archivo se guardó pero no se pudo abrir.");
  return item;
}
