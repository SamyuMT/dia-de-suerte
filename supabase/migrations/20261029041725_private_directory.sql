-- Directorio privado: nadie puede listar a todos los usuarios.
--   * Cada uno ve solo su perfil, el de sus amigos y el de quienes tienen una solicitud con él.
--   * Para encontrar a alguien hay que escribir su apodo exacto (find_profile_by_nickname).

create function private.has_friendship_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(p_other, (select auth.uid()))
      and greatest(f.requester_id, f.addressee_id) = greatest(p_other, (select auth.uid()))
  );
$$;

revoke execute on function private.has_friendship_with(uuid) from public;
grant execute on function private.has_friendship_with(uuid) to authenticated;

alter policy "Usuarios con sesión ven los perfiles"
  on public.profiles
  using (id = (select auth.uid()) or private.has_friendship_with(id));

-- Busca un usuario por su apodo exacto (sin importar mayúsculas). No devuelve al propio usuario.
create function public.find_profile_by_nickname(p_nickname text)
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.profiles p
  where (select auth.uid()) is not null
    and lower(p.display_name) = lower(trim(p_nickname))
    and p.id <> (select auth.uid())
  limit 1;
$$;

revoke execute on function public.find_profile_by_nickname(text) from public, anon;
grant execute on function public.find_profile_by_nickname(text) to authenticated;
