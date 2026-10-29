"use client";

import { useState } from "react";
import { BLOCK_INFO, BLOCK_MEDIA_LIMITS, type MediaItem, type MediaKind, type MemoryBlock } from "@/types/memory";
import MediaPicker from "./MediaPicker";
import styles from "./BlockEditor.module.css";

const MEDIA_KINDS: Partial<Record<MemoryBlock["type"], MediaKind[]>> = {
  photos: ["image", "gif"],
  music: ["audio"],
  gif: ["gif"],
};

interface BlockEditorProps {
  block: MemoryBlock;
  onChange: (block: MemoryBlock) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToPrevPage?: () => void;
  onToNextPage: () => void;
  /** Fotos que todavía caben en la página, sin contar las de este bloque */
  pageRoom: number;
  library: MediaItem[];
  userId: string;
  /** Archivos usados en todo el recuerdo */
  usedIds: Set<string>;
  onLibraryAdd: (items: MediaItem[]) => void;
  onLibraryDelete: (id: string) => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {rows ? (
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={value ?? ""}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={styles.input}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

/** Formulario de un bloque (texto, fotos, canción, GIF o clavel) con sus controles. */
export default function BlockEditor({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToPrevPage,
  onToNextPage,
  pageRoom,
  library,
  userId,
  usedIds,
  onLibraryAdd,
  onLibraryDelete,
}: BlockEditorProps) {
  const kinds = MEDIA_KINDS[block.type];
  const limits = BLOCK_MEDIA_LIMITS[block.type];
  const [picking, setPicking] = useState(Boolean(kinds) && block.media.length === 0);
  const info = BLOCK_INFO[block.type];
  const set = (patch: Partial<MemoryBlock>) => onChange({ ...block, ...patch });
  // Canción o GIF: siempre cabe uno (reemplaza al anterior). Fotos: límite del bloque y de la página.
  const room =
    limits.max === 1 ? 1 : Math.min(limits.max - block.media.length, pageRoom - block.media.length);

  const addMedia = (items: MediaItem[]) => {
    const added = items.filter((m) => !block.media.some((bm) => bm.media.id === m.id));
    if (limits.max === 1) {
      if (added[0]) set({ media: [{ media: added[0] }] });
      setPicking(false);
      return;
    }
    const kept = added.slice(0, Math.max(room, 0));
    set({ media: [...block.media, ...kept.map((media) => ({ media }))] });
    if (kept.length >= room) setPicking(false);
  };

  const moveMedia = (from: number, to: number) => {
    const media = [...block.media];
    const [item] = media.splice(from, 1);
    media.splice(to, 0, item);
    set({ media });
  };

  return (
    <article className={styles.block}>
      <header className={styles.head}>
        <span className={styles.type}>
          {info.icon} {info.label}
        </span>
        <div className={styles.tools}>
          <button type="button" onClick={onMoveUp} disabled={!onMoveUp} title="Subir en la página">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} disabled={!onMoveDown} title="Bajar en la página">
            ↓
          </button>
          <button type="button" onClick={onToPrevPage} disabled={!onToPrevPage} title="Pasar a la página anterior">
            ← pág.
          </button>
          <button type="button" onClick={onToNextPage} title="Pasar a la página siguiente">
            pág. →
          </button>
          <button type="button" className={styles.remove} onClick={onRemove} title="Quitar bloque">
            ✕
          </button>
        </div>
      </header>

      {block.type === "music" && (
        <div className={styles.row}>
          <Field label="Canción *" value={block.trackTitle} onChange={(v) => set({ trackTitle: v })} />
          <Field label="Artista" value={block.trackArtist} onChange={(v) => set({ trackArtist: v })} />
        </div>
      )}

      {block.type !== "music" && block.type !== "decoration" && (
        <Field
          label={block.type === "text" ? "Saludo" : "Título"}
          value={block.heading}
          onChange={(v) => set({ heading: v })}
          placeholder={block.type === "text" ? "Buenos días 🌷" : ""}
        />
      )}

      {kinds && (
        <div className={styles.media}>
          <span className={styles.label}>
            {block.type === "music" ? "Archivo de la canción *" : block.type === "gif" ? "GIF *" : "Fotos *"}
            {limits.max > 1 && ` (${block.media.length}/${Math.min(limits.max, pageRoom)} en esta página)`}
          </span>

          {block.media.length > 0 && (
            <ul className={styles.mediaList}>
              {block.media.map((bm, i) => (
                <li key={bm.media.id} className={styles.mediaItem}>
                  {bm.media.kind === "audio" ? (
                    <span className={styles.trackName}>💿 {bm.media.originalName ?? "Canción"}</span>
                  ) : (
                    <img src={bm.media.url} alt="" className={styles.thumb} />
                  )}
                  {block.type !== "music" && (
                    <input
                      className={styles.input}
                      value={bm.caption ?? ""}
                      placeholder="Nota de la foto"
                      onChange={(e) => {
                        const media = [...block.media];
                        media[i] = { ...bm, caption: e.target.value };
                        set({ media });
                      }}
                    />
                  )}
                  <div className={styles.tools}>
                    {limits.max > 1 && (
                      <>
                        <button type="button" disabled={i === 0} onClick={() => moveMedia(i, i - 1)} title="Antes">
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={i === block.media.length - 1}
                          onClick={() => moveMedia(i, i + 1)}
                          title="Después"
                        >
                          →
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => set({ media: block.media.filter((_, j) => j !== i) })}
                      title="Quitar de este recuerdo"
                      aria-label="Quitar de este recuerdo"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {picking ? (
            <MediaPicker
              kinds={kinds}
              room={room}
              library={library}
              userId={userId}
              usedIds={usedIds}
              onUploaded={(items) => {
                onLibraryAdd(items);
                addMedia(items);
              }}
              onPick={(item) => addMedia([item])}
              onDeleted={onLibraryDelete}
              onClose={() => setPicking(false)}
            />
          ) : (
            (room > 0 || limits.max === 1) && (
              <button type="button" className={styles.add} onClick={() => setPicking(true)}>
                {block.media.length === 0
                  ? "+ Agregar"
                  : limits.max === 1
                    ? "Cambiar archivo"
                    : "+ Agregar más fotos"}
              </button>
            )
          )}
        </div>
      )}

      {block.type !== "decoration" && (
        <Field
          label={block.type === "text" ? "Texto *" : "Texto (opcional)"}
          value={block.body}
          onChange={(v) => set({ body: v })}
          rows={block.type === "text" ? 8 : 3}
          placeholder="Deja una línea en blanco para separar párrafos."
        />
      )}

      <Field
        label={block.type === "decoration" ? "Texto del clavel" : "Firma o pie"}
        value={block.caption}
        onChange={(v) => set({ caption: v })}
      />
    </article>
  );
}
