import Polaroid from "@/components/Polaroid";
import type { MemoryBlock } from "@/types/memory";
import { paragraphs } from "./TextBlock";
import styles from "./Blocks.module.css";

/** Inclinaciones fijas (no aleatorias) para que servidor y cliente coincidan. */
const TILTS = [-2.5, 1.8, -1.2, 2.6, -1.8, 1.1];

/** Álbum: fotos tipo polaroid pegadas en la página, con texto opcional. */
export default function PhotosBlock({ block }: { block: MemoryBlock }) {
  const count = block.media.length;
  const layout = count === 1 ? styles.one : count === 2 ? styles.two : styles.many;

  return (
    <div className={styles.photos}>
      {block.heading && <p className={styles.heading}>{block.heading}</p>}
      <div className={`${styles.photoGrid} ${layout}`}>
        {block.media.map(({ media, caption }, i) => (
          <Polaroid key={media.id + i} caption={caption ?? ""} tilt={TILTS[i % TILTS.length]}>
            <img className={styles.photo} src={media.url} alt={caption ?? media.originalName ?? "Foto"} loading="lazy" />
          </Polaroid>
        ))}
      </div>
      {paragraphs(block.body).map((p, i) => (
        <p key={i} className={styles.paragraph}>
          {p}
        </p>
      ))}
      {block.caption && <p className={styles.signature}>{block.caption}</p>}
    </div>
  );
}
