import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDirectory } from "@/lib/profiles";
import type { DirectoryEntry } from "@/types/memory";
import { acceptRequestAction, declineRequestAction, removeFriendshipAction } from "./actions";
import FriendButton from "./FriendButton";
import FriendSearch from "./FriendSearch";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Amigos",
  robots: { index: false },
};

function Person({ entry }: { entry: DirectoryEntry }) {
  const name = <strong>{entry.displayName}</strong>;
  return (
    <li className={styles.person}>
      <span className={styles.avatar} aria-hidden="true">
        {entry.displayName.slice(0, 1).toUpperCase()}
      </span>
      <span className={styles.nick}>{entry.displayName}</span>
      <span className={styles.actions}>
        {entry.status === "received" && entry.requestId && (
          <>
            <FriendButton
              action={acceptRequestAction.bind(null, entry.requestId)}
              label="Aceptar"
              pendingLabel="Aceptando…"
              variant="primary"
              doneTitle="¡Ahora son amigos!"
            />
            <FriendButton
              action={declineRequestAction.bind(null, entry.requestId)}
              label="Rechazar"
              pendingLabel="…"
              doneTitle="Solicitud rechazada"
              confirm={{
                title: "¿Rechazar la solicitud?",
                message: <p>{name} no sabrá que la rechazaste, pero podrá volver a enviarte otra.</p>,
                confirmLabel: "Rechazar",
                tone: "danger",
              }}
            />
          </>
        )}
        {entry.status === "sent" && (
          <FriendButton
            action={removeFriendshipAction.bind(null, entry.id)}
            label="Cancelar solicitud"
            pendingLabel="Cancelando…"
            doneTitle="Solicitud cancelada"
            confirm={{
              title: "¿Cancelar la solicitud?",
              message: <p>Le quitarás la solicitud que le enviaste a {name}.</p>,
              confirmLabel: "Cancelar solicitud",
              cancelLabel: "Dejarla",
              tone: "danger",
            }}
          />
        )}
        {entry.status === "friends" && (
          <FriendButton
            action={removeFriendshipAction.bind(null, entry.id)}
            label="Dejar de ser amigos"
            pendingLabel="…"
            variant="danger"
            doneTitle="Ya no son amigos"
            confirm={{
              title: "¿Dejar de ser amigos?",
              message: (
                <>
                  <p>Tú y {name} dejarán de ver los recuerdos que se compartieron.</p>
                  <p>Podrán volver a ser amigos con una nueva solicitud.</p>
                </>
              ),
              confirmLabel: "Dejar de ser amigos",
              tone: "danger",
            }}
          />
        )}
      </span>
    </li>
  );
}

function Section({ title, entries, empty }: { title: string; entries: DirectoryEntry[]; empty?: string }) {
  if (entries.length === 0 && !empty) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title} {entries.length > 0 && <span className={styles.count}>{entries.length}</span>}
      </h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <Person key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function FriendsPage() {
  await requireUser();
  // Solo trae a las personas con las que hay relación (el RLS no deja ver a nadie más).
  const directory = await getDirectory();

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/" className={styles.back}>
        ← Volver al libro
      </Link>
      <div className={styles.card}>
        <h1 className={styles.title}>Amigos</h1>
        <p className={styles.note}>
          Solo puedes compartir recuerdos con tus amigos. Nadie puede ver la lista de usuarios: para agregar a alguien
          necesitas su apodo exacto.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Agregar un amigo</h2>
          <FriendSearch />
        </section>

        <Section title="Te quieren agregar" entries={directory.filter((e) => e.status === "received")} />
        <Section
          title="Mis amigos"
          entries={directory.filter((e) => e.status === "friends")}
          empty="Todavía no tienes amigos en el libro."
        />
        <Section title="Solicitudes enviadas" entries={directory.filter((e) => e.status === "sent")} />
      </div>
    </div>
  );
}
