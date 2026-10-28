/** Decoraciones especiales que una página de recuerdo puede mostrar. */
export type MemoryDecoration = "clavel";

export interface Memory {
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
  tags?: string[];
}
