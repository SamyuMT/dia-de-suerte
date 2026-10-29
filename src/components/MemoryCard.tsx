import Link from "next/link";
import { formatDate } from "@/lib/format";
import { KIND_INFO, type MemorySummary } from "@/types/memory";
import styles from "./MemoryCard.module.css";

export default function MemoryCard({ memory }: { memory: MemorySummary }) {
  const kind = KIND_INFO[memory.kind];

  return (
    <Link href={`/recuerdos/${memory.slug}`} className={styles.card}>
      <span className={styles.tape} />
      <span className={styles.kind} title={kind.label} aria-label={kind.label}>
        {kind.icon}
      </span>
      <time className={styles.date} dateTime={memory.date}>
        {formatDate(memory.date)}
      </time>
      <h3 className={styles.title}>{memory.title}</h3>
      <p className={styles.excerpt}>{memory.excerpt}</p>
      <span className={styles.open}>Abrir página →</span>
    </Link>
  );
}
