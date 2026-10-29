import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/** Rutas abiertas sin sesión. Todo lo demás es privado. */
const PUBLIC_PATHS = ["/login", "/recuperar"];

/**
 * Rutas que se dejan pasar sin sesión porque la página decide:
 * un recuerdo "public" se ve con el enlace; si no, la página manda al login.
 */
const OPEN_PREFIXES = ["/recuerdos/"];

/**
 * Refresca la sesión de Supabase en cada petición y redirige al login
 * a cualquiera que no haya iniciado sesión.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });

  // No poner código entre createServerClient y getClaims: puede cerrar la sesión al azar.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isPublic && !isLoggedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(loginUrl, response);
  }

  if (pathname === "/login" && isLoggedIn) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return redirectWithCookies(homeUrl, response);
  }

  return response;
}

/** Redirige conservando las cookies de sesión que Supabase haya refrescado. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
