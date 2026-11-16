drop function public.finance_orders(text,integer,uuid);
create or replace function public.finance_orders(p_status text default 'unpaid',p_offset integer default 0,p_id uuid default null,p_customer_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_status is null or p_status not in ('all','unpaid','overdue') or p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá los filtros.'; end if;
 with balances as(
 select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,o.total,
  coalesce(sum(m.amount),0) as paid,o.total-coalesce(sum(m.amount),0) as balance,
  o.created_at<=now()-interval '15 days' and o.total>coalesce(sum(m.amount),0) as overdue
 from public.orders o left join public.money_movements m on m.order_id=o.id where (p_id is null or o.id=p_id) and (p_customer_id is null or o.customer_id=p_customer_id) group by o.id
 ),filtered as(select * from balances where p_status='all' or(p_status='unpaid' and balance>0) or(p_status='overdue' and overdue)),
 page as(select * from filtered order by number desc limit 20 offset p_offset)
 select jsonb_build_object('pending_balance',(select coalesce(sum(balance),0) from balances where balance>0),'total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

revoke all on function public.finance_orders(text,integer,uuid,uuid) from public,anon;
grant execute on function public.finance_orders(text,integer,uuid,uuid) to authenticated;

create function public.finance_customers(p_query text default '',p_id uuid default null)
returns table(id uuid,display_name text,phone text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then
  raise exception using errcode='42501',message='Necesitás el rol Finanzas.';
 end if;
 if p_query is null or length(p_query)>100 then
  raise exception using errcode='22023',message='Revisá la búsqueda del cliente.';
 end if;
 return query select c.id,c.display_name,c.phone from public.customers c
 where exists(select 1 from public.orders o where o.customer_id=c.id)
  and (p_id is null or c.id=p_id)
  and (p_query='' or strpos(lower(c.display_name),lower(p_query))>0 or strpos(c.phone,p_query)>0)
 order by c.display_name,c.id limit 20;
end $$;
revoke all on function public.finance_customers(text,uuid) from public,anon;
grant execute on function public.finance_customers(text,uuid) to authenticated;
