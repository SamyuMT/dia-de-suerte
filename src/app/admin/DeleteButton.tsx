"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDialog } from "@/components/dialog/useDialog";
import { removeMemory } from "./actions";
import styles from "./page.module.css";

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  const { confirm, notify, dialog } = useDialog();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    const ok = await confirm({
      title: "¿Arrancar esta página?",
      tone: "danger",
      message: (
        <>
          <p>
            Vas a borrar <strong>{title}</strong> del libro, con todas sus páginas.
          </p>
          <p>No se puede deshacer. Las fotos y canciones quedan en tu biblioteca.</p>
        </>
      ),
      confirmLabel: "Borrar recuerdo",
    });
    if (!ok) return;
    setPending(true);
    const result = await removeMemory(id).finally(() => setPending(false));
    if (result.error) {
      await notify({ title: "No se pudo borrar", tone: "error", message: result.error });
      return;
    }
    await notify({ title: "Página arrancada", tone: "success", message: <p><strong>{title}</strong> ya no está en el libro.</p> });
    router.refresh();
  };

  return (
    <>
      <button type="button" className={styles.danger} onClick={remove} disabled={pending}>
        {pending ? "Borrando…" : "Borrar"}
      </button>
      {dialog}
    </>
  );
}
