import Link from "next/link";
import { logout } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import Clover from "./Clover";
import styles from "./SiteHeader.module.css";

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className={styles.header}>
      <div className={styles.cloth} />
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Clover size={30} />
          <span>Día de Suerte</span>
        </Link>
        {user && (
          <nav className={styles.nav} aria-label="Principal">
            <Link href="/">Inicio</Link>
            <Link href="/#paginas">Recuerdos</Link>
            <Link href="/admin" className={styles.create}>
              Crear
            </Link>
            <form action={logout}>
              <button type="submit" className={styles.logout}>
                Salir
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
