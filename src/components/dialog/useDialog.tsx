"use client";

import { useCallback, useState, type ReactNode } from "react";
import Modal, { type ModalTone } from "./Modal";
import styles from "./Modal.module.css";

export interface DialogOptions {
  title: string;
  message?: ReactNode;
  icon?: string;
  tone?: ModalTone;
  /** Texto del botón principal */
  confirmLabel?: string;
  /** Texto del botón para cancelar (solo en confirm) */
  cancelLabel?: string;
}

type OpenDialog = DialogOptions & { kind: "confirm" | "notify"; resolve: (ok: boolean) => void };

const DEFAULT_ICONS: Record<ModalTone, string> = {
  default: "🍀",
  danger: "🗑",
  success: "🌷",
  error: "✋",
};

/**
 * Modales del portal en vez de confirm()/alert() del navegador.
 * Uso: const { confirm, notify, dialog } = useDialog(); … {dialog} en el JSX.
 * confirm() devuelve true si la persona aceptó; notify() se resuelve al cerrar.
 */
export function useDialog() {
  const [open, setOpen] = useState<OpenDialog | null>(null);

  const confirm = useCallback(
    (options: DialogOptions) => new Promise<boolean>((resolve) => setOpen({ ...options, kind: "confirm", resolve })),
    [],
  );

  const notify = useCallback(
    (options: DialogOptions) =>
      new Promise<void>((resolve) => setOpen({ ...options, kind: "notify", resolve: () => resolve() })),
    [],
  );

  const close = (ok: boolean) => {
    open?.resolve(ok);
    setOpen(null);
  };

  const tone = open?.tone ?? "default";
  const dialog = open ? (
    <Modal
      title={open.title}
      icon={open.icon ?? DEFAULT_ICONS[tone]}
      tone={tone}
      onClose={() => close(false)}
      actions={
        open.kind === "confirm" ? (
          <>
            <button type="button" className={styles.secondary} onClick={() => close(false)}>
              {open.cancelLabel ?? "Cancelar"}
            </button>
            <button
              type="button"
              className={tone === "danger" ? styles.danger : styles.primary}
              onClick={() => close(true)}
              autoFocus
            >
              {open.confirmLabel ?? "Aceptar"}
            </button>
          </>
        ) : (
          <button type="button" className={styles.primary} onClick={() => close(true)} autoFocus>
            {open.confirmLabel ?? "Entendido"}
          </button>
        )
      }
    >
      {typeof open.message === "string" ? <p>{open.message}</p> : open.message}
    </Modal>
  ) : null;

  return { confirm, notify, dialog };
}
