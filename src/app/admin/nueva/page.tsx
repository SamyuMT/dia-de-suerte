import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyMedia } from "@/lib/media";
import { getFriends } from "@/lib/profiles";
import { KIND_INFO, MEMORY_KINDS, type MemoryKind } from "@/types/memory";
import MemoryEditor from "../editor/MemoryEditor";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Nuevo recuerdo",
  robots: { index: false },
};

export default async function NewMemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireUser();
  const { tipo } = await searchParams;
  const kind = MEMORY_KINDS.find((k) => k === tipo);

  if (!kind) {
    return (
      <div className={`container ${styles.wrap}`}>
        <Link href="/admin" className={styles.back}>
          ← Volver al panel
        </Link>
        <section className={styles.card}>
          <h1 className={styles.title}>¿Qué quieres guardar?</h1>
          <p className={styles.note}>
            Elige cómo empieza el recuerdo. Después puedes mezclar fotos, texto, música y GIFs en sus páginas.
          </p>
          <div className={styles.kinds}>
            {MEMORY_KINDS.map((k: MemoryKind) => (
              <Link key={k} href={`/admin/nueva?tipo=${k}`} className={styles.kind}>
                <span className={styles.kindIcon} aria-hidden="true">
                  {KIND_INFO[k].icon}
                </span>
                <span className={styles.kindLabel}>{KIND_INFO[k].label}</span>
                <span className={styles.note}>{KIND_INFO[k].description}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const [profiles, library] = await Promise.all([getFriends(), getMyMedia()]);

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/admin/nueva" className={styles.back}>
        ← Elegir otro tipo
      </Link>
      <h1 className={`${styles.title} ${styles.pageHeading}`}>
        {KIND_INFO[kind].icon} Nuevo {KIND_INFO[kind].label.toLowerCase()}
      </h1>
      <MemoryEditor userId={user.id} kind={kind} profiles={profiles} library={library} />
    </div>
  );
}
