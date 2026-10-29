"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDialog } from "@/components/dialog/useDialog";
import { acceptRequestAction, findNicknameAction, sendRequestAction } from "./actions";
import styles from "./page.module.css";

/** Buscar a alguien por su apodo exacto y, si existe, enviarle la solicitud desde un modal. */
export default function FriendSearch() {
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState(false);
  const { confirm, notify, dialog } = useDialog();
  const router = useRouter();

  /** Ejecuta una petición mostrando "…" solo mientras dura (no mientras el modal está abierto). */
  const busy = async <T,>(work: Promise<T>) => {
    setPending(true);
    try {
      return await work;
    } finally {
      setPending(false);
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const { found, error } = await busy(findNicknameAction(nickname));
    if (error) {
      await notify({ title: "Revisa el apodo", message: error, tone: "error" });
      return;
    }
    if (!found) {
      await notify({
        title: "No lo encontramos",
        icon: "🔍",
        message: (
          <p>
            No hay nadie con el apodo <strong>{nickname.trim()}</strong>. Pídele que te diga su apodo exacto (lo ve en
            Mi cuenta).
          </p>
        ),
      });
      return;
    }

    const name = <strong>{found.displayName}</strong>;
    if (found.status === "friends") {
      await notify({ title: "Ya son amigos", icon: "🤝", message: <p>{name} ya está en tus amigos.</p> });
      return;
    }
    if (found.status === "sent") {
      await notify({
        title: "Solicitud pendiente",
        icon: "✉️",
        message: <p>Ya le enviaste una solicitud a {name}. Falta que la acepte.</p>,
      });
      return;
    }

    const received = found.status === "received";
    const ok = await confirm({
      title: received ? `${found.displayName} te quiere agregar` : `¡Encontramos a ${found.displayName}!`,
      icon: received ? "💌" : "🍀",
      message: received ? (
        <p>Esta persona ya te envió una solicitud. ¿Quieres aceptarla?</p>
      ) : (
        <p>¿Quieres enviarle una solicitud de amistad a {name}?</p>
      ),
      confirmLabel: received ? "Aceptar solicitud" : "Enviar solicitud",
    });
    if (!ok) return;

    const result = await busy(
      received && found.requestId ? acceptRequestAction(found.requestId) : sendRequestAction(found.id),
    );
    if (result.error) {
      await notify({ title: "No se pudo", message: result.error, tone: "error" });
      return;
    }
    await notify({
      title: received ? "¡Ahora son amigos!" : "Solicitud enviada",
      tone: "success",
      message: result.done,
    });
    setNickname("");
    router.refresh();
  };

  return (
    <>
      <form className={styles.search} role="search" onSubmit={search}>
        <input
          className={styles.input}
          type="search"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Escribe el apodo exacto"
          aria-label="Apodo exacto"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Buscando…" : "Buscar"}
        </button>
      </form>
      {dialog}
    </>
  );
}
