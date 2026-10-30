-- Solicitudes de acceso y administradores.
--   * Cualquiera (sin sesión) puede pedir entrar al libro con request_membership(): apodo, correo y teléfono.
--     No se crea ninguna cuenta: la solicitud queda en espera.
--   * Solo los administradores (app_admins) ven y responden las solicitudes. La cuenta la crea el servidor
--     con la clave secreta de Supabase al admitir a la persona.

-- 1. Administradores
create table public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;

create policy "Cada uno sabe si es administrador"
  on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()));

insert into public.app_admins (user_id)
select id from auth.users where lower(email) = 'jemycraft12@hotmail.com'
on conflict do nothing;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- 2. Solicitudes
create type public.membership_status as enum ('pending', 'approved', 'rejected');

create table public.membership_requests (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null check (nickname ~ '^[A-Za-z0-9_.ÁÉÍÓÚÜÑáéíóúüñ-]{3,30}$'),
  email       text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  status      public.membership_status not null default 'pending',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  user_id     uuid references auth.users (id) on delete set null,
  constraint membership_reviewed check ((status = 'pending') = (reviewed_at is null))
);

-- Una sola solicitud pendiente por correo y por apodo
create unique index membership_pending_email on public.membership_requests (lower(email)) where status = 'pending';
create unique index membership_pending_nickname on public.membership_requests (lower(nickname)) where status = 'pending';
create index membership_status_idx on public.membership_requests (status, created_at desc);

alter table public.membership_requests enable row level security;
revoke all on public.membership_requests from anon, authenticated;
grant select on public.membership_requests to authenticated;

create policy "Solo administradores ven las solicitudes"
  on public.membership_requests for select to authenticated
  using (private.is_admin());

-- 3. Pedir acceso (sin sesión). No revela si el correo ya tiene cuenta.
create function public.request_membership(p_nickname text, p_email text, p_phone text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text := trim(p_nickname);
  v_email    text := lower(trim(p_email));
  v_phone    text := regexp_replace(coalesce(p_phone, ''), '[\s()-]', '', 'g');
begin
  if v_nickname !~ '^[A-Za-z0-9_.ÁÉÍÓÚÜÑáéíóúüñ-]{3,30}$' then
    raise exception 'El apodo debe tener de 3 a 30 caracteres: letras, números, punto o guiones (sin espacios).';
  end if;
  if length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribe un correo válido.';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Escribe el número con el prefijo del país, por ejemplo +57 300 123 4567.';
  end if;

  -- Si ya tiene cuenta o ya pidió entrar, se responde igual que si fuera nuevo (no se revela nada).
  if exists (select 1 from auth.users where lower(email) = v_email)
     or exists (select 1 from public.membership_requests where lower(email) = v_email and status = 'pending') then
    return 'ok';
  end if;

  if exists (select 1 from public.profiles where lower(display_name) = lower(v_nickname))
     or exists (select 1 from public.membership_requests where lower(nickname) = lower(v_nickname) and status = 'pending') then
    raise exception 'Ese apodo ya lo usa alguien. Prueba con otro.';
  end if;

  -- Límite simple contra abuso: como mucho 30 solicitudes pendientes en total.
  if (select count(*) from public.membership_requests where status = 'pending') >= 30 then
    raise exception 'Ahora mismo hay muchas solicitudes en espera. Inténtalo más tarde.';
  end if;

  insert into public.membership_requests (nickname, email, phone) values (v_nickname, v_email, v_phone);
  return 'ok';
end;
$$;

revoke execute on function public.request_membership(text, text, text) from public;
grant execute on function public.request_membership(text, text, text) to anon, authenticated;
