-- Amigos y privacidad:
--   * Cada usuario tiene un apodo único (profiles.display_name). Los correos ya no se ven entre usuarios.
--   * Las amistades se piden y se aceptan (friendships). Solo se comparte con amigos aceptados.
--   * La visibilidad "members" pasa a llamarse "friends": la ven todos tus amigos.
--   * Máximo 4 fotos por página.

-- 1. Apodos únicos y correo privado
alter table public.profiles alter column display_name set not null;

alter table public.profiles
  add constraint profiles_nickname_format
  check (display_name ~ '^[A-Za-z0-9_.ÁÉÍÓÚÜÑáéíóúüñ-]{3,30}$');

create unique index profiles_nickname_unique on public.profiles (lower(display_name));

revoke select on public.profiles from authenticated;
grant select (id, display_name, created_at) on public.profiles to authenticated;

-- Apodo inicial a partir del correo, limpio y sin repetir
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_nick text;
  v_n    integer := 0;
begin
  v_base := left(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
      '[^A-Za-z0-9_.-]', '', 'g'
    ),
    24
  );
  if length(v_base) < 3 then
    v_base := 'lector' || v_base;
  end if;

  v_nick := v_base;
  while exists (select 1 from public.profiles where lower(display_name) = lower(v_nick)) loop
    v_n := v_n + 1;
    v_nick := v_base || v_n;
  end loop;

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, v_nick)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Amistades
create type public.friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       public.friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendship_not_self check (requester_id <> addressee_id),
  constraint friendship_responded_when_accepted check ((status = 'accepted') = (responded_at is not null))
);

-- Una sola fila por pareja, sin importar quién la pidió
create unique index friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

create policy "Ver tus amistades y solicitudes"
  on public.friendships for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create function private.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(p_a, p_b)
      and greatest(f.requester_id, f.addressee_id) = greatest(p_a, p_b)
  );
$$;

revoke execute on function private.are_friends(uuid, uuid) from public;
grant execute on function private.are_friends(uuid, uuid) to anon, authenticated;

-- Las amistades solo se escriben con estas funciones
create function public.send_friend_request(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.friendships;
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = v_uid then
    raise exception 'No puedes enviarte una solicitud a ti.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Ese usuario no existe.';
  end if;

  select * into v_row from public.friendships
  where least(requester_id, addressee_id) = least(v_uid, p_user_id)
    and greatest(requester_id, addressee_id) = greatest(v_uid, p_user_id);

  if not found then
    insert into public.friendships (requester_id, addressee_id) values (v_uid, p_user_id);
    return 'sent';
  elsif v_row.status = 'accepted' then
    raise exception 'Ya son amigos.';
  elsif v_row.requester_id = v_uid then
    raise exception 'Ya le enviaste una solicitud.';
  else
    -- La otra persona ya te la había enviado: queda aceptada.
    update public.friendships set status = 'accepted', responded_at = now() where id = v_row.id;
    return 'accepted';
  end if;
end;
$$;

create function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;

  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
    where id = p_request_id and addressee_id = v_uid and status = 'pending';
  else
    delete from public.friendships
    where id = p_request_id and addressee_id = v_uid and status = 'pending';
  end if;

  if not found then
    raise exception 'Esa solicitud ya no existe.';
  end if;
end;
$$;

-- Cancelar una solicitud enviada o dejar de ser amigos
create function public.remove_friendship(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;

  delete from public.friendships
  where least(requester_id, addressee_id) = least(v_uid, p_user_id)
    and greatest(requester_id, addressee_id) = greatest(v_uid, p_user_id);

  -- Deja de compartir los recuerdos "elegidos" entre los dos
  delete from public.memory_viewers v
  using public.memories m
  where m.id = v.memory_id
    and ((m.created_by = v_uid and v.user_id = p_user_id) or (m.created_by = p_user_id and v.user_id = v_uid));
end;
$$;

revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;

-- 3. "members" pasa a "friends" y la visibilidad exige amistad
alter type public.memory_visibility rename value 'members' to 'friends';

create or replace function private.can_view_memory(p_memory_id uuid)
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
            or (m.visibility = 'friends' and private.are_friends(m.created_by, (select auth.uid())))
            or (
              m.visibility = 'selected'
              and private.are_friends(m.created_by, (select auth.uid()))
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

alter policy "Usuarios con sesión ven lo que se les comparte"
  on public.memories
  using (private.can_view_memory(id));

-- 4. Guardar: solo se comparte con amigos y máximo 4 fotos por página
create or replace function public.save_memory(
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
  v_uid         uuid := (select auth.uid());
  v_id          uuid;
  v_visibility  public.memory_visibility;
  v_page        jsonb;
  v_page_pos    bigint;
  v_page_id     uuid;
  v_page_photos integer;
  v_block       jsonb;
  v_block_pos   bigint;
  v_block_id    uuid;
  v_type        public.block_type;
  v_item        jsonb;
  v_item_pos    bigint;
  v_kind        public.media_kind;
  v_count       integer;
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_pages) is distinct from 'array'
     or jsonb_array_length(p_pages) not between 1 and 100 then
    raise exception 'El recuerdo necesita entre 1 y 100 páginas.';
  end if;

  v_visibility := (p_memory ->> 'visibility')::public.memory_visibility;

  if v_visibility = 'selected' and exists (
    select 1 from unnest(coalesce(p_viewer_ids, '{}')) as u
    where u <> v_uid and not private.are_friends(v_uid, u)
  ) then
    raise exception 'Solo puedes compartir recuerdos con tus amigos.';
  end if;

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

    v_page_photos := 0;

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

      if v_type = 'photos' and v_count not between 1 and 4 then
        raise exception 'Cada álbum de fotos necesita entre 1 y 4 fotos.';
      elsif v_type = 'music' and v_count <> 1 then
        raise exception 'Cada disco necesita una canción.';
      elsif v_type = 'gif' and v_count <> 1 then
        raise exception 'Cada bloque de GIF necesita un GIF.';
      elsif v_type in ('text', 'decoration') and v_count <> 0 then
        raise exception 'Los bloques de texto y decoración no llevan archivos.';
      end if;

      if v_type = 'photos' then
        v_page_photos := v_page_photos + v_count;
        if v_page_photos > 4 then
          raise exception 'La página % tiene más de 4 fotos. Pasa algunas a otra página.', v_page_pos + 1;
        end if;
      end if;
    end loop;
  end loop;

  delete from public.memory_viewers where memory_id = v_id;

  if v_visibility = 'selected' then
    if coalesce(cardinality(p_viewer_ids), 0) = 0 then
      raise exception 'Elige al menos un amigo que pueda ver el recuerdo.';
    end if;

    insert into public.memory_viewers (memory_id, user_id)
    select v_id, u from unnest(p_viewer_ids) as u
    where u <> v_uid
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;
