import styles from "./Polaroid.module.css";

interface PolaroidProps {
  caption: string;
  children: React.ReactNode;
  tilt?: number;
}

/** Foto instantánea pegada al álbum con esquineros. */
export default function Polaroid({ caption, children, tilt = 0 }: PolaroidProps) {
  return (
    <figure className={styles.polaroid} style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}>
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.tr}`} />
      <span className={`${styles.corner} ${styles.bl}`} />
      <span className={`${styles.corner} ${styles.br}`} />
      <div className={styles.photo}>{children}</div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
