import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Carnation from "@/components/Carnation";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getMemoryBySlug } from "@/lib/memories";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const memory = await getMemoryBySlug(slug);
  if (!memory) return {};
  return {
    title: memory.title,
    description: memory.excerpt,
    robots: memory.visibility === "public" ? undefined : { index: false },
  };
}

export default async function MemoryPage({ params }: Props) {
  const { slug } = await params;
  // El RLS solo devuelve la página si quien la pide puede verla.
  const [memory, user] = await Promise.all([getMemoryBySlug(slug), getCurrentUser()]);
  if (!memory) {
    if (!user) redirect(`/login?next=${encodeURIComponent(`/recuerdos/${slug}`)}`);
    notFound();
  }

  return (
    <div className="container">
      {user ? (
        <Link href="/#paginas" className={styles.back}>
          ← Volver al libro
        </Link>
      ) : (
        <span className={styles.back}>Una página de Día de Suerte</span>
      )}

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
