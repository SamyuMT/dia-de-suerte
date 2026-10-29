"use client";

import { useState, useTransition } from "react";
import type { FriendActionResult } from "./actions";
import styles from "./page.module.css";

interface FriendButtonProps {
  action: () => Promise<FriendActionResult>;
  label: string;
  pendingLabel: string;
  /** Pregunta antes de hacerlo (para acciones que no se deshacen) */
  confirmText?: string;
  variant?: "primary" | "quiet" | "danger";
}

/** Botón que ejecuta una acción de amistad y muestra su resultado al lado. */
export default function FriendButton({ action, label, pendingLabel, confirmText, variant = "quiet" }: FriendButtonProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<FriendActionResult | null>(null);

  return (
    <span className={styles.actionWrap}>
      <button
        type="button"
        className={styles[variant]}
        disabled={pending}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          startTransition(async () => setMessage(await action()));
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {message?.error && (
        <span className={styles.error} role="alert">
          {message.error}
        </span>
      )}
      {message?.done && <span className={styles.done}>{message.done}</span>}
    </span>
  );
}
