# Día de Suerte

Plataforma privada para guardar recuerdos con una persona especial, con estética de **libro de aventuras**
(cuero, pergamino, polaroids, esquineros de álbum, cinta adhesiva, letra manuscrita).
Cada **recuerdo** ocupa una o varias **páginas** del libro (se leen de dos en dos) y cada página tiene **bloques**:
texto/pensamiento, fotos (álbum), canción (disco de vinilo que se reproduce), GIF o el clavel animado.
Funciona como un **CMS**: los recuerdos se crean y editan desde `/admin` y se guardan en Supabase.
Todo el contenido y la UI van en **español**.

## Stack y comandos

- Next.js 16 (App Router) + React 19 + TypeScript, estilos con **CSS Modules** (sin Tailwind ni librerías de UI).
- Supabase (Postgres + Auth + Storage) con `@supabase/ssr` y `@supabase/supabase-js`.
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
│  ├─ globals.css              Tokens de color (--leather, --paper, --cloth, --letter-1..8, --noise...) y textura
│  ├─ page.tsx                 Home (el libro): portada, explicación, tarjetas de recuerdos visibles
│  ├─ recuerdos/[slug]/        Un recuerdo abierto como libro (BookView)
│  ├─ login/                   page, LoginForm (client), actions.ts (login / logout)
│  ├─ recuperar/               Recuperar contraseña con código OTP al correo (2 pasos)
│  ├─ cuenta/                  Mi cuenta: nombre visible, cambiar contraseña, cerrar sesión
│  ├─ admin/                   CMS: listado (page), nueva/ (elegir tipo → editor), [id]/ (editar),
│  │  │                        DeleteButton, actions.ts (saveMemoryAction, removeMemory, registerMediaAction)
│  │  └─ editor/               MemoryEditor (vista previa + páginas), BlockEditor, MediaPicker,
│  │                           upload.ts (sube al bucket desde el navegador), templates.ts
│  └─ not-found.tsx
├─ components/
│  ├─ book/                    BookView (dobles páginas, pasar página), BookPage, TextBlock, PhotosBlock,
│  │                           MusicDisc (vinilo + <audio>), GifBlock. Se usan en lectura y en la vista previa.
│  └─ BookCover, Polaroid, MemoryCard, Carnation, Clover, SiteHeader, SiteFooter
├─ lib/
│  ├─ memories.ts              Recuerdos: getMemories, getMyMemories, getMemoryBySlug, getMyMemoryById,
│  │                           saveMemory (rpc save_memory), deleteMemory
│  ├─ media.ts                 Archivos: getMyMedia, registerMedia, signMedia (URLs firmadas 1 h)
│  ├─ profiles.ts              getOtherProfiles, getMyProfile, updateMyDisplayName
│  ├─ passwords.ts             Reglas y mensajes de contraseña
│  ├─ auth.ts                  getCurrentUser(), requireUser(), safeNextPath()
│  ├─ supabase/                env.ts, server.ts, browser.ts (subidas), proxy.ts (updateSession)
│  └─ format.ts                formatDate() en español
└─ types/memory.ts             Memory, MemoryPage, MemoryBlock, MediaItem, MemoryInput, Profile, KIND_INFO, BLOCK_INFO...
supabase/
├─ config.toml                 Generado por `supabase init`
└─ migrations/                 SQL versionado (fuente de verdad del esquema)
```

## Auth y privacidad

- **Privado por defecto.** `src/lib/supabase/proxy.ts` deja pasar sin sesión `PUBLIC_PATHS` (`/login`, `/recuperar`) y `OPEN_PREFIXES` (`/recuerdos/`); todo lo demás redirige a `/login?next=...`. En `/recuerdos/[slug]` decide el RLS: si es `public` se ve sin sesión; si no, redirige al login.
- Email + contraseña con Supabase Auth. **Sin registro**: los usuarios se crean en el dashboard (Authentication → Users → Add user → *Auto Confirm User*).
- **Recuperar contraseña**: `resetPasswordForEmail` → el usuario escribe el código de 6 dígitos → `verifyOtp({ type: "recovery" })` → `updateUser({ password })`. Requiere que la plantilla **Reset password** de Supabase incluya `{{ .Token }}`. El SMTP por defecto de Supabase solo envía a miembros del equipo del proyecto y con límite muy bajo: para otros usuarios hace falta **SMTP propio** (p. ej. Resend) en Authentication → SMTP.
- Cambiar contraseña en `/cuenta` pide la actual (se verifica con `signInWithPassword`).
- Header: con sesión muestra Inicio · Recuerdos · **Crear** (→ `/admin`) · Mi cuenta · Salir.
- Las páginas de `/admin`, `/cuenta` y las server actions llaman a `requireUser()` (no confiar solo en el proxy).

## Base de datos

```
memories ─┬─ memory_pages (position) ── memory_blocks (position, type) ── block_media (position) ── media
          └─ memory_viewers (usuarios elegidos)            profiles (directorio de usuarios)
```

- `memories`: `slug` (único, kebab-case), `title`, `date`, `excerpt`, `tags`, `visibility`, `kind` (`pensamiento|album|disco|gif`, tipo principal/plantilla), `created_by`.
- `visibility`: `draft` (solo el autor) · `members` (todos con sesión) · `selected` (autor + `memory_viewers`) · `public` (cualquiera, también `anon`).
- `memory_blocks.type`: `text` (heading, body, caption) · `photos` (1–12 imágenes/gifs) · `music` (track_title obligatorio, 1 audio) · `gif` (1 gif) · `decoration` (`'clavel'` + caption). `body` separa párrafos con línea en blanco.
- `media`: archivos del usuario en Storage, bucket privado **`media`**, ruta `<user_id>/<uuid>.<ext>`, máx. 50 MB, tipos de imagen/gif/audio. `source` `upload|google_photos` (+ `external_id`), preparado para importar de Google Fotos.
- **Escritura**: páginas, bloques y `block_media` NO tienen permisos de insert/update para los usuarios; solo se escriben con **`save_memory(p_memory_id, p_memory, p_pages, p_viewer_ids)`** (security definer): comprueba autoría, valida tipos/cantidades de archivos, reemplaza páginas y visores en una transacción. `memories` se borra directo (RLS: solo el autor).
- **Lectura**: RLS con helpers `private.can_view_memory()`, `private.can_view_media()`, `private.can_view_media_object()` (security definer). Las imágenes/audio se sirven con **URLs firmadas** (1 h) creadas en el servidor con la sesión del visitante.
- `profiles`: se llena con el trigger `on_auth_user_created`; cada uno edita su `display_name`.
- Los cambios de esquema van **siempre** como migración nueva en `supabase/migrations/<timestamp>_<nombre>.sql`. Si una migración se aplica a mano (SQL Editor), registrar su versión en `supabase_migrations.schema_migrations`.
- MCP de Supabase en `.mcp.json`. Lee y ejecuta SQL no destructivo; **las operaciones destructivas (drop/delete) se rechazan desde la extensión de VS Code**, así que esas migraciones las pega el usuario en el SQL Editor.

## Convenciones

- **Las páginas nunca consultan Supabase directamente**: pasan por `src/lib/*.ts` (mapean snake_case ↔ camelCase).
- Crear un cliente de Supabase **por petición** (`await createClient()` de `src/lib/supabase/server.ts`). En el navegador solo se usa `browser.ts` para subir archivos a Storage (evita el límite de tamaño de las server actions de Vercel).
- Formularios simples: server actions + `useActionState` (+ `attempt` como `key` para no perder lo escrito). El editor de recuerdos mantiene el estado en el cliente y llama a `saveMemoryAction` con un objeto `MemoryInput`.
- Cada componente tiene su `Componente.module.css` al lado. Los colores salen de las variables de `globals.css`. Las texturas son CSS (`var(--noise)`), sin imágenes externas.
- Sin `Math.random()` en render (servidor y cliente deben coincidir): `Carnation` usa PRNG con semilla fija y `PhotosBlock` inclinaciones fijas. Animaciones respetan `prefers-reduced-motion` (el vinilo se detiene).
- Estética inspirada en álbumes de aventuras, pero con identidad propia: no usar logos, imágenes ni textos de películas existentes.

## Hecho

- Home con portada de libro de cuero, sección "¿Qué guarda este libro?" y tarjetas con icono del tipo.
- Primer recuerdo: **"Un buen día para ti, solecito"** (27-10-2026), texto en la página 1 y clavel en la página 2.
- Login, recuperar contraseña con código, Mi cuenta (nombre, contraseña, salir). Sitio privado por defecto.
- CMS en `/admin`: elegir tipo (pensamiento, álbum, disco, GIF), editor con vista previa del libro, varias páginas, mover bloques entre páginas, subir archivos o elegirlos de la biblioteca, visibilidad y personas elegidas, borrar.
- Migraciones: `20261028120000_create_memories`, `20261028150000_memory_visibility_and_ownership`, `20261029120000_pages_blocks_media` (páginas, bloques, media, Storage, save_memory).
- Deploy en Vercel conectado a GitHub.

## Pendiente / próximos pasos

- **Google Fotos**: con el Picker API (la Library API ya no permite leer álbumes del usuario desde 2025). Requiere proyecto en Google Cloud + OAuth (scope `photospicker.mediaitems.readonly`); las fotos elegidas se copian a Storage como `media` con `source = 'google_photos'`.
- SMTP propio en Supabase para que los correos de recuperación lleguen a todos.
- Borrar archivos de la biblioteca que no se usen; botón "copiar enlace" para recuerdos públicos.
- Activar "Deploy to production" en la integración de GitHub de Supabase y "Leaked password protection" en Auth.
- No hay tests todavía.

## Notas del entorno (Windows)

- En el tool Bash, los heredocs largos con comillas pueden fallar; para crear archivos usar la herramienta Write.
- PowerShell 5.1 muestra los UTF-8 con caracteres raros (`Ã­`); los archivos están bien.
- `gh` no está instalado; el push se hace con `git push`.
- Supabase CLI: `npx supabase@latest ...` (no está instalada globalmente).
- Para capturas: Edge headless (`msedge --headless=new --screenshot=... --virtual-time-budget=8000`). Tiene un ancho mínimo de ventana, así que para ver móvil hay que cargar la página dentro de un `<iframe width="390">`. Para revisar componentes sin sesión, crear una ruta temporal bajo `/recuerdos/` (el proxy la deja pasar) y borrarla después.
