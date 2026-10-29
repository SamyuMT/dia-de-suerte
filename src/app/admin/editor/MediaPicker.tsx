"use client";

import { useRef, useState } from "react";
import type { MediaItem, MediaKind } from "@/types/memory";
import { ACCEPT, uploadMedia } from "./upload";
import styles from "./MediaPicker.module.css";

interface MediaPickerProps {
  /** Clases de archivo que acepta el bloque */
  kinds: MediaKind[];
  /** Puede elegir varios (álbum) o solo uno (canción, GIF) */
  multiple: boolean;
  /** Archivos del usuario ya subidos */
  library: MediaItem[];
  userId: string;
  /** Ids ya puestos en el bloque */
  selectedIds: string[];
  onUploaded: (items: MediaItem[]) => void;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}

/** Subir archivos nuevos o elegir de los que ya subiste. */
export default function MediaPicker({
  kinds,
  multiple,
  library,
  userId,
  selectedIds,
  onUploaded,
  onPick,
  onClose,
}: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const items = library.filter((m) => kinds.includes(m.kind));
  const isAudio = kinds.includes("audio");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const list = multiple ? [...files] : [files[0]];
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

  return (
    <div className={styles.picker}>
      <div className={styles.top}>
        <label className={styles.upload}>
          <input
            ref={inputRef}
            type="file"
            accept={kinds.map((k) => ACCEPT[k]).join(",")}
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading > 0}
          />
          {uploading > 0 ? `Subiendo ${uploading}…` : isAudio ? "⬆ Subir canción" : "⬆ Subir desde tu equipo"}
        </label>
        <button type="button" className={styles.close} onClick={onClose}>
          Listo
        </button>
      </div>

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
              const used = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.item} ${used ? styles.used : ""}`}
                  onClick={() => onPick(item)}
                  disabled={used}
                  title={item.originalName}
                >
                  {item.kind === "audio" ? (
                    <span className={styles.track}>💿 {item.originalName ?? "Canción"}</span>
                  ) : (
                    <img src={item.url} alt={item.originalName ?? ""} loading="lazy" />
                  )}
                  {used && <span className={styles.check}>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
