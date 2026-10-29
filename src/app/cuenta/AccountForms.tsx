"use client";

import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { changePassword, saveName, type AccountState } from "./actions";
import styles from "./page.module.css";

const initialState: AccountState = { error: null, done: null, attempt: 0 };

function Message({ state }: { state: AccountState }) {
  if (state.error) {
    return (
      <p className={styles.error} role="alert">
        {state.error}
      </p>
    );
  }
  if (state.done) return <p className={styles.done}>{state.done}</p>;
  return null;
}

export function NameForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(saveName, initialState);
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Tu nombre en el libro</span>
        <input className={styles.input} name="displayName" defaultValue={displayName} maxLength={60} required />
        <span className={styles.hint}>Es como te ven los demás al compartir recuerdos.</span>
      </label>
      <Message state={state} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Guardando..." : "Guardar nombre"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);
  return (
    // key: vacía los campos de contraseña después de cada intento
    <form key={state.attempt} action={action} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Contraseña actual</span>
        <input className={styles.input} type="password" name="current" autoComplete="current-password" required />
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
        <span className={styles.label}>Repite la contraseña nueva</span>
        <input
          className={styles.input}
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>
      <Message state={state} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Cambiando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
