"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import BookView from "@/components/book/BookView";
import { useDialog } from "@/components/dialog/useDialog";
import {
  BLOCK_INFO,
  BLOCK_TYPES,
  KIND_INFO,
  MAX_PHOTOS_PER_PAGE,
  MEMORY_KINDS,
  type BlockType,
  type MediaItem,
  type Memory,
  type MemoryBlock,
  type MemoryKind,
  type MemoryVisibility,
  type Profile,
} from "@/types/memory";
import { saveMemoryAction } from "../actions";
import BlockEditor from "./BlockEditor";
import { emptyBlock, templatePages } from "./templates";
import styles from "./MemoryEditor.module.css";

const VISIBILITY_OPTIONS: { value: MemoryVisibility; label: string; hint: string }[] = [
  { value: "draft", label: "Borrador", hint: "Solo tú lo ves." },
  { value: "friends", label: "Mis amigos", hint: "Todos tus amigos del libro." },
  { value: "selected", label: "Amigos elegidos", hint: "Solo tú y los amigos que marques." },
  { value: "public", label: "Público con enlace", hint: "Cualquiera con el enlace, aunque no tenga cuenta." },
];

/** Bloque con una clave estable para React (no se guarda). */
type EditorBlock = MemoryBlock & { key: string };
type EditorPage = { key: string; blocks: EditorBlock[] };

let keySeed = 0;
const newKey = () => `k${++keySeed}`;

const toEditorPages = (pages: MemoryBlock[][]): EditorPage[] =>
  pages.map((blocks) => ({ key: newKey(), blocks: blocks.map((b) => ({ ...b, key: newKey() })) }));

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface MemoryEditorProps {
  userId: string;
  /** Al editar: el recuerdo existente */
  memory?: Memory;
  /** Al crear: el tipo elegido */
  kind?: MemoryKind;
  viewerIds?: string[];
  /** Amigos del usuario (con quienes puede compartir) */
  profiles: Profile[];
  library: MediaItem[];
}

const photoCount = (blocks: MemoryBlock[]) =>
  blocks.filter((b) => b.type === "photos").reduce((n, b) => n + b.media.length, 0);

/** Editor de un recuerdo: datos, páginas y bloques, con vista previa del libro. */
export default function MemoryEditor({ userId, memory, kind, viewerIds, profiles, library }: MemoryEditorProps) {
  const [title, setTitle] = useState(memory?.title ?? "");
  const [date, setDate] = useState(memory?.date ?? today());
  const [slug, setSlug] = useState(memory?.slug ?? "");
  const [excerpt, setExcerpt] = useState(memory?.excerpt ?? "");
  const [tags, setTags] = useState(memory?.tags.join(", ") ?? "");
  const [memoryKind, setMemoryKind] = useState<MemoryKind>(memory?.kind ?? kind ?? "pensamiento");
  const [visibility, setVisibility] = useState<MemoryVisibility>(memory?.visibility ?? "friends");
  // Solo se puede compartir con amigos: quien dejó de serlo se quita de la lista.
  const [viewers, setViewers] = useState<string[]>(() =>
    (viewerIds ?? []).filter((id) => profiles.some((p) => p.id === id)),
  );
  const [pages, setPages] = useState<EditorPage[]>(() =>
    toEditorPages(memory ? memory.pages.map((p) => p.blocks) : templatePages(kind ?? "pensamiento")),
  );
  const [current, setCurrent] = useState(0);
  const [media, setMedia] = useState<MediaItem[]>(library);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const { confirm, notify, dialog } = useDialog();

  const page = pages[current];
  const pagePhotos = photoCount(page.blocks);
  const usedIds = new Set(pages.flatMap((p) => p.blocks.flatMap((b) => b.media.map((bm) => bm.media.id))));

  const updatePages = (fn: (pages: EditorPage[]) => EditorPage[]) => setPages((prev) => fn(prev));

  const setBlocks = (pageIndex: number, fn: (blocks: EditorBlock[]) => EditorBlock[]) =>
    updatePages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, blocks: fn(p.blocks) } : p)));

  const addPage = () => {
    updatePages((prev) => [...prev.slice(0, current + 1), { key: newKey(), blocks: [] }, ...prev.slice(current + 1)]);
    setCurrent(current + 1);
  };

  const removePage = async () => {
    if (pages.length === 1) return;
    const index = current;
    if (
      page.blocks.length > 0 &&
      !(await confirm({
        title: `¿Quitar la página ${index + 1}?`,
        tone: "danger",
        message: "Se quita con todo lo que tiene. Las fotos y canciones siguen en tu biblioteca.",
        confirmLabel: "Quitar página",
      }))
    ) {
      return;
    }
    updatePages((prev) => prev.filter((_, i) => i !== index));
    setCurrent(Math.max(0, index - 1));
  };

  const movePage = (to: number) => {
    updatePages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(current, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setCurrent(to);
  };

  const addBlock = (type: BlockType) =>
    setBlocks(current, (blocks) => [...blocks, { ...emptyBlock(type), key: newKey() }]);

  const moveBlock = (from: number, to: number) =>
    setBlocks(current, (blocks) => {
      const next = [...blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  /** Pasa un bloque a la página anterior o siguiente (crea la siguiente si no existe). */
  const blockToPage = (blockIndex: number, direction: -1 | 1) => {
    const target = current + direction;
    updatePages((prev) => {
      const next = prev.map((p) => ({ ...p, blocks: [...p.blocks] }));
      if (target === next.length) next.push({ key: newKey(), blocks: [] });
      const [moved] = next[current].blocks.splice(blockIndex, 1);
      if (direction === 1) next[target].blocks.unshift(moved);
      else next[target].blocks.push(moved);
      return next;
    });
    setCurrent(target);
  };

  const save = () => {
    setError(null);
    startSaving(async () => {
      const result = await saveMemoryAction(memory?.id ?? null, {
        slug,
        title,
        date,
        excerpt,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        visibility,
        kind: memoryKind,
        viewerIds: visibility === "selected" ? viewers : [],
        pages: pages.map((p) => ({
          blocks: p.blocks.map(({ key: _key, media: blockMedia, ...block }) => ({
            ...block,
            media: blockMedia.map((bm) => ({ id: bm.media.id, caption: bm.caption })),
          })),
        })),
      });
      // Si guardó, la acción redirige al panel; si no, devuelve el error.
      if (result?.error) {
        setError(result.error);
        notify({ title: "Falta algo", tone: "error", message: result.error });
      }
    });
  };

  return (
    <div className={styles.editor}>
      <section className={styles.card}>
        <div className={styles.row}>
          <label className={`${styles.field} ${styles.grow}`}>
            <span className={styles.label}>Título *</span>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Fecha *</span>
            <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Tipo</span>
            <select
              className={styles.input}
              value={memoryKind}
              onChange={(e) => setMemoryKind(e.target.value as MemoryKind)}
            >
              {MEMORY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_INFO[k].icon} {KIND_INFO[k].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <details className={styles.more}>
          <summary>Más opciones (dirección, resumen, etiquetas)</summary>
          <div className={styles.moreFields}>
            <label className={styles.field}>
              <span className={styles.label}>Dirección (slug)</span>
              <input
                className={styles.input}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="se genera del título si lo dejas vacío"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Resumen</span>
              <input
                className={styles.input}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="se toma del primer texto si lo dejas vacío"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Etiquetas</span>
              <input
                className={styles.input}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="cariño, viaje, buenos días"
              />
            </label>
          </div>
        </details>
      </section>

      <section className={styles.previewSection} aria-label="Vista previa">
        <p className={styles.previewHint}>Así se verá en el libro. Toca una página para editarla.</p>
        <BookView title={title} date={date} pages={pages} selectedPage={current} onSelectPage={setCurrent} />
      </section>

      <section className={styles.card}>
        <div className={styles.pageBar}>
          <div className={styles.tabs} role="tablist" aria-label="Páginas">
            {pages.map((p, i) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={i === current}
                className={i === current ? styles.tabActive : styles.tab}
                onClick={() => setCurrent(i)}
              >
                Pág. {i + 1}
              </button>
            ))}
            <button type="button" className={styles.tabAdd} onClick={addPage}>
              + Página
            </button>
          </div>
          <div className={styles.pageTools}>
            <button type="button" onClick={() => movePage(current - 1)} disabled={current === 0}>
              ← Mover página
            </button>
            <button type="button" onClick={() => movePage(current + 1)} disabled={current === pages.length - 1}>
              Mover página →
            </button>
            <button type="button" onClick={removePage} disabled={pages.length === 1} className={styles.danger}>
              Quitar página
            </button>
          </div>
        </div>

        <h2 className={styles.pageTitle}>
          Página {current + 1}
          <span className={styles.hint}>
            {" "}
            · {pagePhotos}/{MAX_PHOTOS_PER_PAGE} fotos
          </span>
        </h2>

        <div className={styles.blocks}>
          {page.blocks.length === 0 && (
            <p className={styles.empty}>Página en blanco. Agrega algo abajo o déjala así para el final.</p>
          )}
          {page.blocks.map((block, i) => (
            <BlockEditor
              key={block.key}
              block={block}
              onChange={(updated) =>
                setBlocks(current, (blocks) => blocks.map((b, j) => (j === i ? { ...updated, key: b.key } : b)))
              }
              onRemove={async () => {
                const pageIndex = current;
                const ok = await confirm({
                  title: `¿Quitar el bloque de ${BLOCK_INFO[block.type].label.toLowerCase()}?`,
                  icon: BLOCK_INFO[block.type].icon,
                  tone: "danger",
                  message: "Se quita de esta página. Si tenía fotos o una canción, siguen en tu biblioteca.",
                  confirmLabel: "Quitar bloque",
                });
                if (ok) setBlocks(pageIndex, (blocks) => blocks.filter((b) => b.key !== block.key));
              }}
              onMoveUp={i > 0 ? () => moveBlock(i, i - 1) : undefined}
              onMoveDown={i < page.blocks.length - 1 ? () => moveBlock(i, i + 1) : undefined}
              onToPrevPage={current > 0 ? () => blockToPage(i, -1) : undefined}
              onToNextPage={() => blockToPage(i, 1)}
              pageRoom={MAX_PHOTOS_PER_PAGE - (pagePhotos - photoCount([block]))}
              library={media}
              userId={userId}
              usedIds={usedIds}
              onLibraryAdd={(items) => setMedia((prev) => [...items, ...prev])}
              onLibraryDelete={(id) => setMedia((prev) => prev.filter((m) => m.id !== id))}
            />
          ))}
        </div>

        <div className={styles.addBlock}>
          <span className={styles.label}>Agregar a esta página:</span>
          {BLOCK_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => addBlock(type)}>
              {BLOCK_INFO[type].icon} {BLOCK_INFO[type].label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>¿Quién puede verlo?</legend>
          <div className={styles.options}>
            {VISIBILITY_OPTIONS.map((option) => (
              <label key={option.value} className={styles.option}>
                <input
                  type="radio"
                  name="visibility"
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
                <p className={styles.hint}>
                  Todavía no tienes amigos en el libro. <Link href="/amigos">Envía una solicitud</Link> y, cuando la
                  acepten, podrás compartir con ellos.
                </p>
              ) : (
                profiles.map((profile) => (
                  <label key={profile.id} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={viewers.includes(profile.id)}
                      onChange={(e) =>
                        setViewers((prev) =>
                          e.target.checked ? [...prev, profile.id] : prev.filter((id) => id !== profile.id),
                        )
                      }
                    />
                    <span>{profile.displayName}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </fieldset>
      </section>

      <div className={styles.saveBar}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.saveActions}>
          <Link href="/admin" className={styles.cancel}>
            Cancelar
          </Link>
          <button type="button" className={styles.submit} onClick={save} disabled={saving}>
            {saving ? "Guardando..." : memory ? "Guardar cambios" : "Pegar en el libro"}
          </button>
        </div>
      </div>
      {dialog}
    </div>
  );
}
