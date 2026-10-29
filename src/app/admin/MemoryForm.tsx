"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Memory, MemoryVisibility, Profile } from "@/types/memory";
import { saveMemory, type MemoryFormState } from "./actions";
import styles from "./MemoryForm.module.css";

const VISIBILITY_OPTIONS: { value: MemoryVisibility; label: string; hint: string }[] = [
  { value: "draft", label: "Borrador", hint: "Solo tú la ves." },
  { value: "members", label: "Miembros", hint: "Todos los que tienen cuenta en el libro." },
  { value: "selected", label: "Personas elegidas", hint: "Solo tú y quienes marques abajo." },
  { value: "public", label: "Pública con enlace", hint: "Cualquiera con el enlace, aunque no tenga cuenta." },
];

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Valores iniciales del formulario a partir de una página existente. */
function valuesFrom(memory?: Memory, viewerIds: string[] = []): Record<string, string> {
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
    visibility: memory?.visibility ?? "members",
    viewers: viewerIds.join(","),
  };
}

interface Props {
  memory?: Memory;
  /** Usuarios con los que ya se compartió (al editar) */
  viewerIds?: string[];
  /** Los demás usuarios del libro */
  profiles: Profile[];
}

export default function MemoryForm({ memory, viewerIds, profiles }: Props) {
  const initialState: MemoryFormState = {
    error: null,
    values: valuesFrom(memory, viewerIds),
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(
    saveMemory.bind(null, memory?.id ?? null),
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      {/* key: vuelve a montar los campos con lo enviado si hubo un error */}
      <Fields
        key={state.attempt}
        values={state.values}
        profiles={profiles}
        error={state.error}
        pending={pending}
        isEdit={Boolean(memory)}
      />
    </form>
  );
}

interface FieldsProps {
  values: Record<string, string>;
  profiles: Profile[];
  error: string | null;
  pending: boolean;
  isEdit: boolean;
}

function Fields({ values: v, profiles, error, pending, isEdit }: FieldsProps) {
  const [visibility, setVisibility] = useState(v.visibility as MemoryVisibility);
  const selectedViewers = new Set(v.viewers ? v.viewers.split(",") : []);

  return (
    <>
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

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>¿Quién puede verla?</legend>
        <div className={styles.options}>
          {VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value} className={styles.option}>
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => setVisibility(option.value)}
              />
              <span>
                <strong>{option.label}</strong>
                <span className={styles.hint}>{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {visibility === "selected" && (
          <div className={styles.viewers}>
            {profiles.length === 0 ? (
              <p className={styles.hint}>Todavía no hay más usuarios en el libro.</p>
            ) : (
              profiles.map((profile) => (
                <label key={profile.id} className={styles.check}>
                  <input
                    type="checkbox"
                    name="viewers"
                    value={profile.id}
                    defaultChecked={selectedViewers.has(profile.id)}
                  />
                  <span>
                    {profile.displayName} <span className={styles.hint}>{profile.email}</span>
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </fieldset>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Link href="/admin" className={styles.cancel}>
          Cancelar
        </Link>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Pegar en el libro"}
        </button>
      </div>
    </>
  );
}
