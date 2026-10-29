"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

export type ModalTone = "default" | "danger" | "success" | "error";

const TONE_CLASS: Record<ModalTone, string> = {
  default: "",
  danger: styles.toneDanger,
  success: styles.toneSuccess,
  error: styles.toneError,
};

interface ModalProps {
  title: string;
  icon?: string;
  tone?: ModalTone;
  children?: ReactNode;
  /** Botones del pie */
  actions: ReactNode;
  /** Al cerrar con Esc o tocando fuera */
  onClose: () => void;
}

/** Ventana modal con estilo de nota pegada al libro (usa <dialog> nativo: foco y Esc incluidos). */
export default function Modal({ title, icon, tone = "default", children, actions, onClose }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${TONE_CLASS[tone]}`}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clic en el fondo oscuro (fuera de la tarjeta)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.card}>
        <span className={styles.tape} aria-hidden="true" />
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
        {children && <div className={styles.body}>{children}</div>}
        <div className={styles.actions}>{actions}</div>
      </div>
    </dialog>
  );
}
