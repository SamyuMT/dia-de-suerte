import type { Metadata } from "next";
import Clover from "@/components/Clover";
import RecoverForm from "./RecoverForm";
import styles from "../login/page.module.css";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

export default function RecoverPage() {
  return (
    <div className={`container ${styles.wrap}`}>
      <section className={styles.card}>
        <span className={styles.tape} aria-hidden="true" />
        <div className={styles.medallion}>
          <Clover size={42} />
        </div>
        <h1 className={styles.title}>¿Olvidaste la llave?</h1>
        <p className={styles.subtitle}>Te enviamos un código al correo para elegir una contraseña nueva.</p>
        <RecoverForm />
      </section>
    </div>
  );
}
