import type { BlockType, MemoryBlock, MemoryKind } from "@/types/memory";

/** Bloque vacío de cada tipo, listo para llenar en el editor. */
export function emptyBlock(type: BlockType): MemoryBlock {
  switch (type) {
    case "text":
      return { type, heading: "", body: "", caption: "", media: [] };
    case "photos":
      return { type, heading: "", body: "", caption: "", media: [] };
    case "music":
      return { type, trackTitle: "", trackArtist: "", body: "", caption: "", media: [] };
    case "gif":
      return { type, heading: "", body: "", caption: "", media: [] };
    case "decoration":
      return { type, decoration: "clavel", caption: "Una flor para ti", media: [] };
  }
}

/** Páginas iniciales según el tipo de recuerdo elegido al crear. */
export function templatePages(kind: MemoryKind): MemoryBlock[][] {
  switch (kind) {
    case "pensamiento":
      return [[emptyBlock("text")]];
    case "album":
      return [[emptyBlock("photos")], [emptyBlock("text")]];
    case "disco":
      return [[emptyBlock("music")]];
    case "gif":
      return [[emptyBlock("gif")]];
  }
}
