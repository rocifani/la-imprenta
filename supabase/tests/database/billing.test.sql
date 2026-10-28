begin;
create extension if not exists pgtap with schema extensions;
select plan(27);
delete from public.team_members;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000401','billing.designer@example.test'),
 ('00000000-0000-4000-8000-000000000402','billing.first@example.test'),
 ('00000000-0000-4000-8000-000000000403','billing.second@example.test');
insert into public.team_members(id,auth_user_id,email,display_name) values
 ('00000000-0000-4000-8000-000000000411','00000000-0000-4000-8000-000000000401','billing.designer@example.test','Diseño'),
 ('00000000-0000-4000-8000-000000000412','00000000-0000-4000-8000-000000000402','billing.first@example.test','Facturador A'),
 ('00000000-0000-4000-8000-000000000413','00000000-0000-4000-8000-000000000403','billing.second@example.test','Facturador B');
insert into public.team_member_roles(member_id,role) values
 ('00000000-0000-4000-8000-000000000411','designer'),('00000000-0000-4000-8000-000000000411','operator'),
 ('00000000-0000-4000-8000-000000000412','billing'),('00000000-0000-4000-8000-000000000413','billing');
set local role authenticated;
set local "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000401';
select public.create_direct_order('00000000-0000-4000-8000-000000000421',null,'{"display_name":"Cliente fiscal","cuit":"20123456789","notes":"SECRETO CLIENTE"}','00000000-0000-4000-8000-000000000422','SECRETO PEDIDO','[{"description":"Folletos","quantity":500,"amount":"123.45"}]');
select public.create_direct_order('00000000-0000-4000-8000-000000000423','00000000-0000-4000-8000-000000000422',null,null,'','[{"description":"Tarjetas","quantity":100,"amount":"200"}]');
select throws_ok($$select public.billing_customers()$$,'42501',null,'El selector de facturación requiere su rol');
select throws_ok($$select public.mark_order_invoiced('00000000-0000-4000-8000-000000000421')$$,'42501',null,'Diseño y Producción no pueden marcar facturación');
set local "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000402';
select is(public.billing_order('00000000-0000-4000-8000-000000000421')->'customer'->>'cuit','20123456789','Facturación recibe el CUIT histórico');
select ok(position('SECRETO' in public.billing_order('00000000-0000-4000-8000-000000000421')::text)=0,'Facturación no recibe notas internas');
select is((select count(*) from public.customers),0::bigint,'No habilita acceso general a fichas de clientes');
select lives_ok($$select public.mark_order_invoiced('00000000-0000-4000-8000-000000000423')$$,'Permite registrar facturación antes de terminar los trabajos');
select is(public.billing_order('00000000-0000-4000-8000-000000000423')->'items'->0->>'production_status','pending','Facturar no termina el trabajo');
select ok(public.billing_queue('pending',0)->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"}]'::jsonb,'Pendientes de facturar incluye notas con trabajos pendientes');
select ok(public.billing_queue()->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"},{"id":"00000000-0000-4000-8000-000000000423"}]'::jsonb,'Por defecto incluye tanto facturadas como pendientes');
select is((select count(*) from public.billing_customers('Cliente fiscal','00000000-0000-4000-8000-000000000422')),1::bigint,'Permite buscar y recuperar el cliente del filtro');
select is((public.billing_queue(p_customer_id=>'00000000-0000-4000-8000-000000000499')->>'total')::integer,0,'Filtrar por otro cliente excluye las notas');
select ok(public.billing_queue(p_customer_id=>'00000000-0000-4000-8000-000000000422',p_from=>(public.billing_order('00000000-0000-4000-8000-000000000421')->>'created_at')::timestamptz)->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"}]'::jsonb,'Combina cliente y fecha inicial inclusiva');
select ok(not(public.billing_queue(p_until=>(public.billing_order('00000000-0000-4000-8000-000000000421')->>'created_at')::timestamptz)->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"}]'::jsonb),'El límite final es exclusivo');
select throws_ok($$select public.billing_queue(p_from=>'2026-10-26T03:00:00Z',p_until=>'2026-10-25T03:00:00Z')$$,'22023',null,'No admite rangos invertidos');
select throws_ok($$select public.mark_order_invoiced('00000000-0000-4000-8000-000000000499')$$,'P0002',null,'No permite facturar una nota inexistente');
set local "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000401';
select public.complete_production('00000000-0000-4000-8000-000000000421',null,'Terminado');
set local "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000402';
select ok(public.billing_queue('pending',0)->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"}]'::jsonb,'La nota terminada ingresa a pendientes de facturar');
select lives_ok($$select public.mark_order_invoiced('00000000-0000-4000-8000-000000000421')$$,'Registra la marca manual');
select is((public.billing_order('00000000-0000-4000-8000-000000000421')->>'invoiced')::boolean,true,'La nota queda facturada');
select ok(not(public.billing_queue('pending',0)->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"}]'::jsonb),'Sale de pendientes al facturar');
select ok(public.billing_queue('invoiced',0)->'orders' @> '[{"id":"00000000-0000-4000-8000-000000000421"}]'::jsonb,'Aparece entre las facturadas');
select is((public.billing_order('00000000-0000-4000-8000-000000000421')->>'total')::numeric,123.45::numeric,'La facturación conserva el importe acordado');
select is((select count(*) from public.orders),0::bigint,'No concede acceso comercial directo');
select ok(not has_function_privilege('anon','public.mark_order_invoiced(uuid)','EXECUTE'),'El público no puede registrar facturación');
select is(public.billing_order('00000000-0000-4000-8000-000000000421')->>'invoiced_by_name','Facturador A','Conserva autor del registro');
select ok(public.billing_order('00000000-0000-4000-8000-000000000421')->>'invoiced_at' is not null,'Guarda fecha del registro');
set local "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000403';
select public.mark_order_invoiced('00000000-0000-4000-8000-000000000421');
select is(public.billing_order('00000000-0000-4000-8000-000000000421')->>'invoiced_by_name','Facturador A','Un reintento no reemplaza al autor original');
reset role;
update public.team_members set active=false where id='00000000-0000-4000-8000-000000000413';
set local role authenticated;
select throws_ok($$select public.mark_order_invoiced('00000000-0000-4000-8000-000000000421')$$,'42501',null,'Una cuenta deshabilitada pierde el permiso');
reset role;
select * from finish();
rollback;
