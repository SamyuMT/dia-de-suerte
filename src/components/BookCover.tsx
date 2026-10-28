import Clover from "./Clover";
import styles from "./BookCover.module.css";

const LETTER_COLORS = [
  "var(--letter-1)",
  "var(--letter-2)",
  "var(--letter-3)",
  "var(--letter-4)",
  "var(--letter-5)",
  "var(--letter-6)",
  "var(--letter-7)",
  "var(--letter-8)",
];

function ColoredWord({ word, offset = 0 }: { word: string; offset?: number }) {
  return (
    <span className={styles.word}>
      {Array.from(word).map((letter, i) => (
        <span
          key={i}
          className={styles.letter}
          style={{
            color: LETTER_COLORS[(i + offset) % LETTER_COLORS.length],
            transform: `translateY(${(i % 3) - 1}px) rotate(${((i * 7) % 5) - 2}deg)`,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

/** Portada de libro de cuero con el título en letras de colores. */
export default function BookCover() {
  return (
    <div className={styles.book}>
      <div className={styles.spine} />
      <div className={styles.cover}>
        <div className={styles.frame}>
          <div className={styles.oval}>
            <p className={styles.kicker}>Nuestro libro de aventuras</p>
            <h1 className={styles.title} aria-label="Día de Suerte">
              <ColoredWord word="DÍA" />
              <ColoredWord word="DE" offset={3} />
              <ColoredWord word="SUERTE" offset={5} />
            </h1>
          </div>
          <div className={styles.medallion}>
            <Clover size={46} />
            <span className={styles.tape} />
          </div>
        </div>
      </div>
    </div>
  );
}
