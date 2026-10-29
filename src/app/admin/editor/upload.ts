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

function readImageSize(file: Blob): Promise<{ width?: number; height?: number }> {
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

/**
 * Lado más largo con el que se guardan las fotos. En el libro una foto se ve a 300 px como mucho,
 * así que 1200 px se ve nítido incluso en pantallas retina y pesa una fracción del original.
 */
const MAX_PHOTO_SIDE = 1200;
const PHOTO_QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY));
}

/**
 * Achica una foto (JPEG, PNG o WebP) a MAX_PHOTO_SIDE y la convierte a WebP (o JPEG si el navegador
 * no sabe generar WebP). Respeta la orientación de la cámara. Los GIF no se tocan para no perder la animación.
 */
async function shrinkPhoto(file: File, mimeType: string): Promise<{ data: Blob; mimeType: string; ext: string }> {
  const original = { data: file as Blob, mimeType, ext: extensionOf(file) };
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) return original;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return original;
  }

  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg");
  // Si ya era pequeña y no se gana nada, se sube tal cual.
  if (!blob || (scale === 1 && blob.size >= file.size)) return original;
  return { data: blob, mimeType: blob.type, ext: blob.type === "image/webp" ? "webp" : "jpg" };
}

/** Sube un archivo a la carpeta del usuario en Storage y lo registra en la tabla media. */
export async function uploadMedia(file: File, userId: string): Promise<MediaItem> {
  const originalType = mimeOf(file);
  if (!originalType) throw new Error(`No se reconoce el tipo de "${file.name}".`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" pesa más de 50 MB.`);

  const isAudio = originalType.startsWith("audio/");
  const upload = isAudio
    ? { data: file as Blob, mimeType: originalType, ext: extensionOf(file) }
    : await shrinkPhoto(file, originalType);

  const [size, durationSeconds] = await Promise.all([
    isAudio ? Promise.resolve({}) : readImageSize(upload.data),
    isAudio ? readAudioDuration(file) : Promise.resolve(undefined),
  ]);

  const storagePath = `${userId}/${crypto.randomUUID()}.${upload.ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("media")
    .upload(storagePath, upload.data, { contentType: upload.mimeType, upsert: false });
  if (error) throw new Error(`No se pudo subir "${file.name}": ${error.message}`);

  const result = await registerMediaAction({
    storagePath,
    mimeType: upload.mimeType,
    sizeBytes: upload.data.size,
    ...size,
    durationSeconds,
    originalName: file.name,
  });
  if (result.error !== undefined) throw new Error(result.error);
  return result.media;
}
