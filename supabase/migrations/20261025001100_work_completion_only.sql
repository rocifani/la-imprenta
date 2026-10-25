-- El taller solo registra finalización; los trabajos abiertos quedan pendientes.
drop function public.start_production(uuid,uuid);
update public.order_items set production_status='pending' where production_status='in_progress';
alter table public.order_items drop constraint order_items_production_status_check;
alter table public.order_items add constraint order_items_production_status_check
 check(production_status in ('pending','completed'));

-- Mantener los mensajes de validación de los RPC alineados con el lenguaje del taller.
-- No se reescriben migraciones históricas ya aplicadas.
do $$
declare definition text; target regprocedure;
begin
 for target in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='public' and p.proname in ('create_direct_order','complete_production'))
 or (n.nspname='private' and p.proname='save_quote_content')
 loop
  definition:=pg_get_functiondef(target);
  definition:=replace(replace(definition,'productos','trabajos'),'producto','trabajo');
  execute definition;
 end loop;
end $$;
