"use client";

import { removeMemory } from "./actions";
import styles from "./page.module.css";

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={removeMemory.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`¿Arrancar la página "${title}" del libro? No se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={styles.danger}>
        Borrar
      </button>
    </form>
  );
}
