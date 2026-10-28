import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import MemoryForm from "../MemoryForm";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Nueva página",
  robots: { index: false },
};

export default async function NewMemoryPage() {
  await requireUser();

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/admin" className={styles.back}>
        ← Volver al panel
      </Link>
      <section className={styles.card}>
        <h1 className={styles.title}>Nueva página</h1>
        <MemoryForm />
      </section>
    </div>
  );
}
