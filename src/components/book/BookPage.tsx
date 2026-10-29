import Carnation from "@/components/Carnation";
import { formatDate } from "@/lib/format";
import type { MemoryBlock, MemoryPage } from "@/types/memory";
import GifBlock from "./GifBlock";
import MusicDisc from "./MusicDisc";
import PhotosBlock from "./PhotosBlock";
import TextBlock from "./TextBlock";
import styles from "./Book.module.css";

interface BookPageProps {
  page: MemoryPage;
  index: number;
  title: string;
  date: string;
}

function Block({ block }: { block: MemoryBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "photos":
      return <PhotosBlock block={block} />;
    case "music":
      return <MusicDisc block={block} />;
    case "gif":
      return <GifBlock block={block} />;
    case "decoration":
      return (
        <div className={styles.flowerFrame}>
          <Carnation caption={block.caption} />
        </div>
      );
  }
}

/** Una cara del libro. La primera lleva la fecha y el título del recuerdo. */
export default function BookPage({ page, index, title, date }: BookPageProps) {
  return (
    <div className={styles.content}>
      {index === 0 && (
        <header className={styles.header}>
          {date && (
            <time className={styles.date} dateTime={date}>
              {formatDate(date)}
            </time>
          )}
          <h1 className={styles.title}>{title || "Sin título"}</h1>
        </header>
      )}
      {page.blocks.length === 0 && index !== 0 && <p className={styles.blank}>Página vacía</p>}
      {page.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
