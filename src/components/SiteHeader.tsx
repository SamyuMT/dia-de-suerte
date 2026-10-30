import Link from "next/link";
import { logout } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPendingMembershipCount, isAdmin } from "@/lib/membership";
import { getMyProfile, getPendingRequestCount } from "@/lib/profiles";
import Clover from "./Clover";
import MobileMenu, { type NavLink } from "./MobileMenu";
import styles from "./SiteHeader.module.css";

export default async function SiteHeader() {
  const user = await getCurrentUser();
  const [profile, pending, admin] = user
    ? await Promise.all([getMyProfile(), getPendingRequestCount(), isAdmin()])
    : [null, 0, false];
  const waiting = admin ? await getPendingMembershipCount() : 0;
  // Cuentas creadas por un administrador: deben cambiar la contraseña que les enviaron.
  const mustChangePassword = Boolean(user?.user_metadata?.must_change_password);

  const links: NavLink[] = [
    { href: "/", label: "Inicio" },
    { href: "/#paginas", label: "Recuerdos" },
    { href: "/admin", label: "Crear", highlight: true },
    { href: "/amigos", label: "Amigos", badge: pending },
    ...(admin ? [{ href: "/miembros", label: "Miembros", badge: waiting }] : []),
    { href: "/cuenta", label: "Mi cuenta" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.cloth} />
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Clover size={30} />
          <span>Día de Suerte</span>
        </Link>
        {user && (
          <>
            <nav className={styles.nav} aria-label="Principal">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={link.highlight ? styles.create : undefined}>
                  {link.label}
                  {link.badge ? <span className={styles.badge}>{link.badge}</span> : null}
                </Link>
              ))}
              <form action={logout}>
                <button type="submit" className={styles.logout}>
                  Salir
                </button>
              </form>
            </nav>
            <MobileMenu links={links} nickname={profile?.displayName ?? ""} />
          </>
        )}
      </div>
      {mustChangePassword && (
        <p className={styles.reminder}>
          🗝️ Estás usando la contraseña que te enviaron.{" "}
          <Link href="/cuenta">Cámbiala en Mi cuenta</Link> para que solo tú la sepas.
        </p>
      )}
    </header>
  );
}
