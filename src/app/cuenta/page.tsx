import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";
import { getMyProfile } from "@/lib/profiles";
import { NicknameForm, PasswordForm } from "./AccountForms";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false },
};

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getMyProfile();

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/" className={styles.back}>
        ← Volver al libro
      </Link>
      <section className={styles.card}>
        <h1 className={styles.title}>Mi cuenta</h1>
        <p className={styles.note}>
          Entraste como <strong>{user.email}</strong>
        </p>

        <div className={styles.sections}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Apodo</h2>
            <NicknameForm nickname={profile?.displayName ?? ""} />
            <Link href="/amigos" className={styles.back}>
              Ver mis amigos →
            </Link>
          </div>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contraseña</h2>
            <PasswordForm />
          </div>
        </div>

        <form action={logout} className={styles.logoutRow}>
          <button type="submit" className={styles.logout}>
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
