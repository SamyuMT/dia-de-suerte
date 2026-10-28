import type { Metadata } from "next";
import Clover from "@/components/Clover";
import { safeNextPath } from "@/lib/auth";
import LoginForm from "./LoginForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className={`container ${styles.wrap}`}>
      <section className={styles.card}>
        <span className={styles.tape} aria-hidden="true" />
        <div className={styles.medallion}>
          <Clover size={42} />
        </div>
        <h1 className={styles.title}>Abrir el libro</h1>
        <p className={styles.subtitle}>Solo para quienes escriben sus páginas.</p>
        <LoginForm next={safeNextPath(next)} />
      </section>
    </div>
  );
}
