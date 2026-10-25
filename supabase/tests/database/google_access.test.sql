begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
delete from public.team_members;

insert into public.team_members (id, email, display_name) values
  ('00000000-0000-4000-8000-000000000021', 'allowed@example.test', 'Persona habilitada'),
  ('00000000-0000-4000-8000-000000000022', 'inactive@example.test', 'Persona desactivada'),
  ('00000000-0000-4000-8000-000000000023', 'noroles@example.test', 'Sin roles');
update public.team_members set active = false where email = 'inactive@example.test';
insert into public.team_member_roles (member_id, role) values
  ('00000000-0000-4000-8000-000000000021', 'designer'),
  ('00000000-0000-4000-8000-000000000022', 'operator');

select is(private.before_team_user_created(
  '{"user":{"id":"00000000-0000-4000-8000-000000000031","email":"allowed@example.test","app_metadata":{"provider":"google"}}}'
), '{}'::jsonb, 'Google y correo habilitado permiten el alta');
select is((private.before_team_user_created(
  '{"user":{"id":"00000000-0000-4000-8000-000000000032","email":"other@example.test","app_metadata":{"provider":"google"}}}'
)->'error'->>'http_code'), '403', 'Un correo ajeno no permite el alta');
select is((private.before_team_user_created(
  '{"user":{"id":"00000000-0000-4000-8000-000000000032","email":"inactive@example.test","app_metadata":{"provider":"google"}}}'
)->'error'->>'http_code'), '403', 'Un miembro desactivado no permite el alta');
select is((private.before_team_user_created(
  '{"user":{"id":"00000000-0000-4000-8000-000000000032","email":"allowed@example.test","app_metadata":{"provider":"email"}}}'
)->'error'->>'http_code'), '403', 'No se permite sustituir Google por correo y contraseña');
select is((private.before_team_user_created(
  '{"user":{"id":"00000000-0000-4000-8000-000000000032","email":"noroles@example.test","app_metadata":{"provider":"google"}}}'
)->'error'->>'http_code'), '403', 'Una habilitación sin roles no permite el alta');

insert into auth.users (id, email, raw_app_meta_data, email_confirmed_at) values
  ('00000000-0000-4000-8000-000000000031', 'allowed@example.test', '{"provider":"google"}', now());
select is((select auth_user_id from public.team_members where email = 'allowed@example.test'),
  '00000000-0000-4000-8000-000000000031'::uuid,
  'Una identidad Google verificada queda vinculada a la habilitación');
select ok(not has_function_privilege('authenticated', 'private.before_team_user_created(jsonb)', 'EXECUTE'),
  'El navegador no puede invocar el hook');
select * from finish();
rollback;
