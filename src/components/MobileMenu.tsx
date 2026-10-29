"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import Clover from "./Clover";
import styles from "./MobileMenu.module.css";

export interface NavLink {
  href: string;
  label: string;
  highlight?: boolean;
  /** Número de avisos (p. ej. solicitudes de amistad) */
  badge?: number;
}

/** Menú lateral para celular y tablet: botón ☰ y panel que entra desde la derecha. */
export default function MobileMenu({ links, nickname }: { links: NavLink[]; nickname: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const pending = links.reduce((n, l) => n + (l.badge ?? 0), 0);

  // Se cierra al cambiar de página.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls="menu-lateral"
      >
        <span className={styles.bars} aria-hidden="true" />
        {pending > 0 && <span className={styles.dot} aria-label={`${pending} avisos`} />}
      </button>

      <div className={`${styles.overlay} ${open ? styles.visible : ""}`} onClick={() => setOpen(false)} />

      <aside
        id="menu-lateral"
        className={`${styles.panel} ${open ? styles.open : ""}`}
        aria-label="Menú"
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.head}>
          <span className={styles.brand}>
            <Clover size={26} />
            Día de Suerte
          </span>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        {nickname && <p className={styles.who}>Hola, {nickname}</p>}

        <nav className={styles.links} aria-label="Principal">
          {links.map((link) => {
            const active = link.href === pathname || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${link.highlight ? styles.highlight : ""} ${active ? styles.active : ""}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
                {link.badge ? <span className={styles.badge}>{link.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <form action={logout} className={styles.logoutRow}>
          <button type="submit" className={styles.logout}>
            Cerrar sesión
          </button>
        </form>
      </aside>
    </>
  );
}
