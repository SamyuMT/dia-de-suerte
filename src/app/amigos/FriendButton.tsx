"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDialog, type DialogOptions } from "@/components/dialog/useDialog";
import type { FriendActionResult } from "./actions";
import styles from "./page.module.css";

interface FriendButtonProps {
  action: () => Promise<FriendActionResult>;
  label: string;
  pendingLabel: string;
  /** Si se da, primero pregunta en un modal */
  confirm?: DialogOptions;
  /** Título del modal cuando sale bien */
  doneTitle: string;
  variant?: "primary" | "quiet" | "danger";
}

/** Botón de una acción de amistad: confirma (si hace falta) y muestra el resultado en un modal. */
export default function FriendButton({
  action,
  label,
  pendingLabel,
  confirm: confirmOptions,
  doneTitle,
  variant = "quiet",
}: FriendButtonProps) {
  const [pending, setPending] = useState(false);
  const { confirm, notify, dialog } = useDialog();
  const router = useRouter();

  const run = async () => {
    if (confirmOptions && !(await confirm(confirmOptions))) return;
    setPending(true);
    const result = await action().finally(() => setPending(false));
    if (result.error) {
      await notify({ title: "No se pudo", message: result.error, tone: "error" });
      return;
    }
    await notify({ title: doneTitle, message: result.done, tone: "success" });
    router.refresh();
  };

  return (
    <>
      <button type="button" className={styles[variant]} disabled={pending} onClick={run}>
        {pending ? pendingLabel : label}
      </button>
      {dialog}
    </>
  );
}
