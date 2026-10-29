"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { requestCode, resetWithCode, type RecoverState } from "./actions";
import styles from "../login/page.module.css";

const initialState: RecoverState = { step: "email", email: "", error: null, notice: null };

export default function RecoverForm() {
  const [sent, sendCode, sending] = useActionState(requestCode, initialState);
  const [checked, reset, resetting] = useActionState(resetWithCode, initialState);
  // El error del paso 2 solo cuenta si es del correo al que se mandó el último código.
  const codeError = checked.email === sent.email ? checked.error : null;

  if (sent.step === "email") {
    return (
      <form action={sendCode} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Tu correo</span>
          <input
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={sent.email}
            required
          />
        </label>
        {sent.error && (
          <p className={styles.error} role="alert">
            {sent.error}
          </p>
        )}
        <button type="submit" className={styles.button} disabled={sending}>
          {sending ? "Enviando..." : "Enviarme un código"}
        </button>
        <Link href="/login" className={styles.link}>
          ← Volver a entrar
        </Link>
      </form>
    );
  }

  return (
    <form action={reset} className={styles.form}>
      <input type="hidden" name="email" value={sent.email} />
      {sent.notice && <p className={styles.notice}>{sent.notice}</p>}
      {sent.error && (
        <p className={styles.error} role="alert">
          {sent.error}
        </p>
      )}
      <label className={styles.field}>
        <span className={styles.label}>Código</span>
        <input
          className={`${styles.input} ${styles.code}`}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          required
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Contraseña nueva</span>
        <input
          className={styles.input}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Repite la contraseña</span>
        <input
          className={styles.input}
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>
      {codeError && (
        <p className={styles.error} role="alert">
          {codeError}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={resetting}>
        {resetting ? "Guardando..." : "Cambiar contraseña y entrar"}
      </button>
      <button type="submit" formAction={sendCode} formNoValidate className={styles.linkButton} disabled={sending}>
        {sending ? "Enviando..." : "No me llegó: enviar otro código"}
      </button>
    </form>
  );
}
