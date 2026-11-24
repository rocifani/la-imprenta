-- La deuda nace al terminar producción; los cobros conservan su fecha e importe real.
create function private.completed_charge(p_order_id uuid)
returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(sum(amount),0) from public.order_items where order_id=p_order_id and production_status='completed';
$$;
revoke all on function private.completed_charge(uuid) from public,anon,authenticated;

create view private.completed_balances as
 select o.id,o.number,o.customer_id,o.created_at,o.customer_snapshot,
 private.completed_charge(o.id) as total,
 coalesce(p.paid,0) as paid,private.completed_charge(o.id)-coalesce(p.paid,0) as balance,
 exists(select 1 from public.order_items i where i.order_id=o.id and i.production_status='completed') as has_completed
 from public.orders o left join(select order_id,sum(amount) paid from public.money_movements group by order_id)p on p.order_id=o.id;
revoke all on private.completed_balances from public,anon,authenticated;

create or replace function public.finance_orders(p_status text default 'unpaid',p_offset integer default 0,p_id uuid default null,p_customer_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_status is null or p_status not in ('all','unpaid','overdue') or p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá los filtros.'; end if;
 with balances as(
 select b.id,b.number,b.created_at,b.customer_snapshot->>'display_name' as customer_name,b.total,b.paid,b.balance,
 b.created_at<=now()-interval '15 days' and b.balance>0 as overdue
 from private.completed_balances b where b.has_completed and (p_id is null or b.id=p_id) and (p_customer_id is null or b.customer_id=p_customer_id)
 ),filtered as(select * from balances where p_status='all' or(p_status='unpaid' and balance>0) or(p_status='overdue' and overdue)),
 page as(select * from filtered order by number desc limit 20 offset p_offset)
 select jsonb_build_object('pending_balance',(select coalesce(sum(balance),0) from balances where balance>0),'total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

create or replace function public.finance_customer_account(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 select jsonb_build_object('customer',jsonb_build_object('id',c.id,'display_name',c.display_name,'phone',c.phone),
 'credit',private.customer_credit(c.id),'balance',coalesce((select sum(balance) from private.completed_balances where customer_id=c.id and balance>0),0),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'number',b.number,'balance',b.balance) order by b.number) from private.completed_balances b where b.customer_id=c.id and b.has_completed and b.balance>0),'[]'::jsonb))
 into result from public.customers c where c.id=p_customer_id;
 return result;
end $$;

-- Los cobros nuevos y el crédito solo se imputan hasta el importe terminado.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('private.apply_customer_credit(uuid)'::regprocedure);
 definition:=replace(definition,'target.total-coalesce(sum(amount),0)','private.completed_charge(p_order_id)-coalesce(sum(amount),0)');execute definition;
 definition:=pg_get_functiondef('public.record_customer_payment(uuid,uuid,numeric,date,text,text)'::regprocedure);
 definition:=replace(definition,'target.total-coalesce(sum(amount),0)','private.completed_charge(target.id)-coalesce(sum(amount),0)');execute definition;
 definition:=pg_get_functiondef('private.record_income(uuid,uuid,numeric,date,text,text,text)'::regprocedure);
 definition:=replace(definition,'if received+p_amount>target.total then','if received+p_amount>(case when p_kind=''payment'' then private.completed_charge(p_order_id) else target.total end) then');execute definition;
 -- Orden de bloqueo compartido con los cobros: cliente, luego nota.
 definition:=pg_get_functiondef('public.complete_production(uuid,uuid,text)'::regprocedure);
 definition:=replace(definition,'perform 1 from public.orders where id=p_order_id for update;',
 'perform pg_advisory_xact_lock(hashtextextended((select customer_id::text from public.orders where id=p_order_id),91827)); perform 1 from public.orders where id=p_order_id for update;');
 definition:=replace(definition,'return p_order_id;', 'perform private.apply_customer_credit(p_order_id); return p_order_id;');execute definition;
end $$;

create or replace function public.customer_money(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not(private.has_team_role('designer') or private.has_team_role('finance')) then raise exception using errcode='42501',message='Sin permiso para consultar el saldo.'; end if;
 select jsonb_build_object('total',coalesce(sum(total),0),'paid',coalesce(sum(paid),0),'balance',coalesce(sum(balance),0),'credit',private.customer_credit(p_customer_id)) into result from private.completed_balances where customer_id=p_customer_id;
 return result;
end $$;

-- Cuenta corriente comercial: cada cobro real aparece una sola vez.
create or replace function private.customer_statement(p_customer_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with events as (
 select (coalesce(i.completed_at,o.created_at) at time zone 'America/Argentina/Buenos_Aires')::date as date,coalesce(i.completed_at,o.created_at) as recorded,i.id as key,0 as priority,'order'::text as kind,coalesce(nullif(i.client_description,''),i.description) as description,o.number as number,i.amount as debit,0::numeric as credit,null::text as method,'[]'::jsonb as allocations
 from public.orders o join public.order_items i on i.order_id=o.id and i.production_status='completed' where o.customer_id=p_customer_id
 union all
 select p.paid_on,p.created_at,p.id,1,'payment','Pago por cliente',null,0,p.amount,p.method,
 coalesce((select jsonb_agg(jsonb_build_object('number',o.number,'amount',m.amount) order by o.number,m.created_at,m.id) from public.money_movements m join public.orders o on o.id=m.order_id where m.customer_payment_id=p.id and exists(select 1 from public.order_items ci where ci.order_id=o.id and ci.production_status='completed')),'[]'::jsonb)
 from public.customer_payments p where p.customer_id=p_customer_id
 union all
 select m.paid_on,m.created_at,m.id,1,m.kind,case when m.kind='deposit' then 'Seña' else 'Pago' end,case when private.completed_charge(o.id)>0 then o.number else null end,0,m.amount,m.method,case when private.completed_charge(o.id)>0 then jsonb_build_array(jsonb_build_object('number',o.number,'amount',m.amount)) else '[]'::jsonb end
 from public.money_movements m join public.orders o on o.id=m.order_id
 where o.customer_id=p_customer_id and m.customer_payment_id is null and m.kind in ('deposit','payment')
 ), running as (
 select *,sum(debit-credit) over(order by date,recorded,priority,key rows unbounded preceding) as balance from events
 )
 select jsonb_build_object('debit',coalesce(sum(debit),0),'credit',coalesce(sum(credit),0),'balance',coalesce(sum(debit-credit),0),
 'entries',coalesce(jsonb_agg(jsonb_build_object('date',date,'description',description,'kind',kind,'number',number,'debit',debit,'credit',credit,'method',method,'balance',balance,'allocations',allocations) order by date,recorded,priority,key),'[]'::jsonb)) from running;
$$;
revoke all on function private.customer_statement(uuid) from public,anon,authenticated;

create or replace function public.customer_completed_summary(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 with notes as (
 select b.id,b.number,b.created_at,b.total,b.paid,b.balance,b.total as completed_total,
 (select coalesce(jsonb_agg(jsonb_build_object('description',coalesce(nullif(i.client_description,''),i.description),'quantity',i.quantity,'amount',i.amount) order by i.position),'[]'::jsonb) from public.order_items i where i.order_id=b.id and i.production_status='completed') as items,
 (select coalesce(jsonb_agg(jsonb_build_object('date',m.paid_on,'amount',m.amount,'method',m.method,'kind',m.kind) order by m.paid_on,m.created_at,m.id),'[]'::jsonb) from public.money_movements m where m.order_id=b.id) as payments
 from private.completed_balances b where b.customer_id=p_customer_id and b.has_completed and b.balance<>0
 )
 select jsonb_build_object('generated_at',now(),'account',private.customer_statement(c.id),
 -- Anticipos en notas sin terminar y crédito libre: se muestran a favor, nunca como deuda.
 'credit',private.customer_credit(c.id)+coalesce((select sum(paid) from private.completed_balances where customer_id=c.id and not has_completed),0),
 'customer',jsonb_build_object('id',c.id,'name',c.display_name,'cuit',c.cuit,'phone',c.phone,'email',c.email,'address',c.address),
 'balance',coalesce((select sum(balance) from notes),0),'orders',coalesce((select jsonb_agg(to_jsonb(n) order by n.number) from notes n),'[]'::jsonb)) into result from public.customers c where c.id=p_customer_id;
 return result;
end $$;

-- La ficha interna conserva el seguimiento de producción, pero no lo presenta como deuda.
create or replace function public.customer_work_summary(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 with notes as(
 select b.id,b.number,b.created_at,b.total,b.paid,b.balance,
 (select count(*) from public.order_items i where i.order_id=b.id and i.production_status<>'completed') as pending_count,
 (select coalesce(jsonb_agg(jsonb_build_object('description',coalesce(nullif(i.client_description,''),i.description),'quantity',i.quantity,'completed',i.production_status='completed') order by i.position),'[]'::jsonb) from public.order_items i where i.order_id=b.id) as items
 from private.completed_balances b where b.customer_id=p_customer_id
 )
 select jsonb_build_object('generated_at',now(),'credit',private.customer_credit(c.id),'customer',jsonb_build_object('id',c.id,'name',c.display_name,'cuit',c.cuit,'phone',c.phone,'email',c.email,'address',c.address),
 'balance',coalesce((select sum(greatest(balance,0)) from notes),0),'pending_count',coalesce((select sum(pending_count) from notes),0),
 'orders',coalesce((select jsonb_agg(to_jsonb(n) order by n.number) from notes n where n.balance>0 or n.pending_count>0),'[]'::jsonb)) into result from public.customers c where c.id=p_customer_id;
 return result;
end $$;

do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.order_money(uuid)'::regprocedure);
 definition:=replace(definition,'''total'',o.total', '''due_total'',private.completed_charge(o.id),''due_balance'',greatest(private.completed_charge(o.id)-coalesce(sum(m.amount),0),0),''advance'',greatest(coalesce(sum(m.amount),0)-private.completed_charge(o.id),0),''total'',o.total');
 definition:=replace(definition,'o.total>coalesce(sum(m.amount),0)','private.completed_charge(o.id)>coalesce(sum(m.amount),0)');
 execute definition;
end $$;
