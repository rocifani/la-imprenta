begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Aislar los datos de prueba; el rollback restaura los miembros reales locales.
delete from public.team_members;

select ok(not has_table_privilege('anon', 'public.team_members', 'SELECT'),
  'Visitantes no pueden leer miembros');
select ok(not has_table_privilege('anon', 'public.team_member_roles', 'SELECT'),
  'Visitantes no pueden leer roles');
select ok(not has_table_privilege('authenticated', 'public.team_members', 'INSERT'),
  'Iniciar sesión no habilita altas de usuarios');
select ok(not has_table_privilege('authenticated', 'public.team_member_roles', 'INSERT'),
  'Iniciar sesión no habilita asignación directa de roles');

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'admin@example.test'),
  ('00000000-0000-4000-8000-000000000012', 'operator@example.test');
insert into public.team_members (id, auth_user_id, email, display_name) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'admin@example.test', 'Administradora de prueba'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', 'operator@example.test', 'Operario de prueba');
insert into public.team_member_roles (member_id, role) values
  ('00000000-0000-4000-8000-000000000001', 'administrator'),
  ('00000000-0000-4000-8000-000000000002', 'operator'),
  ('00000000-0000-4000-8000-000000000002', 'designer');

select is((select count(*) from public.team_member_roles
  where member_id = '00000000-0000-4000-8000-000000000002'), 2::bigint,
  'Un usuario puede tener varios roles');
select throws_ok(
  $$insert into public.team_member_roles (member_id, role)
    values ('00000000-0000-4000-8000-000000000002', 'administrator')$$,
  '23505', null, 'No puede existir una segunda cuenta administradora'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000012';
select is((select count(*) from public.team_members), 1::bigint,
  'Un miembro activo ve su propio registro');
select is((select count(*) from public.team_member_roles), 2::bigint,
  'Un miembro activo ve sus roles');
select is((select count(*) from public.team_members
  where email = 'admin@example.test'), 0::bigint,
  'Un miembro sin rol administrador no ve otros miembros');

reset role;
update public.team_members set active = false
  where id = '00000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from public.team_members), 0::bigint,
  'Un miembro desactivado no puede leer aunque conserve su identidad');
select is((select count(*) from public.team_member_roles), 0::bigint,
  'Un miembro desactivado no puede leer roles');

set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000011';
select is((select count(*) from public.team_members), 2::bigint,
  'La administradora ve miembros activos e inactivos');
select is((select count(*) from public.team_member_roles), 3::bigint,
  'La administradora puede consultar los roles del equipo');
reset role;
select * from finish();
rollback;
