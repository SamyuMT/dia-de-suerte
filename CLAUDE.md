# Día de Suerte

Plataforma privada para guardar recuerdos con una persona especial, con estética de **libro de aventuras**
(cuero, pergamino, polaroids, esquineros de álbum, cinta adhesiva, letra manuscrita).
Cada "página" es un recuerdo: un mensaje, un momento vivido o una aventura por vivir.
Funciona como un **CMS**: las páginas se crean y editan desde `/admin` y se guardan en Supabase.
Todo el contenido y la UI van en **español**.

## Stack y comandos

- Next.js 16 (App Router) + React 19 + TypeScript, estilos con **CSS Modules** (sin Tailwind ni librerías de UI).
- Supabase (Postgres + Auth) con `@supabase/ssr` y `@supabase/supabase-js`.
- Fuentes con `next/font/google`: Playfair Display (títulos), Lora (texto), Caveat (manuscrita).
- Repo: https://github.com/SamyuMT/dia-de-suerte (rama `main`). Proyecto Supabase: ref `muzkgchxtwntbgbolubh`, conectado al repo por la integración de GitHub.
- Vercel: proyecto `dia-de-suerte` (https://dia-de-suerte.vercel.app), conectado a GitHub: **cada push a `main` despliega a producción**. Las variables `NEXT_PUBLIC_SUPABASE_*` ya están en Vercel (tipo Config, los 3 entornos). CLI: `npx vercel@latest ...` (sesión iniciada como samyumt).
- **Antes de hacer push con cambios de esquema, la migración debe estar aplicada en Supabase**, o producción se rompe.

```bash
npm run dev     # http://localhost:3000
npm run build   # verificar siempre que compile después de cambios
```

## Estructura

```
src/
├─ proxy.ts                    "Middleware" de Next 16: refresca la sesión y manda a /login si no hay sesión
├─ app/
│  ├─ layout.tsx               Fuentes, header, footer, metadata (título "Libro de aventuras - Día de Suerte")
│  ├─ icon.svg                 Favicon (trébol)
│  ├─ globals.css              Tokens de color (--leather, --paper, --cloth, --letter-1..8, --noise...) y textura
│  ├─ page.tsx                 Home (el libro): portada, explicación, lista de páginas publicadas
│  ├─ recuerdos/[slug]/        Página de un recuerdo (libro abierto, dinámica)
│  ├─ login/                   page, LoginForm (client), actions.ts (login / logout)
│  ├─ admin/                   CMS: listado (page), nueva/, [id]/ (editar), MemoryForm, DeleteButton, actions.ts
│  └─ not-found.tsx
├─ components/                 BookCover, Polaroid, MemoryCard, Carnation, Clover, SiteHeader, SiteFooter
├─ lib/
│  ├─ memories.ts              Capa de datos (Supabase): getMemories, getMyMemories, getMemoryBySlug,
│  │                           getMyMemoryById, getOtherProfiles, createMemory, updateMemory, deleteMemory
│  ├─ auth.ts                  getCurrentUser(), requireUser(), safeNextPath()
│  ├─ supabase/                env.ts, server.ts (createClient por petición), proxy.ts (updateSession)
│  └─ format.ts                formatDate() en español
└─ types/memory.ts             Memory, MemoryInput, Profile, MEMORY_VISIBILITIES, VISIBILITY_LABELS
supabase/
├─ config.toml                 Generado por `supabase init`
└─ migrations/                 SQL versionado (fuente de verdad del esquema)
```

## Auth y privacidad

- **Privado por defecto.** `src/lib/supabase/proxy.ts` deja pasar sin sesión `PUBLIC_PATHS` (`/login`) y `OPEN_PREFIXES` (`/recuerdos/`); todo lo demás redirige a `/login?next=...`. En `/recuerdos/[slug]` decide el RLS: si la página es `public` se ve sin sesión; si no, la página redirige al login. Con sesión, `/login` redirige al libro (`/`).
- Email + contraseña con Supabase Auth. **Solo login, sin registro**: los usuarios se crean en el dashboard de Supabase (Authentication → Users → Add user → marcar *Auto Confirm User*).
- Variables en `.env.local` (ver `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Header (`SiteHeader`, server component): con sesión muestra Inicio · Recuerdos · **Crear** (→ `/admin`) · Salir. Sin sesión solo la marca.
- Las páginas de `/admin` y las server actions llaman además a `requireUser()` (no confiar solo en el proxy).

## Base de datos

- `public.memories`: `id uuid`, `slug` (único, kebab-case), `title`, `date`, `excerpt`, `content text[]` (párrafos), `greeting`, `signature`, `decoration` (`'clavel'` o null), `decoration_caption`, `tags text[]`, `visibility`, `created_by` (autor, default `auth.uid()`), `created_at`, `updated_at` (trigger).
- `visibility` (enum `memory_visibility`): `draft` (solo el autor) · `members` (todos con sesión) · `selected` (autor + usuarios en `memory_viewers`) · `public` (cualquiera con el enlace, también `anon`).
- `public.memory_viewers (memory_id, user_id)`: usuarios elegidos para páginas `selected`. Solo el autor de la página los gestiona.
- `public.profiles (id, email, display_name)`: directorio de usuarios; se llena con el trigger `on_auth_user_created` (función `private.handle_new_user`).
- **RLS**: cada uno ve lo suyo + lo que le comparten; **solo el autor crea a su nombre, edita y borra**. Helper `private.is_memory_owner()` (security definer) evita recursión entre políticas. El esquema `private` no se expone en la API.
- El libro (`/`) muestra todo lo visible menos borradores; el panel (`/admin`) solo las páginas propias.
- Los cambios de esquema van **siempre** como migración nueva en `supabase/migrations/<timestamp>_<nombre>.sql` (nunca editar una migración ya aplicada). El historial está en `supabase_migrations.schema_migrations`; si una migración se aplica a mano (SQL Editor), registrar su versión ahí para que "Deploy to production" de la integración de GitHub no intente repetirla.
- MCP de Supabase en `.mcp.json` (servidor HTTP oficial, `project_ref` fijo; autenticar con `/mcp`). Lee y ejecuta SQL no destructivo; **las operaciones destructivas (drop) se rechazan desde la extensión de VS Code**, así que esas migraciones las pega el usuario en el SQL Editor.

## Convenciones

- **Las páginas nunca consultan Supabase directamente**: siempre pasan por `src/lib/memories.ts` (mapea snake_case ↔ camelCase).
- Crear un cliente de Supabase **por petición** (`await createClient()` de `src/lib/supabase/server.ts`).
- Formularios: server actions + `useActionState`; el estado devuelve los valores enviados y un `attempt` que se usa como `key` del form para no perder lo escrito si hay error.
- En el formulario del CMS, los párrafos se separan con una línea en blanco; el slug y el resumen se generan solos si se dejan vacíos.
- Cada componente tiene su `Componente.module.css` al lado. Los colores salen de las variables de `globals.css`. Las texturas son CSS (`var(--noise)` es ruido SVG en data URI), sin imágenes externas.
- `Carnation.tsx` es un client component. Los pétalos se generan con un PRNG de **semilla fija** para que el HTML del servidor y del cliente coincidan; no usar `Math.random()` en render. Las animaciones usan `transform-box: fill-box` y respetan `prefers-reduced-motion`.
- Estética inspirada en álbumes de aventuras, pero con identidad propia: no usar logos, imágenes ni textos de películas existentes.

## Hecho

- Home con portada de libro de cuero ("DÍA DE SUERTE" en letras de colores, medallón con trébol), sección "¿Qué guarda este libro?" con 3 polaroids y lista de páginas.
- Primer recuerdo: **"Un buen día para ti, solecito"** (27-10-2026), con clavel SVG que florece y botón "Volver a florecer". Ahora vive en la base (insertado por la migración inicial).
- Diseño responsive (en móvil, el libro abierto pasa a una columna), página 404 y favicon del trébol.
- Conexión a Supabase, login con email/contraseña, cierre de sesión, sitio 100 % privado.
- CMS en `/admin`: listar tus páginas, crear, editar, borrar (con confirmación) y elegir visibilidad (borrador, miembros, personas elegidas, pública con enlace).
- Migraciones: `20261028120000_create_memories.sql` (tabla, RLS, trigger, primer recuerdo) y `20261028150000_memory_visibility_and_ownership.sql` (visibilidad, autoría, profiles, memory_viewers, nuevas políticas).
- Deploy en Vercel conectado a GitHub, con las variables de Supabase.

## Pendiente / próximos pasos

- Subir fotos (Supabase Storage, bucket privado) y recuerdos con fotos.
- Más tipos de páginas: aventuras por vivir, línea de tiempo.
- Botón "copiar enlace" para páginas públicas y editar el nombre visible del perfil.
- Activar "Deploy to production" en la integración de GitHub de Supabase (el historial ya está sincronizado).
- Activar "Leaked password protection" en Supabase Auth (aviso del advisor).
- No hay tests todavía.

## Notas del entorno (Windows)

- En el tool Bash, los heredocs largos con comillas pueden fallar; para crear archivos usar la herramienta Write.
- PowerShell 5.1 muestra los UTF-8 con caracteres raros (`Ã­`); los archivos están bien.
- `gh` no está instalado; el push se hace con `git push`.
- Supabase CLI: `npx supabase@latest ...` (no está instalada globalmente).
- Para capturas: Edge headless (`msedge --headless=new --screenshot=... --virtual-time-budget=8000`). Tiene un ancho mínimo de ventana, así que para ver móvil hay que cargar la página dentro de un `<iframe width="390">`.
