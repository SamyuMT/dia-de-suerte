import type { Memory } from "@/types/memory";

/**
 * Datos locales temporales. Cuando exista una base de datos,
 * solo hay que cambiar src/lib/memories.ts; las páginas no cambian.
 */
export const memories: Memory[] = [
  {
    slug: "un-buen-dia-para-ti-solecito",
    title: "Un buen día para ti, solecito",
    date: "2026-10-27",
    excerpt:
      "Espero que hoy tengas un día bonito y que recuerdes lo fuerte que eres. Te mando una flor virtual. 🌷",
    greeting: "Buenos días 🌷",
    content: [
      "Espero que hoy tengas un día bonito y que, incluso si las cosas se ponen difíciles, recuerdes lo fuerte que eres y todo lo que eres capaz de lograr. Confío en que podrás con lo que venga, paso a paso y a tu manera.",
      "Te mando una flor virtual, para recordarte que hay alguien que te piensa con cariño, incluso desde la distancia. 🌷",
      "Espero que hoy encuentres algún motivo para sonreír, que la vida te trate bonito y que no olvides lo mucho que vales.",
    ],
    signature: "Un abrazo de esos que hacen bien. ❤️",
    decoration: "clavel",
    decorationCaption: "Una flor para ti, solecito",
    tags: ["buenos días", "cariño"],
  },
];
