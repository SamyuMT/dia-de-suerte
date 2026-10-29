import type { MemoryBlock } from "@/types/memory";
import styles from "./Blocks.module.css";

export function paragraphs(text?: string) {
  return (text ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Pensamiento: saludo, párrafos y firma. */
export default function TextBlock({ block }: { block: MemoryBlock }) {
  return (
    <div className={styles.text}>
      {block.heading && <p className={styles.heading}>{block.heading}</p>}
      {paragraphs(block.body).map((p, i) => (
        <p key={i} className={styles.paragraph}>
          {p}
        </p>
      ))}
      {block.caption && <p className={styles.signature}>{block.caption}</p>}
    </div>
  );
}
