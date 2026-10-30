"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/dialog/Modal";
import modalStyles from "@/components/dialog/Modal.module.css";
import { useDialog } from "@/components/dialog/useDialog";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { approveAction, rejectAction } from "./actions";
import styles from "./page.module.css";

/** Contraseña inicial fácil de dictar: sin letras que se confundan (0/O, 1/l/I). */
function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string, n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join("");
  return `${pick(letters, 5)}-${pick(digits, 3)}-${pick(letters, 4)}`;
}

export default function RequestActions({ id, nickname, email }: { id: string; nickname: string; email: string }) {
  const router = useRouter();
  const { confirm, notify, dialog } = useDialog();
  const [admitting, setAdmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdmit = () => {
    setPassword(generatePassword());
    setError(null);
    setAdmitting(true);
  };

  const admit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    setPending(true);
    const result = await approveAction(id, password).finally(() => setPending(false));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAdmitting(false);
    if (result.emailSent) {
      await notify({
        title: `¡${result.nickname} ya es miembro!`,
        tone: "success",
        icon: "🎉",
        message: (
          <p>
            Le enviamos el correo de bienvenida a <strong>{result.email}</strong> con su contraseña.
          </p>
        ),
      });
    } else {
      await notify({
        title: "Cuenta creada, pero el correo no salió",
        tone: "error",
        message: (
          <>
            <p>
              La cuenta de <strong>{result.nickname}</strong> ya existe, pero no se pudo enviar el correo (
              {result.emailError}).
            </p>
            <p>
              Envíale tú estos datos: <strong>{result.email}</strong> · contraseña <strong>{password}</strong>
            </p>
          </>
        ),
      });
    }
    router.refresh();
  };

  const reject = async () => {
    const ok = await confirm({
      title: `¿Rechazar a ${nickname}?`,
      tone: "danger",
      message: (
        <p>
          No se creará ninguna cuenta para <strong>{email}</strong>. La persona no recibe ningún aviso.
        </p>
      ),
      confirmLabel: "Rechazar",
    });
    if (!ok) return;
    const result = await rejectAction(id);
    if (result.error) await notify({ title: "No se pudo", tone: "error", message: result.error });
    else await notify({ title: "Solicitud rechazada", tone: "success", message: result.done });
    router.refresh();
  };

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.primary} onClick={openAdmit}>
        Admitir
      </button>
      <button type="button" className={styles.quiet} onClick={reject}>
        Rechazar
      </button>

      {admitting && (
        <Modal
          title={`Admitir a ${nickname}`}
          icon="🗝️"
          onClose={() => !pending && setAdmitting(false)}
          actions={
            <>
              <button
                type="button"
                className={modalStyles.secondary}
                onClick={() => setAdmitting(false)}
                disabled={pending}
              >
                Cancelar
              </button>
              <button type="button" className={modalStyles.primary} onClick={admit} disabled={pending}>
                {pending ? "Creando cuenta…" : "Crear cuenta y enviar correo"}
              </button>
            </>
          }
        >
          <p>
            Se creará la cuenta de <strong>{email}</strong> y le llegará un correo de bienvenida con esta contraseña.
          </p>
          <label className={styles.passwordField}>
            <span>Contraseña inicial</span>
            <span className={styles.passwordRow}>
              <input
                type={visible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                spellCheck={false}
                autoFocus
              />
              <button type="button" onClick={() => setVisible(!visible)} aria-label="Mostrar u ocultar">
                {visible ? "🙈" : "👁"}
              </button>
              <button type="button" onClick={() => setPassword(generatePassword())} aria-label="Generar otra">
                🎲
              </button>
            </span>
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <p className={styles.hint}>Al entrar por primera vez se le pedirá que la cambie.</p>
        </Modal>
      )}
      {dialog}
    </div>
  );
}
