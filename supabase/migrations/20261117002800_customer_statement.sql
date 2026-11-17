-- Cuenta corriente comercial: cada cobro real aparece una sola vez.
create function private.customer_statement(p_customer_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with events as (
 select (o.created_at at time zone 'America/Argentina/Buenos_Aires')::date as date,o.created_at as recorded,o.id as key,0 as priority,'order'::text as kind,o.number as number,o.total as debit,0::numeric as credit,null::text as method,'[]'::jsonb as allocations
 from public.orders o where o.customer_id=p_customer_id
 union all
 select p.paid_on,p.created_at,p.id,1,'payment',null,0,p.amount,p.method,
 coalesce((select jsonb_agg(jsonb_build_object('number',o.number,'amount',m.amount) order by o.number,m.created_at,m.id) from public.money_movements m join public.orders o on o.id=m.order_id where m.customer_payment_id=p.id),'[]'::jsonb)
 from public.customer_payments p where p.customer_id=p_customer_id
 union all
 select m.paid_on,m.created_at,m.id,1,m.kind,o.number,0,m.amount,m.method,jsonb_build_array(jsonb_build_object('number',o.number,'amount',m.amount))
 from public.money_movements m join public.orders o on o.id=m.order_id
 where o.customer_id=p_customer_id and m.customer_payment_id is null and m.kind in ('deposit','payment')
 ), running as (
 select *,sum(debit-credit) over(order by date,recorded,priority,key rows unbounded preceding) as balance from events
 )
 select jsonb_build_object('debit',coalesce(sum(debit),0),'credit',coalesce(sum(credit),0),'balance',coalesce(sum(debit-credit),0),
 'entries',coalesce(jsonb_agg(jsonb_build_object('date',date,'kind',kind,'number',number,'debit',debit,'credit',credit,'method',method,'balance',balance,'allocations',allocations) order by date,recorded,priority,key),'[]'::jsonb)) from running;
$$;
revoke all on function private.customer_statement(uuid) from public,anon,authenticated;

do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.customer_completed_summary(uuid)'::regprocedure);
 definition:=replace(definition,'''generated_at'',now()', '''account'',private.customer_statement(p_customer_id),''generated_at'',now()');
 definition:=replace(definition,'o.created_at,o.total,', 'o.created_at,o.total, (select coalesce(jsonb_agg(jsonb_build_object(''date'',m.paid_on,''amount'',m.amount,''method'',m.method,''kind'',m.kind) order by m.paid_on,m.created_at,m.id),''[]''::jsonb) from public.money_movements m where m.order_id=o.id) as payments,');
 execute definition;
end $$;
