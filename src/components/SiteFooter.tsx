import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p className={styles.line}>Hecho con cariño para guardar los días de suerte.</p>
        <p className={styles.small}>Día de Suerte</p>
      </div>
    </footer>
  );
}
