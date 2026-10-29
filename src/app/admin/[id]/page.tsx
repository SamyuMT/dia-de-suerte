import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyMedia } from "@/lib/media";
import { getMyMemoryById } from "@/lib/memories";
import { getOtherProfiles } from "@/lib/profiles";
import MemoryEditor from "../editor/MemoryEditor";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Editar recuerdo",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Solo encuentra recuerdos del usuario actual: los de otros dan 404.
  const found = UUID.test(id) ? await getMyMemoryById(id) : undefined;
  if (!found) notFound();
  const [profiles, library] = await Promise.all([getOtherProfiles(), getMyMedia()]);

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/admin" className={styles.back}>
        ← Volver al panel
      </Link>
      <h1 className={`${styles.title} ${styles.pageHeading}`}>Editar recuerdo</h1>
      <MemoryEditor
        userId={user.id}
        memory={found.memory}
        viewerIds={found.viewerIds}
        profiles={profiles}
        library={library}
      />
    </div>
  );
}
