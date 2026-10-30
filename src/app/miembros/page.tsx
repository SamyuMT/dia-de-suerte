import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembershipRequests, isAdmin, type MembershipRequest } from "@/lib/membership";
import RequestActions from "./RequestActions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Miembros",
  robots: { index: false },
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

function Contact({ request }: { request: MembershipRequest }) {
  return (
    <span className={styles.contact}>
      <a href={`mailto:${request.email}`}>{request.email}</a>
      <a href={`https://wa.me/${request.phone.replace("+", "")}`} target="_blank" rel="noreferrer">
        {request.phone}
      </a>
    </span>
  );
}

export default async function MembersPage() {
  await requireUser();
  // Página exclusiva de administradores: para los demás no existe.
  if (!(await isAdmin())) notFound();
  const { pending, reviewed } = await getMembershipRequests();

  return (
    <div className={`container ${styles.wrap}`}>
      <Link href="/" className={styles.back}>
        ← Volver al libro
      </Link>
      <div className={styles.card}>
        <h1 className={styles.title}>Miembros</h1>
        <p className={styles.note}>
          Personas que pidieron entrar al libro. Al admitir a alguien se crea su cuenta y le llega un correo con su
          contraseña inicial.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            En espera {pending.length > 0 && <span className={styles.count}>{pending.length}</span>}
          </h2>
          {pending.length === 0 ? (
            <p className={styles.empty}>No hay solicitudes nuevas.</p>
          ) : (
            <ul className={styles.list}>
              {pending.map((r) => (
                <li key={r.id} className={styles.request}>
                  <span className={styles.avatar} aria-hidden="true">
                    {r.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.info}>
                    <strong className={styles.nick}>{r.nickname}</strong>
                    <Contact request={r} />
                    <span className={styles.date}>Pidió entrar el {dateTime(r.createdAt)}</span>
                  </span>
                  <RequestActions id={r.id} nickname={r.nickname} email={r.email} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {reviewed.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Respondidas</h2>
            <ul className={styles.list}>
              {reviewed.map((r) => (
                <li key={r.id} className={styles.request}>
                  <span className={styles.info}>
                    <strong className={styles.nick}>{r.nickname}</strong>
                    <Contact request={r} />
                  </span>
                  <span className={r.status === "approved" ? styles.approved : styles.rejected}>
                    {r.status === "approved" ? "Admitido" : "Rechazado"}
                    {r.reviewedAt && <small> · {dateTime(r.reviewedAt)}</small>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
