"use client";

import { useActionState, useEffect } from "react";
import { useDialog } from "@/components/dialog/useDialog";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { changePassword, saveNickname, type AccountState } from "./actions";
import styles from "./page.module.css";

const initialState: AccountState = { error: null, done: null, attempt: 0 };

/** Muestra el resultado de cada envío del formulario en un modal. */
function useResultModal(state: AccountState, doneTitle: string) {
  const { notify, dialog } = useDialog();
  useEffect(() => {
    if (state.attempt === 0) return;
    if (state.error) notify({ title: "No se pudo", tone: "error", message: state.error });
    else if (state.done) notify({ title: doneTitle, tone: "success", message: state.done });
  }, [state, doneTitle, notify]);
  return dialog;
}

export function NicknameForm({ nickname }: { nickname: string }) {
  const [state, action, pending] = useActionState(saveNickname, initialState);
  const dialog = useResultModal(state, "Apodo guardado");
  return (
    <form action={action} className={styles.form}>
      {dialog}
      <label className={styles.field}>
        <span className={styles.label}>Tu apodo</span>
        <input
          className={styles.input}
          name="nickname"
          defaultValue={nickname}
          minLength={3}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <span className={styles.hint}>
          Es lo único que ven los demás (tu correo es privado). Sin espacios; puedes usar punto y guiones.
        </span>
      </label>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Guardando..." : "Guardar apodo"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);
  const dialog = useResultModal(state, "Contraseña cambiada");
  return (
    // key: vacía los campos de contraseña después de cada intento
    <form key={state.attempt} action={action} className={styles.form}>
      {dialog}
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
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Cambiando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
