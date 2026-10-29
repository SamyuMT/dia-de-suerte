-- Autoría y visibilidad de las páginas:
--   draft    -> solo quien la escribió
--   members  -> todos los usuarios con sesión
--   selected -> quien la escribió + los usuarios elegidos (memory_viewers)
--   public   -> cualquiera con el enlace, incluso sin sesión
-- Solo el autor puede editar o borrar su página.

create schema if not exists private;
grant usage on schema private to authenticated;

-- 1. Perfiles: directorio de usuarios para elegir con quién compartir
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Usuarios con sesión ven los perfiles"
  on public.profiles for select to authenticated using (true);

create policy "Cada usuario edita su perfil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, email, display_name)
select id, email, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- 2. Visibilidad (reemplaza a "published")
create type public.memory_visibility as enum ('draft', 'members', 'selected', 'public');

alter table public.memories
  add column visibility public.memory_visibility not null default 'draft';

update public.memories
  set visibility = (case when published then 'members' else 'draft' end)::public.memory_visibility;

alter table public.memories drop column published;

-- Las páginas sin autor pasan al primer usuario
update public.memories
  set created_by = (select id from auth.users order by created_at limit 1)
  where created_by is null;

create index memories_created_by_idx on public.memories (created_by);

-- 3. Usuarios elegidos para las páginas "selected"
create table public.memory_viewers (
  memory_id  uuid not null references public.memories (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, user_id)
);

create index memory_viewers_user_idx on public.memory_viewers (user_id);

alter table public.memory_viewers enable row level security;
revoke all on public.memory_viewers from anon;
grant select, insert, delete on public.memory_viewers to authenticated;

-- security definer para consultar memories sin recursión de políticas
create function private.is_memory_owner(p_memory_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memories m
    where m.id = p_memory_id and m.created_by = (select auth.uid())
  );
$$;

revoke execute on function private.is_memory_owner(uuid) from public, anon;
grant execute on function private.is_memory_owner(uuid) to authenticated;

create policy "Ver a quién se compartió"
  on public.memory_viewers for select to authenticated
  using (user_id = (select auth.uid()) or private.is_memory_owner(memory_id));

create policy "El autor comparte su página"
  on public.memory_viewers for insert to authenticated
  with check (private.is_memory_owner(memory_id));

create policy "El autor deja de compartir su página"
  on public.memory_viewers for delete to authenticated
  using (private.is_memory_owner(memory_id));

-- 4. Nuevas políticas de memories
drop policy "Usuarios con sesión leen las páginas" on public.memories;
drop policy "Usuarios con sesión crean páginas" on public.memories;
drop policy "Usuarios con sesión editan páginas" on public.memories;
drop policy "Usuarios con sesión borran páginas" on public.memories;

grant select on public.memories to anon;

create policy "Cualquiera ve las páginas públicas"
  on public.memories for select to anon
  using (visibility = 'public');

create policy "Usuarios con sesión ven lo que se les comparte"
  on public.memories for select to authenticated
  using (
    created_by = (select auth.uid())
    or visibility in ('members', 'public')
    or (
      visibility = 'selected'
      and exists (
        select 1 from public.memory_viewers v
        where v.memory_id = memories.id and v.user_id = (select auth.uid())
      )
    )
  );

create policy "Cada usuario crea sus páginas"
  on public.memories for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Solo el autor edita su página"
  on public.memories for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Solo el autor borra su página"
  on public.memories for delete to authenticated
  using (created_by = (select auth.uid()));
