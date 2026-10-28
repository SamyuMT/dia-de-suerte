-- Páginas del libro (recuerdos). Solo usuarios con sesión pueden leerlas o editarlas.

create table public.memories (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title              text not null check (length(trim(title)) > 0),
  date               date not null default current_date,
  excerpt            text not null default '',
  content            text[] not null default '{}',
  greeting           text,
  signature          text,
  decoration         text check (decoration in ('clavel')),
  decoration_caption text,
  tags               text[] not null default '{}',
  published          boolean not null default true,
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index memories_date_idx on public.memories (date desc);

-- updated_at automático
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

-- Seguridad: nada es público
alter table public.memories enable row level security;

revoke all on public.memories from anon;
grant select, insert, update, delete on public.memories to authenticated;

create policy "Usuarios con sesión leen las páginas"
  on public.memories for select to authenticated using (true);

create policy "Usuarios con sesión crean páginas"
  on public.memories for insert to authenticated with check (true);

create policy "Usuarios con sesión editan páginas"
  on public.memories for update to authenticated using (true) with check (true);

create policy "Usuarios con sesión borran páginas"
  on public.memories for delete to authenticated using (true);

-- Primer recuerdo (antes vivía en src/data/memories.ts)
insert into public.memories
  (slug, title, date, excerpt, greeting, content, signature, decoration, decoration_caption, tags, created_by)
values (
  'un-buen-dia-para-ti-solecito',
  'Un buen día para ti, solecito',
  '2026-10-27',
  'Espero que hoy tengas un día bonito y que recuerdes lo fuerte que eres. Te mando una flor virtual. 🌷',
  'Buenos días 🌷',
  array[
    'Espero que hoy tengas un día bonito y que, incluso si las cosas se ponen difíciles, recuerdes lo fuerte que eres y todo lo que eres capaz de lograr. Confío en que podrás con lo que venga, paso a paso y a tu manera.',
    'Te mando una flor virtual, para recordarte que hay alguien que te piensa con cariño, incluso desde la distancia. 🌷',
    'Espero que hoy encuentres algún motivo para sonreír, que la vida te trate bonito y que no olvides lo mucho que vales.'
  ],
  'Un abrazo de esos que hacen bien. ❤️',
  'clavel',
  'Una flor para ti, solecito',
  array['buenos días', 'cariño'],
  null
)
on conflict (slug) do nothing;
