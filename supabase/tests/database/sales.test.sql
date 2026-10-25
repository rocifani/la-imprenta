begin;
create extension if not exists pgtap with schema extensions;
select plan(21);
delete from public.team_members;
insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000000061','designer.sales@example.test'),
  ('00000000-0000-4000-8000-000000000062','admin.sales@example.test');
insert into public.team_members(id,auth_user_id,email,display_name) values
  ('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000061','designer.sales@example.test','Diseñador'),
  ('00000000-0000-4000-8000-000000000072','00000000-0000-4000-8000-000000000062','admin.sales@example.test','Administradora');
insert into public.team_member_roles(member_id,role) values
  ('00000000-0000-4000-8000-000000000071','designer'),
  ('00000000-0000-4000-8000-000000000072','administrator');

select ok(not has_table_privilege('anon','public.customers','SELECT'), 'Los visitantes no leen clientes');
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000062';
select throws_ok($$select public.save_quote('00000000-0000-4000-8000-000000000081',null,'Cliente','','','[{"description":"Folletos","quantity":500,"amount":"100.00"}]')$$,
  '42501',null,'Administrador sin Diseño no puede cotizar');
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000061';
select lives_ok($$select public.save_quote('00000000-0000-4000-8000-000000000081',null,'Cliente original','3411234567','Condición original','[{"description":"Folletos","specifications":"Full color","quantity":500,"amount":"100.00"},{"description":"Tarjetas","quantity":100,"amount":"50.00"}]')$$,
  'Diseño crea un presupuesto directo sin ficha de cliente');
select is((select count(*) from public.quote_items where version_id=(select current_version_id from public.quotes where id='00000000-0000-4000-8000-000000000081')),2::bigint,'El presupuesto tiene varios productos');
select lives_ok($$select public.save_quote('00000000-0000-4000-8000-000000000081',1,'Cliente original','3411234567','Condición vigente','[{"description":"Folletos","specifications":"Full color frente y dorso","quantity":500,"amount":"120.00"},{"description":"Tarjetas","quantity":100,"amount":"80.00"}]')$$,
  'Se puede editar un borrador');
select is((select count(*) from public.quote_versions where quote_id='00000000-0000-4000-8000-000000000081'),2::bigint,'Se conserva el historial de versiones');
select is((select sum(amount) from public.quote_items where version_id=(select id from public.quote_versions where quote_id='00000000-0000-4000-8000-000000000081' and revision=1)),150.00::numeric,'La versión anterior conserva sus importes');
select throws_ok($$select public.save_quote('00000000-0000-4000-8000-000000000081',1,'Cambio antiguo','','','[{"description":"Folletos","quantity":1,"amount":"1"}]')$$,
  '40001',null,'Una edición antigua no pisa otra versión');
select throws_ok($$select public.create_order_from_quote('00000000-0000-4000-8000-000000000081',2,null,'{"display_name":"Cliente"}','00000000-0000-4000-8000-000000000091')$$,
  '23514',null,'No se genera un pedido sin aprobación');
select lives_ok($$select public.approve_quote('00000000-0000-4000-8000-000000000081',2,'')$$,'Diseño registra la aceptación sin comentario obligatorio');
select throws_ok($$select public.save_quote('00000000-0000-4000-8000-000000000081',3,'Cambio posterior','','','[{"description":"Folletos","quantity":1,"amount":"1"}]')$$,
  '23514',null,'El acuerdo aprobado no se modifica');
select lives_ok($$select public.create_order_from_quote('00000000-0000-4000-8000-000000000081',3,null,'{"display_name":"Cliente original","phone":"3411234567","cuit":"20-12345678-6"}','00000000-0000-4000-8000-000000000091')$$,
  'Se crea cliente y pedido en una operación');
select is((select total from public.orders where quote_id='00000000-0000-4000-8000-000000000081'),200.00::numeric,'El total suma lotes y no multiplica por cantidad');
select is((select count(*) from public.order_items where order_id=(select id from public.orders where quote_id='00000000-0000-4000-8000-000000000081')),2::bigint,'Se copian ambos productos');
select lives_ok($$select public.create_order_from_quote('00000000-0000-4000-8000-000000000081',3,null,'{"display_name":"No duplicar"}','00000000-0000-4000-8000-000000000092')$$,
  'Reintentar devuelve el pedido existente');
select is((select count(*) from public.orders where quote_id='00000000-0000-4000-8000-000000000081'),1::bigint,'No se duplican pedidos');
select is((select count(*) from public.customers where id='00000000-0000-4000-8000-000000000092'),0::bigint,'El reintento no duplica clientes');
select lives_ok($$select public.save_customer('00000000-0000-4000-8000-000000000091',1,'{"display_name":"Cliente actualizado"}')$$,
  'Se puede actualizar la ficha del cliente');
select is((select customer_snapshot->>'display_name' from public.orders where quote_id='00000000-0000-4000-8000-000000000081'),'Cliente original','El pedido conserva el cliente histórico');
select is((select cuit from public.customers where id='00000000-0000-4000-8000-000000000091'),'','La ficha permite quitar el CUIT opcional');
select is((select customer_snapshot->>'cuit' from public.orders where quote_id='00000000-0000-4000-8000-000000000081'),'20123456786','El pedido conserva el CUIT normalizado original aunque cambie la ficha');
reset role;
select * from finish();
rollback;
