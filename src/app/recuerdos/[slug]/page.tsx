import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BookView from "@/components/book/BookView";
import { getCurrentUser } from "@/lib/auth";
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
  // El RLS solo devuelve el recuerdo si quien lo pide puede verlo.
  const [memory, user] = await Promise.all([getMemoryBySlug(slug), getCurrentUser()]);
  if (!memory) {
    if (!user) redirect(`/login?next=${encodeURIComponent(`/recuerdos/${slug}`)}`);
    notFound();
  }

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.bar}>
        {user ? (
          <Link href="/#paginas" className={styles.back}>
            ← Volver al libro
          </Link>
        ) : (
          <span className={styles.back}>Un recuerdo de Día de Suerte</span>
        )}
        {user && memory.createdBy === user.id && (
          <Link href={`/admin/${memory.id}`} className={styles.back}>
            Editar ✎
          </Link>
        )}
      </div>

      <BookView title={memory.title} date={memory.date} pages={memory.pages} />
    </div>
  );
}
