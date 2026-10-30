import type { Metadata } from "next";
import Clover from "@/components/Clover";
import RequestForm from "./RequestForm";
import styles from "../login/page.module.css";

export const metadata: Metadata = {
  title: "Pedir entrar al libro",
  robots: { index: false },
};

export default function RequestAccessPage() {
  return (
    <div className={`container ${styles.wrap}`}>
      <section className={styles.card}>
        <span className={styles.tape} aria-hidden="true" />
        <div className={styles.medallion}>
          <Clover size={42} />
        </div>
        <h1 className={styles.title}>Pedir entrar</h1>
        <p className={styles.subtitle}>
          El libro es privado. Deja tus datos y, si te admiten, te enviaremos tu contraseña por correo.
        </p>
        <RequestForm />
      </section>
    </div>
  );
}
