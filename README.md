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
- Cada página tiene una visibilidad: **borrador** (solo tú), **miembros** (todos con cuenta),
  **personas elegidas** (solo quienes marques) o **pública con enlace** (cualquiera con el link).
- Solo quien escribió una página puede editarla o borrarla. Lo controla el RLS de Supabase.
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
