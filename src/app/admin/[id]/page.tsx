import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyMemoryById, getOtherProfiles } from "@/lib/memories";
import MemoryForm from "../MemoryForm";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Editar página",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  // Solo encuentra páginas del usuario actual: las de otros dan 404.
  const found = UUID.test(id) ? await getMyMemoryById(id) : undefined;
  if (!found) notFound();
  const profiles = await getOtherProfiles();

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/admin" className={styles.back}>
        ← Volver al panel
      </Link>
      <section className={styles.card}>
        <h1 className={styles.title}>Editar página</h1>
        <MemoryForm memory={found.memory} viewerIds={found.viewerIds} profiles={profiles} />
      </section>
    </div>
  );
}
