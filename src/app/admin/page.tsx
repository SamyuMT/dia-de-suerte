import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getMyMemories } from "@/lib/memories";
import { VISIBILITY_LABELS } from "@/types/memory";
import DeleteButton from "./DeleteButton";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false },
};

export default async function AdminPage() {
  const user = await requireUser();
  const memories = await getMyMemories();

  return (
    <div className={`container ${styles.wrap}`}>
      <section className={styles.card}>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>Panel del libro</h1>
            <p className={styles.note}>
              Tus páginas, escribiendo como <strong>{user.email}</strong>
            </p>
          </div>
          <Link href="/admin/nueva" className={styles.primary}>
            + Nueva página
          </Link>
        </div>

        {memories.length === 0 ? (
          <p className={styles.empty}>Todavía no has escrito ninguna página. ¡Escribe la primera!</p>
        ) : (
          <ul className={styles.list}>
            {memories.map((memory) => (
              <li key={memory.id} className={styles.item}>
                <div className={styles.info}>
                  <span className={styles.itemTitle}>{memory.title}</span>
                  <span className={styles.meta}>
                    {formatDate(memory.date)}
                    <span className={`${styles.badge} ${styles[memory.visibility]}`}>
                      {VISIBILITY_LABELS[memory.visibility]}
                    </span>
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <Link href={`/recuerdos/${memory.slug}`} className={styles.link}>
                    Ver
                  </Link>
                  <Link href={`/admin/${memory.id}`} className={styles.link}>
                    Editar
                  </Link>
                  <DeleteButton id={memory.id} title={memory.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
