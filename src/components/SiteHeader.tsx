import Link from "next/link";
import Clover from "./Clover";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.cloth} />
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Clover size={30} />
          <span>Día de Suerte</span>
        </Link>
        <nav className={styles.nav} aria-label="Principal">
          <Link href="/">Inicio</Link>
          <Link href="/#paginas">Recuerdos</Link>
        </nav>
      </div>
    </header>
  );
}
