"use client";

import { useState } from "react";
import type { MemoryPage } from "@/types/memory";
import BookPage from "./BookPage";
import styles from "./Book.module.css";

interface BookViewProps {
  title: string;
  date: string;
  pages: MemoryPage[];
  /** Editor: página seleccionada (el libro se abre en su doble página) */
  selectedPage?: number;
  /** Editor: al hacer clic en una página */
  onSelectPage?: (index: number) => void;
}

/** Libro abierto: muestra las páginas de dos en dos y permite pasarlas. */
export default function BookView({ title, date, pages, selectedPage, onSelectPage }: BookViewProps) {
  const spreadCount = Math.max(1, Math.ceil(pages.length / 2));
  const [ownSpread, setOwnSpread] = useState(0);
  // En el editor, la doble página sigue a la página seleccionada.
  const spread = Math.min(
    selectedPage !== undefined ? Math.floor(selectedPage / 2) : ownSpread,
    spreadCount - 1,
  );

  const goTo = (next: number) => {
    if (onSelectPage) onSelectPage(next * 2);
    else setOwnSpread(next);
  };

  const left = spread * 2;
  const right = left + 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.book}>
        {[left, right].map((index) => {
          const side = index === left ? styles.left : styles.right;
          const page = pages[index];
          const selected = selectedPage === index;
          const className = `${styles.page} ${side} ${onSelectPage && page ? styles.clickable : ""} ${
            selected ? styles.selected : ""
          }`;
          return (
            <section
              key={index}
              className={className}
              onClick={onSelectPage && page ? () => onSelectPage(index) : undefined}
              aria-label={page ? `Página ${index + 1}` : "Página en blanco"}
            >
              {page ? (
                <BookPage page={page} index={index} title={title} date={date} />
              ) : (
                <p className={styles.blank}>Esta página espera lo que vendrá…</p>
              )}
              {page && <span className={styles.number}>{index + 1}</span>}
            </section>
          );
        })}
      </div>

      {spreadCount > 1 && (
        <nav className={styles.turn} aria-label="Pasar página">
          <button type="button" onClick={() => goTo(spread - 1)} disabled={spread === 0}>
            ← Anterior
          </button>
          <span>
            {spread + 1} / {spreadCount}
          </span>
          <button type="button" onClick={() => goTo(spread + 1)} disabled={spread === spreadCount - 1}>
            Siguiente →
          </button>
        </nav>
      )}
    </div>
  );
}
