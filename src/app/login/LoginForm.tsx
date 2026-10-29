"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import styles from "./page.module.css";

const initialState: LoginState = { error: null, email: "" };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="next" value={next} />

      <label className={styles.field}>
        <span className={styles.label}>Correo</span>
        <input
          className={styles.input}
          type="email"
          name="email"
          autoComplete="email"
          defaultValue={state.email}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Contraseña</span>
        <input
          className={styles.input}
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Abriendo..." : "Abrir el libro"}
      </button>

      <Link href="/recuperar" className={styles.link}>
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
