import Polaroid from "@/components/Polaroid";
import type { MemoryBlock } from "@/types/memory";
import { paragraphs } from "./TextBlock";
import styles from "./Blocks.module.css";

/** Un GIF pegado como foto instantánea que se mueve. */
export default function GifBlock({ block }: { block: MemoryBlock }) {
  const item = block.media[0];

  return (
    <div className={styles.gif}>
      {block.heading && <p className={styles.heading}>{block.heading}</p>}
      {item && (
        <div className={styles.gifFrame}>
          <Polaroid caption={item.caption ?? ""} tilt={1.5}>
            <img className={styles.photo} src={item.media.url} alt={item.caption ?? "GIF"} />
          </Polaroid>
        </div>
      )}
      {paragraphs(block.body).map((p, i) => (
        <p key={i} className={styles.paragraph}>
          {p}
        </p>
      ))}
      {block.caption && <p className={styles.signature}>{block.caption}</p>}
    </div>
  );
}
