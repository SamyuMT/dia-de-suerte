/** Decoraciones especiales que una página de recuerdo puede mostrar. */
export const MEMORY_DECORATIONS = ["clavel"] as const;
export type MemoryDecoration = (typeof MEMORY_DECORATIONS)[number];

export interface Memory {
  id: string;
  /** Identificador usado en la URL: /recuerdos/[slug] */
  slug: string;
  title: string;
  /** Fecha en formato ISO (YYYY-MM-DD) */
  date: string;
  excerpt: string;
  /** Cada elemento es un párrafo */
  content: string[];
  greeting?: string;
  signature?: string;
  decoration?: MemoryDecoration;
  /** Texto que acompaña a la decoración */
  decorationCaption?: string;
  tags: string[];
  /** Las páginas sin publicar (borradores) solo se ven en el panel */
  published: boolean;
}

/** Datos que se envían al crear o editar una página. */
export type MemoryInput = Omit<Memory, "id">;
