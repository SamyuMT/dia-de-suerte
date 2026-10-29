/** Decoraciones especiales que una página de recuerdo puede mostrar. */
export const MEMORY_DECORATIONS = ["clavel"] as const;
export type MemoryDecoration = (typeof MEMORY_DECORATIONS)[number];

/**
 * Quién puede ver una página:
 * - draft: solo quien la escribió (borrador)
 * - members: todos los usuarios con sesión
 * - selected: quien la escribió y los usuarios elegidos
 * - public: cualquiera con el enlace, incluso sin sesión
 */
export const MEMORY_VISIBILITIES = ["draft", "members", "selected", "public"] as const;
export type MemoryVisibility = (typeof MEMORY_VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<MemoryVisibility, string> = {
  draft: "Borrador",
  members: "Miembros",
  selected: "Elegidos",
  public: "Pública",
};

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
  visibility: MemoryVisibility;
  /** Id del usuario que la escribió (el único que puede editarla) */
  createdBy: string | null;
}

/** Datos que se envían al crear o editar una página. */
export type MemoryInput = Omit<Memory, "id" | "createdBy"> & {
  /** Usuarios que pueden verla cuando visibility = "selected" */
  viewerIds: string[];
};

/** Usuario del libro (tabla profiles). */
export interface Profile {
  id: string;
  email: string;
  displayName: string;
}
