begin;
create extension if not exists pgtap with schema extensions;
select plan(17);
delete from public.team_members;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000041', 'admin.manage@example.test'),
  ('00000000-0000-4000-8000-000000000042', 'staff.manage@example.test');
insert into public.team_members(id, auth_user_id, email, display_name) values
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000041', 'admin.manage@example.test', 'Administradora'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000042', 'staff.manage@example.test', 'Miembro vinculado');
insert into public.team_member_roles(member_id, role) values
  ('00000000-0000-4000-8000-000000000051', 'administrator'),
  ('00000000-0000-4000-8000-000000000052', 'designer');

select ok(not has_function_privilege('anon', 'public.save_team_member(uuid,text,text,public.team_role[],boolean,integer)', 'EXECUTE'),
  'Un visitante no puede ejecutar la gestión de usuarios');
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000042';
select throws_ok($$select public.save_team_member(null, 'Intruso', 'intruso@example.test', array['designer']::public.team_role[], true, null)$$,
  '42501', null, 'Un diseñador no puede habilitar usuarios');

set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000041';
select lives_ok($$select public.save_team_member(null, '  Operario nuevo  ', 'NEW@example.test', array['operator','designer']::public.team_role[], true, null)$$,
  'La administradora puede crear un acceso con varios roles');
select is((select display_name from public.team_members where email = 'new@example.test'), 'Operario nuevo',
  'El correo y nombre quedan normalizados');
select is((select count(*) from public.team_member_roles where member_id = (select id from public.team_members where email = 'new@example.test')), 2::bigint,
  'Se guardan los roles múltiples');
select throws_ok($$select public.save_team_member(null, 'Duplicado', 'new@example.test', array['operator']::public.team_role[], true, null)$$,
  '23505', null, 'No se duplica un correo');
select throws_ok($$select public.save_team_member(null, 'Otra administradora', 'other@example.test', array['administrator']::public.team_role[], true, null)$$,
  '23514', null, 'No se puede crear otra administradora por la función');
select throws_ok($$select public.save_team_member(null, 'Sin rol', 'norole@example.test', '{}'::public.team_role[], true, null)$$,
  '22023', null, 'No se crean accesos sin roles');
select throws_ok($$select public.save_team_member('00000000-0000-4000-8000-000000000051', 'Administradora', 'admin.manage@example.test', array['administrator']::public.team_role[], false, 1)$$,
  '23514', null, 'La administradora no puede desactivarse');
select throws_ok($$select public.save_team_member('00000000-0000-4000-8000-000000000051', 'Administradora', 'admin.manage@example.test', array['designer']::public.team_role[], true, 1)$$,
  '23514', null, 'La administradora no puede quitarse su rol');
select throws_ok($$select public.save_team_member('00000000-0000-4000-8000-000000000052', 'Miembro', 'changed@example.test', array['designer']::public.team_role[], true, 1)$$,
  '23514', null, 'No se sustituye el correo de una identidad vinculada');
select lives_ok($$select public.save_team_member((select id from public.team_members where email='new@example.test'), 'Equipo nuevo', 'pending@example.test', array['finance']::public.team_role[], false, 1)$$,
  'Se puede corregir un correo pendiente, cambiar roles y desactivar de forma conjunta');
select is((select version from public.team_members where email='pending@example.test'), 2,
  'La versión aumenta después de guardar');
select is((select count(*) from public.team_member_roles where member_id=(select id from public.team_members where email='pending@example.test') and role='finance'), 1::bigint,
  'Los nuevos roles reemplazan los anteriores');
select throws_ok($$select public.save_team_member((select id from public.team_members where email='pending@example.test'), 'Cambio viejo', 'pending@example.test', array['finance']::public.team_role[], true, 1)$$,
  '40001', null, 'Una edición desactualizada no pisa cambios recientes');
select lives_ok($$select public.save_team_member('00000000-0000-4000-8000-000000000052', 'Miembro vinculado', 'staff.manage@example.test', array['designer']::public.team_role[], false, 1)$$,
  'Se puede desactivar a un usuario que ya ingresó');
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000042';
select is((select count(*) from public.team_members), 0::bigint,
  'La desactivación bloquea la lectura sin renovar la sesión');
reset role;
select * from finish();
rollback;
