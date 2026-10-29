"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { MemoryPage } from "@/types/memory";
import BookPage from "./BookPage";
import styles from "./Book.module.css";

/** Ancho desde el que el libro se abre a doble página. */
const SPREAD_QUERY = "(min-width: 700px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(SPREAD_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** true en tablet y escritorio. En el servidor se asume doble página. */
function useSpread() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SPREAD_QUERY).matches,
    () => true,
  );
}

interface BookViewProps {
  title: string;
  date: string;
  pages: MemoryPage[];
  /** Editor: página seleccionada (el libro se abre donde está) */
  selectedPage?: number;
  /** Editor: al hacer clic en una página */
  onSelectPage?: (index: number) => void;
}

/**
 * Libro abierto. En tablet y escritorio muestra las páginas de dos en dos;
 * en celular, una a la vez, y se pasan con las flechas o deslizando el dedo.
 */
export default function BookView({ title, date, pages, selectedPage, onSelectPage }: BookViewProps) {
  const spread = useSpread();
  const perView = spread ? 2 : 1;
  const viewCount = Math.max(1, Math.ceil(pages.length / perView));
  const [ownView, setOwnView] = useState(0);
  const touchX = useRef<number | null>(null);

  // En el editor, la vista sigue a la página seleccionada.
  const view = Math.min(
    selectedPage !== undefined ? Math.floor(selectedPage / perView) : ownView,
    viewCount - 1,
  );

  const goTo = (next: number) => {
    if (next < 0 || next >= viewCount) return;
    if (onSelectPage) onSelectPage(next * perView);
    else setOwnView(next);
  };

  const first = view * perView;
  const indexes = spread ? [first, first + 1] : [first];

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.book} ${spread ? "" : styles.singleBook}`}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) goTo(view + (dx < 0 ? 1 : -1));
        }}
      >
        {indexes.map((index, i) => {
          const side = !spread ? styles.single : i === 0 ? styles.left : styles.right;
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

      {viewCount > 1 && (
        <nav className={styles.turn} aria-label="Pasar página">
          <button type="button" onClick={() => goTo(view - 1)} disabled={view === 0} aria-label="Página anterior">
            ←<span className={styles.turnText}> Anterior</span>
          </button>
          <span className={styles.position}>
            {spread
              ? `${view + 1} / ${viewCount}`
              : `Página ${view + 1} de ${pages.length}`}
          </span>
          <button
            type="button"
            onClick={() => goTo(view + 1)}
            disabled={view === viewCount - 1}
            aria-label="Página siguiente"
          >
            <span className={styles.turnText}>Siguiente </span>→
          </button>
        </nav>
      )}
      {!spread && viewCount > 1 && <p className={styles.swipeHint}>Desliza para pasar la página</p>}
    </div>
  );
}
