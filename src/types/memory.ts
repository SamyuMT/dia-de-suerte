/**
 * Quién puede ver un recuerdo:
 * - draft: solo quien lo escribió (borrador)
 * - friends: todos los amigos de quien lo escribió
 * - selected: quien lo escribió y los amigos elegidos
 * - public: cualquiera con el enlace, incluso sin sesión
 */
export const MEMORY_VISIBILITIES = ["draft", "friends", "selected", "public"] as const;
export type MemoryVisibility = (typeof MEMORY_VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<MemoryVisibility, string> = {
  draft: "Borrador",
  friends: "Amigos",
  selected: "Elegidos",
  public: "Público",
};

/** Tipo principal de un recuerdo: decide su plantilla inicial y su icono. */
export const MEMORY_KINDS = ["pensamiento", "album", "disco", "gif"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const KIND_INFO: Record<MemoryKind, { label: string; icon: string; description: string }> = {
  pensamiento: { label: "Pensamiento", icon: "✍️", description: "Una carta, un mensaje, algo que sentiste." },
  album: { label: "Álbum de fotos", icon: "📷", description: "Fotos pegadas en el libro, con sus notas." },
  disco: { label: "Disco", icon: "💿", description: "Una canción para escuchar, con lo que te recuerda." },
  gif: { label: "GIF", icon: "🎞️", description: "Un momento animado que se repite." },
};

/** Tipos de bloque que puede tener una página del libro. */
export const BLOCK_TYPES = ["text", "photos", "music", "gif", "decoration"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_INFO: Record<BlockType, { label: string; icon: string }> = {
  text: { label: "Texto", icon: "✍️" },
  photos: { label: "Fotos", icon: "📷" },
  music: { label: "Canción", icon: "💿" },
  gif: { label: "GIF", icon: "🎞️" },
  decoration: { label: "Clavel", icon: "🌸" },
};

/** Máximo de fotos en una misma página del libro (lo valida también save_memory). */
export const MAX_PHOTOS_PER_PAGE = 4;

/** Cuántos archivos admite cada tipo de bloque (lo valida también save_memory en la base). */
export const BLOCK_MEDIA_LIMITS: Record<BlockType, { min: number; max: number }> = {
  text: { min: 0, max: 0 },
  photos: { min: 1, max: MAX_PHOTOS_PER_PAGE },
  music: { min: 1, max: 1 },
  gif: { min: 1, max: 1 },
  decoration: { min: 0, max: 0 },
};

export type MediaKind = "image" | "gif" | "audio";

/** Un archivo del usuario, con una URL firmada lista para mostrar. */
export interface MediaItem {
  id: string;
  kind: MediaKind;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  originalName?: string;
}

export interface BlockMedia {
  media: MediaItem;
  caption?: string;
}

export interface MemoryBlock {
  type: BlockType;
  /** Saludo o título del bloque */
  heading?: string;
  /** Texto; los párrafos se separan con una línea en blanco */
  body?: string;
  /** Firma o pie del bloque */
  caption?: string;
  trackTitle?: string;
  trackArtist?: string;
  decoration?: "clavel";
  media: BlockMedia[];
}

export interface MemoryPage {
  blocks: MemoryBlock[];
}

/** Datos de un recuerdo sin sus páginas (para listas y tarjetas). */
export interface MemorySummary {
  id: string;
  /** Identificador usado en la URL: /recuerdos/[slug] */
  slug: string;
  title: string;
  /** Fecha en formato ISO (YYYY-MM-DD) */
  date: string;
  excerpt: string;
  tags: string[];
  visibility: MemoryVisibility;
  kind: MemoryKind;
  /** Id del usuario que lo escribió (el único que puede editarlo) */
  createdBy: string | null;
}

export interface Memory extends MemorySummary {
  pages: MemoryPage[];
}

/** Lo que el editor envía para crear o editar un recuerdo. */
export interface MemoryInput {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  visibility: MemoryVisibility;
  kind: MemoryKind;
  /** Amigos que pueden verlo cuando visibility = "selected" */
  viewerIds: string[];
  pages: {
    blocks: (Omit<MemoryBlock, "media"> & { media: { id: string; caption?: string }[] })[];
  }[];
}

/** Usuario del libro (tabla profiles). Los demás solo ven su apodo, nunca su correo. */
export interface Profile {
  id: string;
  displayName: string;
}

/** Relación del usuario actual con otro usuario. */
export type FriendStatus = "none" | "friends" | "sent" | "received";

export interface DirectoryEntry extends Profile {
  status: FriendStatus;
  /** Id de la solicitud (para aceptar o rechazar las recibidas) */
  requestId?: string;
}
