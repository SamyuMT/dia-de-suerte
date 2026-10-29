import { createClient } from "@/lib/supabase/browser";
import type { MediaItem, MediaKind } from "@/types/memory";
import { registerMediaAction } from "../actions";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Tipos de archivo que acepta cada clase de archivo (igual que el bucket "media"). */
export const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp",
  gif: "image/gif",
  audio: "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm,audio/flac,.mp3,.m4a",
};

function extensionOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : "bin";
}

/** Tipo MIME, corrigiendo casos que el navegador deja vacíos (p. ej. .m4a en Windows). */
function mimeOf(file: File) {
  if (file.type) return file.type;
  const ext = extensionOf(file);
  return ({ mp3: "audio/mpeg", m4a: "audio/x-m4a", flac: "audio/flac" } as Record<string, string>)[ext] ?? "";
}

function readImageSize(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function readAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 100) / 100 : undefined);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

/** Sube un archivo a la carpeta del usuario en Storage y lo registra en la tabla media. */
export async function uploadMedia(file: File, userId: string): Promise<MediaItem> {
  const mimeType = mimeOf(file);
  if (!mimeType) throw new Error(`No se reconoce el tipo de "${file.name}".`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" pesa más de 50 MB.`);

  const isAudio = mimeType.startsWith("audio/");
  const [size, durationSeconds] = await Promise.all([
    isAudio ? Promise.resolve({}) : readImageSize(file),
    isAudio ? readAudioDuration(file) : Promise.resolve(undefined),
  ]);

  const storagePath = `${userId}/${crypto.randomUUID()}.${extensionOf(file)}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("media")
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`No se pudo subir "${file.name}": ${error.message}`);

  const result = await registerMediaAction({
    storagePath,
    mimeType,
    sizeBytes: file.size,
    ...size,
    durationSeconds,
    originalName: file.name,
  });
  if (result.error !== undefined) throw new Error(result.error);
  return result.media;
}
