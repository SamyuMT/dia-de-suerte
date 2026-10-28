import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Carnation from "@/components/Carnation";
import { formatDate } from "@/lib/format";
import { getMemories, getMemoryBySlug } from "@/lib/memories";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const memories = await getMemories();
  return memories.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const memory = await getMemoryBySlug(slug);
  return memory ? { title: memory.title, description: memory.excerpt } : {};
}

export default async function MemoryPage({ params }: Props) {
  const { slug } = await params;
  const memory = await getMemoryBySlug(slug);
  if (!memory) notFound();

  return (
    <div className="container">
      <Link href="/#paginas" className={styles.back}>
        ← Volver al libro
      </Link>

      <article className={styles.book}>
        <div className={`${styles.page} ${styles.left}`}>
          <time className={styles.date} dateTime={memory.date}>
            {formatDate(memory.date)}
          </time>
          <h1 className={styles.title}>{memory.title}</h1>
          {memory.greeting && <p className={styles.greeting}>{memory.greeting}</p>}
          {memory.content.map((paragraph, i) => (
            <p key={i} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
          {memory.signature && <p className={styles.signature}>{memory.signature}</p>}
        </div>

        <div className={`${styles.page} ${styles.right}`}>
          {memory.decoration === "clavel" ? (
            <div className={styles.flowerFrame}>
              <Carnation caption={memory.decorationCaption} />
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
