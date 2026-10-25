-- Base de acceso. Google, vinculación inicial y gestión desde la app se
-- implementarán después; no conceder escritura directa a cuentas autenticadas.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.team_role as enum (
  'administrator', 'designer', 'operator', 'billing', 'finance'
);

-- Permite habilitar un correo antes de su primer ingreso con Google.
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  display_name text not null check (length(btrim(display_name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint normalized_team_email check (
    email = lower(btrim(email)) and position('@' in email) > 1
  )
);

create table public.team_member_roles (
  member_id uuid not null references public.team_members(id) on delete cascade,
  role public.team_role not null,
  created_at timestamptz not null default now(),
  primary key (member_id, role)
);

-- Como máximo una cuenta administradora; nunca se asigna por registro público.
create unique index one_administrator
  on public.team_member_roles (role)
  where role = 'administrator';

create function private.has_team_role(requested_role public.team_role)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    join public.team_member_roles r on r.member_id = m.id
    where m.auth_user_id = (select auth.uid())
      and m.active
      and r.role = requested_role
  );
$$;
revoke all on function private.has_team_role(public.team_role) from public, anon;
grant execute on function private.has_team_role(public.team_role) to authenticated;

alter table public.team_members enable row level security;
alter table public.team_member_roles enable row level security;

revoke all on public.team_members, public.team_member_roles from anon, authenticated;
grant select on public.team_members, public.team_member_roles to authenticated;
grant all on public.team_members, public.team_member_roles to service_role;

create policy members_read_self_or_administrator
on public.team_members for select to authenticated
using (
  (auth_user_id = (select auth.uid()) and active)
  or private.has_team_role('administrator')
);

create policy roles_read_self_or_administrator
on public.team_member_roles for select to authenticated
using (
  private.has_team_role('administrator')
  or exists (
    select 1 from public.team_members m
    where m.id = member_id
      and m.auth_user_id = (select auth.uid())
      and m.active
  )
);
