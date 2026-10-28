# Día de Suerte

Plataforma para guardar recuerdos con una persona especial, con estética de **libro de aventuras**
(cuero, pergamino, polaroids, esquineros de álbum, cinta adhesiva, letra manuscrita).
Cada "página" o "foro" es un recuerdo: un mensaje, un momento vivido o una aventura por vivir.
Todo el contenido y la UI van en **español**.

## Stack y comandos

- Next.js 16 (App Router) + React 19 + TypeScript, estilos con **CSS Modules** (sin Tailwind ni librerías de UI).
- Fuentes con `next/font/google`: Playfair Display (títulos), Lora (texto), Caveat (manuscrita).

```bash
npm run dev     # http://localhost:3000
npm run build   # verificar siempre que compile después de cambios
```

## Estructura

```
src/
├─ app/
│  ├─ layout.tsx               Fuentes, header, footer, metadata (título "Libro de aventuras - Día de Suerte")
│  ├─ icon.svg                 Favicon (trébol)
│  ├─ globals.css              Tokens de color (--leather, --paper, --cloth, --letter-1..8, --noise...) y textura
│  ├─ page.tsx                 Home: portada, explicación del sitio, lista de recuerdos
│  ├─ recuerdos/[slug]/        Página de un recuerdo (libro abierto, SSG con generateStaticParams)
│  └─ not-found.tsx
├─ components/                 BookCover, Polaroid, MemoryCard, Carnation, Clover, SiteHeader, SiteFooter
├─ data/memories.ts            Recuerdos guardados (temporal)
├─ lib/memories.ts             Capa de datos async: getMemories(), getMemoryBySlug()
├─ lib/format.ts               formatDate() en español
└─ types/memory.ts             Tipo Memory
```

## Convenciones

- **Las páginas nunca importan `src/data` directamente**: siempre pasan por `src/lib/memories.ts`. Así, al conectar una base de datos solo cambia ese archivo.
- Cada componente tiene su `Componente.module.css` al lado. Los colores salen de las variables de `globals.css`. Las texturas son CSS (`var(--noise)` es ruido SVG en data URI), sin imágenes externas.
- Para publicar un recuerdo, agrega un objeto a `src/data/memories.ts` con un `slug` único. `decoration: "clavel"` + `decorationCaption` muestran el clavel animado.
- `Carnation.tsx` es un client component. Los pétalos se generan con un PRNG de **semilla fija** para que el HTML del servidor y del cliente coincidan; no usar `Math.random()` en render. Las animaciones usan `transform-box: fill-box` y respetan `prefers-reduced-motion`.
- Estética inspirada en álbumes de aventuras, pero con identidad propia: no usar logos, imágenes ni textos de películas existentes.

## Hecho

- Home con portada de libro de cuero ("DÍA DE SUERTE" en letras de colores, medallón con trébol), sección "¿Qué guarda este libro?" con 3 polaroids y lista de páginas.
- Primer recuerdo: **"Un buen día para ti, solecito"** (27-10-2026), en `/recuerdos/un-buen-dia-para-ti-solecito`, con un clavel SVG que florece (tallo, hojas, cáliz, ~60 pétalos dentados, destellos, balanceo) y un botón "Volver a florecer".
- Diseño responsive (en móvil, el libro abierto pasa a una columna), página 404 y favicon del trébol.

## Pendiente / próximos pasos

- Base de datos (p. ej. Prisma + PostgreSQL o Supabase) reemplazando `src/lib/memories.ts`.
- API routes en `src/app/api/.../route.ts`.
- Login (Auth.js o Supabase Auth) y protección de rutas con `src/middleware.ts`.
- Panel `/admin` para crear y editar recuerdos y subir fotos.
- Más tipos de páginas: recuerdos con fotos, aventuras por vivir, línea de tiempo.
- Deploy (Vercel).
- No hay git ni tests todavía.

## Notas del entorno (Windows)

- En el tool Bash, los heredocs largos con comillas pueden fallar; para crear archivos usar la herramienta Write.
- Para capturas: Edge headless (`msedge --headless=new --screenshot=... --virtual-time-budget=8000`). Tiene un ancho mínimo de ventana, así que para ver móvil hay que cargar la página dentro de un `<iframe width="390">`.
