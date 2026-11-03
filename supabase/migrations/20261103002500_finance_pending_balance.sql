create or replace function public.finance_orders(p_status text default 'unpaid',p_offset integer default 0,p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_status is null or p_status not in ('all','unpaid','overdue') or p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá los filtros.'; end if;
 with balances as(
 select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,o.total,
  coalesce(sum(m.amount),0) as paid,o.total-coalesce(sum(m.amount),0) as balance,
  o.created_at<=now()-interval '15 days' and o.total>coalesce(sum(m.amount),0) as overdue
 from public.orders o left join public.money_movements m on m.order_id=o.id where p_id is null or o.id=p_id group by o.id
 ),filtered as(select * from balances where p_status='all' or(p_status='unpaid' and balance>0) or(p_status='overdue' and overdue)),
 page as(select * from filtered order by number desc limit 20 offset p_offset)
 select jsonb_build_object('pending_balance',(select coalesce(sum(balance),0) from balances where balance>0),'total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;
