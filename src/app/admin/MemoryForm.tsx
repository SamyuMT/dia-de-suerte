"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Memory } from "@/types/memory";
import { saveMemory, type MemoryFormState } from "./actions";
import styles from "./MemoryForm.module.css";

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Valores iniciales del formulario a partir de una página existente. */
function valuesFrom(memory?: Memory): Record<string, string> {
  return {
    title: memory?.title ?? "",
    slug: memory?.slug ?? "",
    date: memory?.date ?? today(),
    greeting: memory?.greeting ?? "",
    content: memory?.content.join("\n\n") ?? "",
    signature: memory?.signature ?? "",
    excerpt: memory?.excerpt ?? "",
    decoration: memory?.decoration ?? "",
    decorationCaption: memory?.decorationCaption ?? "",
    tags: memory?.tags.join(", ") ?? "",
    published: memory === undefined || memory.published ? "on" : "",
  };
}

export default function MemoryForm({ memory }: { memory?: Memory }) {
  const initialState: MemoryFormState = { error: null, values: valuesFrom(memory), attempt: 0 };
  const [state, formAction, pending] = useActionState(
    saveMemory.bind(null, memory?.id ?? null),
    initialState,
  );
  const v = state.values;

  return (
    <form key={state.attempt} action={formAction} className={styles.form}>
      <div className={styles.row}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Título *</span>
          <input className={styles.input} name="title" defaultValue={v.title} required />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fecha *</span>
          <input className={styles.input} type="date" name="date" defaultValue={v.date} required />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Dirección (slug)</span>
        <input
          className={styles.input}
          name="slug"
          defaultValue={v.slug}
          placeholder="se genera del título si lo dejas vacío"
        />
        <span className={styles.hint}>Aparece en la URL: /recuerdos/tu-slug</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Saludo</span>
        <input className={styles.input} name="greeting" defaultValue={v.greeting} placeholder="Buenos días 🌷" />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Texto *</span>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          name="content"
          defaultValue={v.content}
          rows={10}
          required
        />
        <span className={styles.hint}>Deja una línea en blanco para separar párrafos.</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Firma</span>
        <input className={styles.input} name="signature" defaultValue={v.signature} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Resumen</span>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          name="excerpt"
          defaultValue={v.excerpt}
          rows={2}
          placeholder="se toma del primer párrafo si lo dejas vacío"
        />
        <span className={styles.hint}>Es lo que se ve en la tarjeta del libro.</span>
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Decoración</span>
          <select className={styles.input} name="decoration" defaultValue={v.decoration}>
            <option value="">Ninguna</option>
            <option value="clavel">Clavel que florece</option>
          </select>
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Texto de la decoración</span>
          <input className={styles.input} name="decorationCaption" defaultValue={v.decorationCaption} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Etiquetas</span>
        <input className={styles.input} name="tags" defaultValue={v.tags} placeholder="cariño, viaje, buenos días" />
        <span className={styles.hint}>Separadas por comas.</span>
      </label>

      <label className={styles.check}>
        <input type="checkbox" name="published" defaultChecked={v.published === "on"} />
        <span>Publicada (si no, queda como borrador y solo se ve en el panel)</span>
      </label>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.actions}>
        <Link href="/admin" className={styles.cancel}>
          Cancelar
        </Link>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Guardando..." : memory ? "Guardar cambios" : "Pegar en el libro"}
        </button>
      </div>
    </form>
  );
}
