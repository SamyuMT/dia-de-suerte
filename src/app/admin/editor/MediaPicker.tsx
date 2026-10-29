"use client";

import { useRef, useState } from "react";
import { useDialog } from "@/components/dialog/useDialog";
import type { MediaItem, MediaKind } from "@/types/memory";
import { deleteMediaAction } from "../actions";
import { ACCEPT, uploadMedia } from "./upload";
import styles from "./MediaPicker.module.css";

interface MediaPickerProps {
  /** Clases de archivo que acepta el bloque */
  kinds: MediaKind[];
  /** Cuántos archivos más se pueden agregar ahora (0 = ninguno) */
  room: number;
  /** Archivos del usuario ya subidos */
  library: MediaItem[];
  userId: string;
  /** Ids usados en este recuerdo (no se pueden borrar mientras estén puestos) */
  usedIds: Set<string>;
  onUploaded: (items: MediaItem[]) => void;
  onPick: (item: MediaItem) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}

/** Subir archivos nuevos, elegir de los que ya subiste o borrarlos de tu biblioteca. */
export default function MediaPicker({
  kinds,
  room,
  library,
  userId,
  usedIds,
  onUploaded,
  onPick,
  onDeleted,
  onClose,
}: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, notify, dialog } = useDialog();
  const items = library.filter((m) => kinds.includes(m.kind));
  const isAudio = kinds.includes("audio");
  const full = room <= 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const list = [...files].slice(0, Math.max(room, 1));
    if (files.length > list.length) setError(`Solo caben ${room} más en esta página; se subieron las primeras.`);
    setUploading(list.length);
    const done: MediaItem[] = [];
    for (const file of list) {
      try {
        done.push(await uploadMedia(file, userId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      }
      setUploading((n) => n - 1);
    }
    if (done.length > 0) onUploaded(done);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (item: MediaItem) => {
    const what = isAudio ? "esta canción" : item.kind === "gif" ? "este GIF" : "esta foto";
    const ok = await confirm({
      title: `¿Borrar ${what}?`,
      tone: "danger",
      message: (
        <>
          {item.kind !== "audio" && (
            <img src={item.url} alt="" style={{ maxWidth: 140, maxHeight: 140, margin: "0 auto 10px", display: "block" }} />
          )}
          <p>Se borra de tu biblioteca para siempre{item.originalName ? <> ({item.originalName})</> : null}.</p>
        </>
      ),
      confirmLabel: "Borrar",
    });
    if (!ok) return;
    setError(null);
    setDeleting(item.id);
    const result = await deleteMediaAction(item.id);
    setDeleting(null);
    if (result.error) await notify({ title: "No se pudo borrar", tone: "error", message: result.error });
    else onDeleted(item.id);
  };

  return (
    <div className={styles.picker}>
      <div className={styles.top}>
        <label className={`${styles.upload} ${full ? styles.disabled : ""}`}>
          <input
            ref={inputRef}
            type="file"
            accept={kinds.map((k) => ACCEPT[k]).join(",")}
            multiple={room > 1}
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading > 0 || full}
          />
          {uploading > 0 ? `Subiendo ${uploading}…` : isAudio ? "⬆ Subir canción" : "⬆ Subir desde tu equipo"}
        </label>
        <button type="button" className={styles.close} onClick={onClose}>
          Listo
        </button>
      </div>

      {full && <p className={styles.hint}>Esta página ya tiene el máximo de fotos. Agrega más en otra página.</p>}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <>
          <p className={styles.hint}>O elige de lo que ya subiste:</p>
          <div className={isAudio ? styles.tracks : styles.grid}>
            {items.map((item) => {
              const used = usedIds.has(item.id);
              return (
                <div key={item.id} className={`${styles.item} ${used ? styles.used : ""}`}>
                  <button
                    type="button"
                    className={styles.pick}
                    onClick={() => onPick(item)}
                    disabled={used || full}
                    title={item.originalName}
                  >
                    {item.kind === "audio" ? (
                      <span className={styles.track}>💿 {item.originalName ?? "Canción"}</span>
                    ) : (
                      <img src={item.url} alt={item.originalName ?? ""} loading="lazy" />
                    )}
                    {used && <span className={styles.check}>✓</span>}
                  </button>
                  {!used && (
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => remove(item)}
                      disabled={deleting === item.id}
                      aria-label={`Borrar ${item.originalName ?? "archivo"} de la biblioteca`}
                      title="Borrar de tu biblioteca"
                    >
                      {deleting === item.id ? "…" : "🗑"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
