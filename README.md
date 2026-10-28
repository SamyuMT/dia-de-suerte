# Día de Suerte

Libro de aventuras virtual para guardar recuerdos vividos (y por vivir) con esa persona especial.

Hecho con **Next.js (App Router) + React + TypeScript** y CSS Modules.

## Comandos

```bash
npm install     # instalar dependencias
npm run dev     # servidor de desarrollo en http://localhost:3000
npm run build   # build de producción
npm start       # servir el build
```

## Estructura

```
src/
├─ app/                      Rutas (cada carpeta = una URL)
│  ├─ layout.tsx             Layout global: fuentes, header, footer
│  ├─ page.tsx               Home  →  /
│  ├─ recuerdos/[slug]/      Página de un recuerdo  →  /recuerdos/:slug
│  └─ not-found.tsx          404
├─ components/               Componentes reutilizables (BookCover, Polaroid, Carnation, ...)
├─ data/memories.ts          Recuerdos guardados (temporal, hasta tener base de datos)
├─ lib/memories.ts           Capa de acceso a datos: getMemories / getMemoryBySlug
└─ types/memory.ts           Tipo Memory
```

## Publicar un nuevo recuerdo

Agrega un objeto al arreglo de `src/data/memories.ts` con un `slug` único. La página aparece
automáticamente en el home y en `/recuerdos/<slug>`.

## Próximos pasos

- **Base de datos**: reemplazar el contenido de `src/lib/memories.ts` por consultas (p. ej. Prisma + PostgreSQL o Supabase). Las páginas no cambian porque ya usan funciones `async`.
- **API**: crear rutas en `src/app/api/.../route.ts`.
- **Login**: agregar Auth.js (NextAuth) o Supabase Auth y proteger rutas con `src/middleware.ts`.
- **Admin**: crear `src/app/admin/` para escribir, editar y subir fotos a los recuerdos.
