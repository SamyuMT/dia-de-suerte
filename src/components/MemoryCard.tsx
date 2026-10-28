import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Memory } from "@/types/memory";
import styles from "./MemoryCard.module.css";

export default function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <Link href={`/recuerdos/${memory.slug}`} className={styles.card}>
      <span className={styles.tape} />
      <time className={styles.date} dateTime={memory.date}>
        {formatDate(memory.date)}
      </time>
      <h3 className={styles.title}>{memory.title}</h3>
      <p className={styles.excerpt}>{memory.excerpt}</p>
      <span className={styles.open}>Abrir página →</span>
    </Link>
  );
}
