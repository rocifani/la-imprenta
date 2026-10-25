begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
delete from public.team_members;
insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000101','designer.customer@example.test');
insert into public.team_members(id,auth_user_id,email,display_name) values
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000101','designer.customer@example.test','Diseño');
insert into public.team_member_roles(member_id,role) values ('00000000-0000-4000-8000-000000000102','designer');
set local role authenticated;
set local "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000101';
select public.save_customer('00000000-0000-4000-8000-000000000103',null,'{"display_name":"Cliente A","phone":"3410000000"}');
select public.save_customer('00000000-0000-4000-8000-000000000104',null,'{"display_name":"Cliente B"}');
select lives_ok($$select public.save_quote('00000000-0000-4000-8000-000000000105',null,'Nombre adulterado','','','[{"description":"Folletos","quantity":500,"amount":"100"}]','00000000-0000-4000-8000-000000000103')$$,
  'Se crea un presupuesto asociado a un cliente existente');
select is((select customer_id from public.quotes where id='00000000-0000-4000-8000-000000000105'),'00000000-0000-4000-8000-000000000103'::uuid,'El vínculo queda en el presupuesto');
select is((select recipient_name from public.quote_versions where quote_id='00000000-0000-4000-8000-000000000105' and revision=1),'Cliente A','El destinatario se toma de la ficha en el servidor');
select public.save_quote('00000000-0000-4000-8000-000000000105',1,'','','','[{"description":"Folletos","quantity":500,"amount":"200"}]','00000000-0000-4000-8000-000000000104');
select is((select customer_id from public.quote_versions where quote_id='00000000-0000-4000-8000-000000000105' and revision=1),'00000000-0000-4000-8000-000000000103'::uuid,'La versión anterior conserva el cliente original');
select is((select count(*) from public.quotes where id='00000000-0000-4000-8000-000000000105' and customer_id='00000000-0000-4000-8000-000000000104'),1::bigint,'Se puede filtrar por el cliente de la versión actual');
select public.approve_quote('00000000-0000-4000-8000-000000000105',2,'Confirmado por el cliente');
select throws_ok($$select public.create_order_from_quote('00000000-0000-4000-8000-000000000105',3,'00000000-0000-4000-8000-000000000103',null,null)$$,
  '23514',null,'La nota no puede cambiar al cliente aprobado');
select lives_ok($$select public.create_order_from_quote('00000000-0000-4000-8000-000000000105',3,null,null,null)$$,
  'La nota toma automáticamente el cliente del presupuesto');
select is((select customer_id from public.orders where quote_id='00000000-0000-4000-8000-000000000105'),'00000000-0000-4000-8000-000000000104'::uuid,'La nota queda en el historial correcto');
select ok(not has_function_privilege('authenticated','private.save_quote_content(uuid,integer,text,text,text,jsonb)','EXECUTE'),'El cliente no puede omitir el guardado protegido');
select throws_ok($$select public.save_quote('00000000-0000-4000-8000-000000000106',null,'Cliente','','','[{"description":"Folletos","quantity":1,"amount":"100"}]','00000000-0000-4000-8000-000000000199')$$,
  'P0002',null,'No se aceptan vínculos con clientes inexistentes');
reset role;
select * from finish();
rollback;
