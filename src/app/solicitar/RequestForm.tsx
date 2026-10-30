"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useDialog } from "@/components/dialog/useDialog";
import { COUNTRIES } from "@/lib/countries";
import { sendMembershipRequest, type RequestState } from "./actions";
import styles from "../login/page.module.css";

const initialState: RequestState = {
  error: null,
  sent: false,
  values: { nickname: "", email: "", country: "CO", number: "" },
  attempt: 0,
};

export default function RequestForm() {
  const [state, formAction, pending] = useActionState(sendMembershipRequest, initialState);
  const { notify, dialog } = useDialog();
  const v = state.values;

  useEffect(() => {
    if (state.attempt === 0) return;
    if (state.error) {
      notify({ title: "Revisa tus datos", tone: "error", message: state.error });
    } else if (state.sent) {
      notify({
        title: "¡Solicitud enviada!",
        tone: "success",
        icon: "💌",
        message: (
          <>
            <p>Gracias. Tu solicitud quedó en espera.</p>
            <p>Cuando te admitan, te llegará un correo con tu contraseña para entrar al libro.</p>
          </>
        ),
      });
    }
  }, [state, notify]);

  return (
    // key: vuelve a montar los campos con lo enviado (o vacíos si salió bien)
    <form key={state.attempt} action={formAction} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Apodo</span>
        <input
          className={styles.input}
          name="nickname"
          defaultValue={v.nickname}
          minLength={3}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <span className={styles.hint}>Así te verán en el libro. Sin espacios.</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Correo</span>
        <input className={styles.input} type="email" name="email" autoComplete="email" defaultValue={v.email} required />
        <span className={styles.hint}>Ahí te llegará tu contraseña cuando te admitan.</span>
      </label>

      <div className={styles.field}>
        <span className={styles.label} id="phone-label">
          Teléfono
        </span>
        <div className={styles.phone}>
          <select
            className={styles.input}
            name="country"
            defaultValue={v.country}
            aria-label="País del número"
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.dial} {c.name}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            type="tel"
            name="number"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="300 123 4567"
            defaultValue={v.number}
            aria-labelledby="phone-label"
            required
          />
        </div>
      </div>

      {/* Campo trampa para bots: oculto para las personas */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.trap} aria-hidden="true" />

      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Enviando..." : "Pedir entrar al libro"}
      </button>
      <Link href="/login" className={styles.link}>
        ¿Ya tienes cuenta? Entrar
      </Link>
      {dialog}
    </form>
  );
}
