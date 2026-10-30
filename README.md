# Día de Suerte

Libro de aventuras virtual y privado para guardar recuerdos vividos (y por vivir) con esa persona especial.
Funciona como un pequeño CMS: se inicia sesión, se lee el libro y desde **Crear** se escriben y editan las páginas.

Hecho con **Next.js 16 (App Router) + React 19 + TypeScript**, CSS Modules y **Supabase** (Postgres + Auth).

## Puesta en marcha

1. Instala dependencias: `npm install`
2. Copia `.env.example` como `.env.local` y pon la URL y la *publishable key* de tu proyecto de Supabase
   (Project Settings → API Keys).
3. Aplica las migraciones de `supabase/migrations/`: se aplican solas con la integración de GitHub de Supabase
   al hacer push a `main`, o puedes pegar el SQL en el **SQL Editor** del dashboard.
4. Crea los usuarios en Supabase: **Authentication → Users → Add user** (marca *Auto Confirm User*).
   No hay registro público.
5. `npm run dev` y abre http://localhost:3000

## Comandos

```bash
npm run dev     # servidor de desarrollo en http://localhost:3000
npm run build   # build de producción
npm start       # servir el build
```

## Cómo funciona

- **Privado por defecto**: sin sesión, todo redirige a `/login` (`src/proxy.ts`), salvo las páginas marcadas como públicas.
- Al entrar se ve el libro (`/`). En el menú, **Crear** abre el panel `/admin` con tus páginas.
- Al crear eliges el tipo de recuerdo: **pensamiento**, **álbum de fotos**, **disco** (canción que se reproduce)
  o **GIF**. Cada recuerdo tiene una o varias páginas y en cada página puedes mezclar texto, fotos, canciones,
  GIFs y el clavel. El editor muestra la vista previa del libro mientras escribes.
- Las fotos, GIFs y canciones se guardan en Supabase Storage (bucket privado `media`).
- Cada recuerdo tiene una visibilidad: **borrador** (solo tú), **mis amigos**, **amigos elegidos**
  o **público con enlace** (cualquiera con el link). Máximo 4 fotos por página.
- **Amigos**: escribes el apodo exacto de alguien y, si existe, le envías una solicitud; cuando la acepta,
  pueden compartirse recuerdos. Nadie puede ver la lista de usuarios ni tu correo, solo tu apodo.
- Solo quien escribió un recuerdo puede editarlo o borrarlo. Lo controla el RLS de Supabase.
- **Pedir entrar**: en `/solicitar` cualquiera deja su apodo, correo y teléfono. No se crea la cuenta: el
  administrador la revisa en **Miembros**, pone una contraseña inicial y a la persona le llega un correo de
  bienvenida. Requiere `SUPABASE_SECRET_KEY`, `SMTP_USER` y `SMTP_PASSWORD` (ver `.env.example`).
- ¿Olvidaste la contraseña? En `/recuperar` te llega un código al correo. En **Mi cuenta** cambias tu nombre
  y tu contraseña, o cierras sesión.
- Deploy: Vercel, conectado a GitHub (cada push a `main` publica).

## Estructura

```
src/
├─ proxy.ts                  Protege todas las rutas (sesión de Supabase)
├─ app/
│  ├─ page.tsx               El libro  →  /
│  ├─ recuerdos/[slug]/      Una página del libro  →  /recuerdos/:slug
│  ├─ login/                 Inicio de sesión  →  /login
│  └─ admin/                 CMS  →  /admin, /admin/nueva, /admin/:id
├─ components/               BookCover, Polaroid, MemoryCard, Carnation, SiteHeader, ...
├─ lib/
│  ├─ memories.ts            Capa de datos (consultas a Supabase)
│  ├─ auth.ts                Usuario actual / requireUser
│  └─ supabase/              Clientes de Supabase (servidor y proxy)
└─ types/memory.ts           Tipo Memory
supabase/migrations/         Esquema de la base de datos (SQL)
```

## Próximos pasos

- Subir fotos a los recuerdos (Supabase Storage).
- Aventuras por vivir y línea de tiempo.
- Deploy en Vercel.
