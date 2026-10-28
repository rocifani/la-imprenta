-- Facturación es independiente de producción.
create or replace function public.mark_order_invoiced(p_order_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota de pedido no existe.'; end if;
 if target.invoiced then return target.id; end if;
 update public.orders set invoiced=true,invoiced_at=now(),invoiced_by=auth.uid() where id=p_order_id;
 return p_order_id;
end $$;

drop function public.billing_queue(text,integer);
create function public.billing_queue(p_status text default 'all',p_offset integer default 0,p_customer_id uuid default null,p_from timestamptz default null,p_until timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 if p_status is null or p_status not in ('pending','invoiced','all') or p_offset is null or p_offset<0 or p_offset>2000000
  or (p_from is not null and p_until is not null and p_from>=p_until) then
  raise exception using errcode='22023',message='Revisá los filtros.';
 end if;
 with summaries as (
  select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,o.total,o.invoiced,o.invoiced_at,
   count(i.id) as item_count,count(i.id) filter(where i.production_status='completed') as completed_count
  from public.orders o join public.order_items i on i.order_id=o.id
  where (p_customer_id is null or o.customer_id=p_customer_id)
   and (p_from is null or o.created_at>=p_from) and (p_until is null or o.created_at<p_until)
   and (p_status='all' or (p_status='invoiced' and o.invoiced) or (p_status='pending' and not o.invoiced))
  group by o.id
 ), page as(select * from summaries order by number desc limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from summaries),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

-- Selector limitado a clientes con notas. No concede acceso general a sus fichas.
create function public.billing_customers(p_query text default '',p_id uuid default null)
returns table(id uuid,display_name text,phone text) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 if p_query is null or length(p_query)>100 then raise exception using errcode='22023',message='Revisá la búsqueda.'; end if;
 return query select c.id,c.display_name,c.phone from public.customers c
 where exists(select 1 from public.orders o where o.customer_id=c.id)
  and (p_id is null or c.id=p_id)
  and (p_query='' or strpos(lower(c.display_name),lower(p_query))>0 or strpos(c.phone,p_query)>0)
 order by c.display_name,c.id limit 20;
end $$;
revoke all on function public.billing_queue(text,integer,uuid,timestamptz,timestamptz),public.billing_customers(text,uuid) from public,anon;
grant execute on function public.billing_queue(text,integer,uuid,timestamptz,timestamptz),public.billing_customers(text,uuid) to authenticated;
