import BookCover from "@/components/BookCover";
import MemoryCard from "@/components/MemoryCard";
import Polaroid from "@/components/Polaroid";
import { getMemories } from "@/lib/memories";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: "📷",
    caption: "Lo que ya vivimos",
    text: "Guarda los momentos que compartieron: un paseo, una conversación larga, una tarde cualquiera que se volvió especial.",
    tilt: -3,
  },
  {
    icon: "✍️",
    caption: "Lo que sentimos",
    text: "Escribe páginas y mensajes para esa persona: buenos días, ánimos, cariño a la distancia. Palabras que se quedan.",
    tilt: 2,
  },
  {
    icon: "🗺️",
    caption: "Lo que vendrá",
    text: "Anota las aventuras que todavía no viven: viajes, planes y sueños. El libro también tiene páginas en blanco.",
    tilt: -1.5,
  },
];

export default async function HomePage() {
  const memories = await getMemories();

  return (
    <>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <BookCover />
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Bienvenida, bienvenido</p>
            <h2 className={styles.heroTitle}>Un lugar para guardar los días de suerte</h2>
            <p>
              <strong>Día de Suerte</strong> es un libro de aventuras virtual. Aquí se publican
              páginas de recuerdos: los que ya viviste con esa persona especial y los que
              todavía están por vivir.
            </p>
            <p className={styles.note}>
              Porque hay días que merecen quedarse escritos.
            </p>
            <a href="#paginas" className={styles.cta}>
              Abrir el libro
            </a>
          </div>
        </div>
      </section>

      <section className={styles.about}>
        <div className="container">
          <div className={styles.parchment}>
            <h2 className={styles.sectionTitle}>¿Qué guarda este libro?</h2>
            <p className={styles.lead}>
              Cada página es un recuerdo: puede ser un mensaje, una fecha importante o un plan
              para más adelante. Con el tiempo el libro se va llenando, como un álbum que se
              escribe entre dos.
            </p>
            <div className={styles.features}>
              {FEATURES.map((f) => (
                <div key={f.caption} className={styles.feature}>
                  <Polaroid caption={f.caption} tilt={f.tilt}>
                    <span className={styles.featureIcon} aria-hidden="true">
                      {f.icon}
                    </span>
                  </Polaroid>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="paginas" className={styles.pages}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Páginas del libro</h2>
          <p className={styles.lead}>Los recuerdos más recientes aparecen primero.</p>
          <div className={styles.cards}>
            {memories.map((memory) => (
              <MemoryCard key={memory.slug} memory={memory} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
