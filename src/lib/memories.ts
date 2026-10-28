import { memories } from "@/data/memories";
import type { Memory } from "@/types/memory";

// Capa de acceso a datos. Las funciones son async para poder
// reemplazarlas por consultas a una base de datos o API sin tocar las páginas.

export async function getMemories(): Promise<Memory[]> {
  return [...memories].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getMemoryBySlug(slug: string): Promise<Memory | undefined> {
  return memories.find((m) => m.slug === slug);
}
