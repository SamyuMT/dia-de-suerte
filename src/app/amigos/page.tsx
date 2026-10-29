import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDirectory } from "@/lib/profiles";
import type { DirectoryEntry } from "@/types/memory";
import {
  acceptRequestAction,
  declineRequestAction,
  removeFriendshipAction,
  sendRequestAction,
} from "./actions";
import FriendButton from "./FriendButton";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Amigos",
  robots: { index: false },
};

function Person({ entry }: { entry: DirectoryEntry }) {
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
            />
            <FriendButton
              action={declineRequestAction.bind(null, entry.requestId)}
              label="Rechazar"
              pendingLabel="…"
            />
          </>
        )}
        {entry.status === "sent" && (
          <FriendButton
            action={removeFriendshipAction.bind(null, entry.id)}
            label="Cancelar solicitud"
            pendingLabel="Cancelando…"
          />
        )}
        {entry.status === "friends" && (
          <FriendButton
            action={removeFriendshipAction.bind(null, entry.id)}
            label="Dejar de ser amigos"
            pendingLabel="…"
            variant="danger"
            confirmText={`¿Dejar de ser amigos de ${entry.displayName}? Ya no verán los recuerdos que se compartieron.`}
          />
        )}
        {entry.status === "none" && (
          <FriendButton
            action={sendRequestAction.bind(null, entry.id)}
            label="+ Enviar solicitud"
            pendingLabel="Enviando…"
            variant="primary"
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

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q = "" } = await searchParams;
  const directory = await getDirectory();
  const query = q.trim().toLowerCase();

  const received = directory.filter((e) => e.status === "received");
  const friends = directory.filter((e) => e.status === "friends");
  const sent = directory.filter((e) => e.status === "sent");
  const others = directory.filter(
    (e) => e.status === "none" && (!query || e.displayName.toLowerCase().includes(query)),
  );

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/" className={styles.back}>
        ← Volver al libro
      </Link>
      <div className={styles.card}>
        <h1 className={styles.title}>Amigos</h1>
        <p className={styles.note}>
          Solo puedes compartir recuerdos con tus amigos. Envía una solicitud y, cuando la acepten, aparecerán al
          compartir. Los demás solo ven tu apodo, nunca tu correo.
        </p>

        <Section title="Te quieren agregar" entries={received} />
        <Section title="Mis amigos" entries={friends} empty="Todavía no tienes amigos en el libro." />
        <Section title="Solicitudes enviadas" entries={sent} />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Buscar personas</h2>
          <form className={styles.search} role="search">
            <input
              className={styles.input}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por apodo"
              aria-label="Buscar por apodo"
              autoCapitalize="none"
            />
            <button type="submit" className={styles.quiet}>
              Buscar
            </button>
          </form>
          {others.length === 0 ? (
            <p className={styles.empty}>{query ? "Nadie con ese apodo." : "No hay más personas en el libro."}</p>
          ) : (
            <ul className={styles.list}>
              {others.map((entry) => (
                <Person key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
