-- Estructura del libro:
--   memories          una entrada (recuerdo) con título, fecha, visibilidad y tipo principal
--   └─ memory_pages   cada cara del libro; se leen de dos en dos
--      └─ memory_blocks   texto, fotos, música, gif o decoración
--         └─ block_media → media   archivos guardados en Storage (bucket "media")
--
-- Las páginas, bloques y su relación con archivos SOLO se escriben con save_memory(),
-- que comprueba la autoría, valida cada bloque y guarda todo en una transacción.

-- 1. Tipos
create type public.memory_kind as enum ('pensamiento', 'album', 'disco', 'gif');
create type public.block_type as enum ('text', 'photos', 'music', 'gif', 'decoration');
create type public.media_kind as enum ('image', 'gif', 'audio');
create type public.media_source as enum ('upload', 'google_photos');

alter table public.memories
  add column kind public.memory_kind not null default 'pensamiento';

-- 2. Archivos (fotos, gifs, canciones) de cada usuario
create table public.media (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind             public.media_kind not null,
  source           public.media_source not null default 'upload',
  storage_path     text not null unique,
  mime_type        text not null,
  size_bytes       bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  width            integer check (width > 0),
  height           integer check (height > 0),
  duration_seconds numeric(8, 2) check (duration_seconds > 0),
  original_name    text check (length(original_name) <= 255),
  external_id      text,
  created_at       timestamptz not null default now(),
  constraint media_path_in_owner_folder check (storage_path like owner_id::text || '/%'),
  constraint media_kind_matches_mime check (
    (kind = 'audio' and mime_type like 'audio/%')
    or (kind = 'gif' and mime_type = 'image/gif')
    or (kind = 'image' and mime_type like 'image/%' and mime_type <> 'image/gif')
  ),
  constraint media_external_id_by_source check ((source = 'upload') = (external_id is null))
);

create index media_owner_idx on public.media (owner_id, created_at desc);

-- 3. Páginas y bloques
create table public.memory_pages (
  id        uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  position  smallint not null check (position between 0 and 99),
  unique (memory_id, position)
);

create table public.memory_blocks (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references public.memory_pages (id) on delete cascade,
  position     smallint not null check (position between 0 and 49),
  type         public.block_type not null,
  heading      text check (length(heading) <= 200),
  body         text check (length(body) <= 10000),
  caption      text check (length(caption) <= 300),
  track_title  text check (length(track_title) <= 200),
  track_artist text check (length(track_artist) <= 200),
  decoration   text check (decoration in ('clavel')),
  unique (page_id, position),
  constraint text_block_has_body
    check (type <> 'text' or length(trim(coalesce(body, ''))) > 0),
  constraint music_block_has_title
    check (type <> 'music' or length(trim(coalesce(track_title, ''))) > 0),
  constraint decoration_only_on_decoration_block
    check ((type = 'decoration') = (decoration is not null))
);

create table public.block_media (
  block_id uuid not null references public.memory_blocks (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete restrict,
  position smallint not null check (position between 0 and 11),
  caption  text check (length(caption) <= 300),
  primary key (block_id, position),
  unique (block_id, media_id)
);

create index block_media_media_idx on public.block_media (media_id);

-- 4. Pasar el contenido actual a páginas y bloques
insert into public.memory_pages (memory_id, position)
select id, 0 from public.memories;

insert into public.memory_blocks (page_id, position, type, heading, body, caption)
select p.id, 0, 'text', m.greeting, array_to_string(m.content, E'\n\n'), m.signature
from public.memories m
join public.memory_pages p on p.memory_id = m.id and p.position = 0
where cardinality(m.content) > 0;

insert into public.memory_pages (memory_id, position)
select id, 1 from public.memories where decoration is not null;

insert into public.memory_blocks (page_id, position, type, decoration, caption)
select p.id, 0, 'decoration', m.decoration, m.decoration_caption
from public.memories m
join public.memory_pages p on p.memory_id = m.id and p.position = 1
where m.decoration is not null;

alter table public.memories
  drop column content,
  drop column greeting,
  drop column signature,
  drop column decoration,
  drop column decoration_caption;

-- 5. Quién puede ver una entrada (lo usan las políticas de páginas, bloques y archivos)
grant usage on schema private to anon;

create function private.can_view_memory(p_memory_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memories m
    where m.id = p_memory_id
      and (
        m.visibility = 'public'
        or (
          (select auth.uid()) is not null
          and (
            m.created_by = (select auth.uid())
            or m.visibility = 'members'
            or (
              m.visibility = 'selected'
              and exists (
                select 1 from public.memory_viewers v
                where v.memory_id = m.id and v.user_id = (select auth.uid())
              )
            )
          )
        )
      )
  );
$$;

create function private.can_view_media(p_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.block_media bm
    join public.memory_blocks b on b.id = bm.block_id
    join public.memory_pages p on p.id = b.page_id
    where bm.media_id = p_media_id and private.can_view_memory(p.memory_id)
  );
$$;

create function private.can_view_media_object(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.media md
    where md.storage_path = p_path and private.can_view_media(md.id)
  );
$$;

revoke execute on function private.can_view_memory(uuid) from public;
revoke execute on function private.can_view_media(uuid) from public;
revoke execute on function private.can_view_media_object(text) from public;
grant execute on function private.can_view_memory(uuid) to anon, authenticated;
grant execute on function private.can_view_media(uuid) to anon, authenticated;
grant execute on function private.can_view_media_object(text) to anon, authenticated;

-- 6. Permisos: páginas y bloques solo se leen; se escriben con save_memory()
alter table public.memory_pages enable row level security;
alter table public.memory_blocks enable row level security;
alter table public.block_media enable row level security;
alter table public.media enable row level security;

revoke all on public.memory_pages, public.memory_blocks, public.block_media, public.media
  from anon, authenticated;
grant select on public.memory_pages, public.memory_blocks, public.block_media, public.media
  to anon, authenticated;
grant insert, delete on public.media to authenticated;

create policy "Ver páginas de entradas visibles"
  on public.memory_pages for select to anon, authenticated
  using (private.can_view_memory(memory_id));

create policy "Ver bloques de entradas visibles"
  on public.memory_blocks for select to anon, authenticated
  using (
    exists (
      select 1 from public.memory_pages p
      where p.id = page_id and private.can_view_memory(p.memory_id)
    )
  );

create policy "Ver archivos de bloques visibles"
  on public.block_media for select to anon, authenticated
  using (
    exists (
      select 1
      from public.memory_blocks b
      join public.memory_pages p on p.id = b.page_id
      where b.id = block_id and private.can_view_memory(p.memory_id)
    )
  );

create policy "Ver tus archivos y los de entradas visibles"
  on public.media for select to anon, authenticated
  using (owner_id = (select auth.uid()) or private.can_view_media(id));

create policy "Registrar tus archivos"
  on public.media for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Borrar tus archivos"
  on public.media for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 7. Storage: bucket privado "media", una carpeta por usuario (<user_id>/archivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
    'audio/ogg', 'audio/wav', 'audio/webm', 'audio/flac'
  ]
)
on conflict (id) do nothing;

create policy "Subir archivos a tu carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Ver tus archivos y los de entradas visibles"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.can_view_media_object(name)
    )
  );

create policy "Borrar tus archivos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 8. Guardar una entrada completa (crear o editar) en una sola transacción
--   p_memory:  {slug, title, date, excerpt, tags[], visibility, kind}
--   p_pages:   [{blocks: [{type, heading, body, caption, trackTitle, trackArtist,
--                           decoration, media: [{id, caption}]}]}]
create function public.save_memory(
  p_memory_id uuid,
  p_memory jsonb,
  p_pages jsonb,
  p_viewer_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_id         uuid;
  v_visibility public.memory_visibility;
  v_page       jsonb;
  v_page_pos   bigint;
  v_page_id    uuid;
  v_block      jsonb;
  v_block_pos  bigint;
  v_block_id   uuid;
  v_type       public.block_type;
  v_item       jsonb;
  v_item_pos   bigint;
  v_kind       public.media_kind;
  v_count      integer;
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_pages) is distinct from 'array'
     or jsonb_array_length(p_pages) not between 1 and 100 then
    raise exception 'El recuerdo necesita entre 1 y 100 páginas.';
  end if;

  v_visibility := (p_memory ->> 'visibility')::public.memory_visibility;

  if p_memory_id is null then
    insert into public.memories (slug, title, date, excerpt, tags, visibility, kind, created_by)
    values (
      p_memory ->> 'slug',
      p_memory ->> 'title',
      (p_memory ->> 'date')::date,
      coalesce(p_memory ->> 'excerpt', ''),
      coalesce(array(select jsonb_array_elements_text(p_memory -> 'tags')), '{}'),
      v_visibility,
      (p_memory ->> 'kind')::public.memory_kind,
      v_uid
    )
    returning id into v_id;
  else
    update public.memories set
      slug       = p_memory ->> 'slug',
      title      = p_memory ->> 'title',
      date       = (p_memory ->> 'date')::date,
      excerpt    = coalesce(p_memory ->> 'excerpt', ''),
      tags       = coalesce(array(select jsonb_array_elements_text(p_memory -> 'tags')), '{}'),
      visibility = v_visibility,
      kind       = (p_memory ->> 'kind')::public.memory_kind
    where id = p_memory_id and created_by = v_uid
    returning id into v_id;

    if v_id is null then
      raise exception 'Solo quien escribió este recuerdo puede editarlo.' using errcode = '42501';
    end if;

    delete from public.memory_pages where memory_id = v_id;
  end if;

  for v_page, v_page_pos in
    select value, ordinality - 1 from jsonb_array_elements(p_pages) with ordinality
  loop
    insert into public.memory_pages (memory_id, position)
    values (v_id, v_page_pos)
    returning id into v_page_id;

    for v_block, v_block_pos in
      select value, ordinality - 1
      from jsonb_array_elements(coalesce(v_page -> 'blocks', '[]'::jsonb)) with ordinality
    loop
      v_type := (v_block ->> 'type')::public.block_type;

      insert into public.memory_blocks
        (page_id, position, type, heading, body, caption, track_title, track_artist, decoration)
      values (
        v_page_id,
        v_block_pos,
        v_type,
        nullif(trim(v_block ->> 'heading'), ''),
        nullif(trim(v_block ->> 'body'), ''),
        nullif(trim(v_block ->> 'caption'), ''),
        nullif(trim(v_block ->> 'trackTitle'), ''),
        nullif(trim(v_block ->> 'trackArtist'), ''),
        case when v_type = 'decoration' then coalesce(v_block ->> 'decoration', 'clavel') end
      )
      returning id into v_block_id;

      v_count := 0;
      for v_item, v_item_pos in
        select value, ordinality - 1
        from jsonb_array_elements(coalesce(v_block -> 'media', '[]'::jsonb)) with ordinality
      loop
        select kind into v_kind
        from public.media
        where id = (v_item ->> 'id')::uuid and owner_id = v_uid;

        if not found then
          raise exception 'Uno de los archivos no existe o no es tuyo.' using errcode = '42501';
        end if;

        if not (
          (v_type = 'photos' and v_kind in ('image', 'gif'))
          or (v_type = 'gif' and v_kind = 'gif')
          or (v_type = 'music' and v_kind = 'audio')
        ) then
          raise exception 'Hay un archivo que no corresponde al tipo de bloque.';
        end if;

        insert into public.block_media (block_id, media_id, position, caption)
        values (v_block_id, (v_item ->> 'id')::uuid, v_item_pos, nullif(trim(v_item ->> 'caption'), ''));

        v_count := v_count + 1;
      end loop;

      if v_type = 'photos' and v_count not between 1 and 12 then
        raise exception 'Cada álbum de fotos necesita entre 1 y 12 fotos.';
      elsif v_type = 'music' and v_count <> 1 then
        raise exception 'Cada disco necesita una canción.';
      elsif v_type = 'gif' and v_count <> 1 then
        raise exception 'Cada bloque de GIF necesita un GIF.';
      elsif v_type in ('text', 'decoration') and v_count <> 0 then
        raise exception 'Los bloques de texto y decoración no llevan archivos.';
      end if;
    end loop;
  end loop;

  delete from public.memory_viewers where memory_id = v_id;

  if v_visibility = 'selected' then
    if coalesce(cardinality(p_viewer_ids), 0) = 0 then
      raise exception 'Elige al menos una persona que pueda ver el recuerdo.';
    end if;

    insert into public.memory_viewers (memory_id, user_id)
    select v_id, u from unnest(p_viewer_ids) as u
    where u <> v_uid
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_memory(uuid, jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.save_memory(uuid, jsonb, jsonb, uuid[]) to authenticated;
