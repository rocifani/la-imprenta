create table public.customer_payments (
 id uuid primary key,
 customer_id uuid not null references public.customers(id),
 customer_name text not null,
 amount numeric(14,2) not null check(amount>0),
 paid_on date not null,
 method text not null check(method in ('cash','transfer','card','check','other')),
 description text not null default '' check(length(description)<=500),
 created_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id)
);
create index customer_payments_customer on public.customer_payments(customer_id,created_at,id);
alter table public.customer_payments enable row level security;
revoke all on public.customer_payments from public,anon,authenticated;
grant all on public.customer_payments to service_role;

alter table public.money_movements
 add column customer_payment_id uuid references public.customer_payments(id),
 drop constraint money_movements_kind_check,
 drop constraint money_movements_method_check,
 drop constraint money_movements_check;
alter table public.money_movements
 add constraint money_movements_kind_check check(kind in ('deposit','payment','expense','customer_credit','credit_application')),
 add constraint money_movements_method_check check(method in ('cash','transfer','card','check','other')),
 add constraint money_movements_order_check check(
  (kind='expense' and order_id is null and customer_payment_id is null)
  or (kind='customer_credit' and order_id is null and customer_payment_id is not null)
  or (kind in ('deposit','payment') and order_id is not null)
  or (kind='credit_application' and order_id is not null and customer_payment_id is not null)
 );
create index movements_customer_payment on public.money_movements(customer_payment_id);
create unique index one_customer_credit_income on public.money_movements(customer_payment_id) where kind='customer_credit';

-- El crédito disponible se calcula desde el cobro original y sus imputaciones.
-- La fila customer_credit representa ingreso de dinero, no una nueva deuda.
create function private.customer_credit(p_customer_id uuid)
returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(sum(p.amount-coalesce(a.applied,0)),0)
 from public.customer_payments p
 left join (
  select customer_payment_id,sum(amount) as applied
  from public.money_movements where kind in ('payment','credit_application')
  group by customer_payment_id
 ) a on a.customer_payment_id=p.id
 where p.customer_id=p_customer_id;
$$;
revoke all on function private.customer_credit(uuid) from public,anon,authenticated;

create function private.apply_customer_credit(p_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype; receipt public.customer_payments%rowtype;
 remaining numeric; available numeric; portion numeric;
begin
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 select target.total-coalesce(sum(amount),0) into remaining from public.money_movements where order_id=p_order_id;
 for receipt in select * from public.customer_payments where customer_id=target.customer_id order by created_at,id for update loop
  exit when remaining<=0;
  select receipt.amount-coalesce(sum(amount),0) into available
   from public.money_movements where customer_payment_id=receipt.id and kind in ('payment','credit_application');
  portion:=least(remaining,available);
  if portion>0 then
   insert into public.money_movements(id,kind,order_id,amount,paid_on,method,description,created_by,customer_payment_id)
   values(gen_random_uuid(),'credit_application',p_order_id,portion,receipt.paid_on,receipt.method,'Saldo a favor aplicado a la nota',auth.uid(),receipt.id);
   remaining:=remaining-portion;
  end if;
 end loop;
end $$;
revoke all on function private.apply_customer_credit(uuid) from public,anon,authenticated;

create function public.finance_customer_account(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 with balances as (
  select o.id,o.number,o.total-coalesce(sum(m.amount),0) as balance
  from public.orders o left join public.money_movements m on m.order_id=o.id
  where o.customer_id=p_customer_id group by o.id
 )
 select jsonb_build_object('customer',jsonb_build_object('id',c.id,'display_name',c.display_name,'phone',c.phone),
  'credit',private.customer_credit(c.id),
  'balance',coalesce((select sum(balance) from balances where balance>0),0),
  'orders',coalesce((select jsonb_agg(to_jsonb(b) order by b.number) from balances b where b.balance>0),'[]'::jsonb))
 into result from public.customers c where c.id=p_customer_id;
 return result;
end $$;

create function public.finance_customer_payment(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 select to_jsonb(p)-'created_by' || jsonb_build_object(
  'credit_remaining',p.amount-coalesce((select sum(amount) from public.money_movements where customer_payment_id=p.id and kind in ('payment','credit_application')),0),
  'allocations',coalesce((select jsonb_agg(jsonb_build_object('order_id',o.id,'number',o.number,'amount',m.amount,'kind',m.kind,'applied_at',m.created_at) order by o.number,m.created_at,m.id)
   from public.money_movements m join public.orders o on o.id=m.order_id where m.customer_payment_id=p.id),'[]'::jsonb))
 into result from public.customer_payments p where p.id=p_id;
 return result;
end $$;

create function public.record_customer_payment(p_id uuid,p_customer_id uuid,p_amount numeric,p_paid_on date,p_method text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.customer_payments%rowtype; client public.customers%rowtype;
 target public.orders%rowtype; remaining numeric; owed numeric; portion numeric;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_id is null or p_customer_id is null or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount>=10000000000
  or p_paid_on is null or p_paid_on>(now() at time zone 'America/Argentina/Buenos_Aires')::date
  or p_method is null or p_method not in ('cash','transfer','card','check','other') or p_description is null or length(p_description)>500 then
  raise exception using errcode='22023',message='Revisá cliente, importe, fecha y medio de pago.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.customer_payments where id=p_id;
 if found then
  if existing.customer_id<>p_customer_id or existing.amount<>p_amount or existing.paid_on<>p_paid_on
   or existing.method<>p_method or existing.description<>btrim(p_description) then
   raise exception using errcode='23514',message='Este cobro ya fue registrado con otros datos. Recargá el formulario.';
  end if;
  return existing.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text,91827));
 select * into client from public.customers where id=p_customer_id;
 if not found then raise exception using errcode='P0002',message='El cliente no existe.'; end if;
 -- El mismo orden de bloqueo serializa cobros, cierres, ediciones y altas con crédito.
 perform 1 from public.orders where customer_id=p_customer_id order by number for update;
 for target in select * from public.orders where customer_id=p_customer_id order by number loop
  perform private.apply_customer_credit(target.id);
 end loop;
 insert into public.customer_payments(id,customer_id,customer_name,amount,paid_on,method,description,created_by)
 values(p_id,p_customer_id,client.display_name,p_amount,p_paid_on,p_method,btrim(p_description),auth.uid());
 remaining:=p_amount;
 for target in select * from public.orders where customer_id=p_customer_id order by number loop
  exit when remaining=0;
  select target.total-coalesce(sum(amount),0) into owed from public.money_movements where order_id=target.id;
  portion:=least(remaining,owed);
  if portion>0 then
   insert into public.money_movements(id,kind,order_id,amount,paid_on,method,description,created_by,customer_payment_id)
   values(gen_random_uuid(),'payment',target.id,portion,p_paid_on,p_method,btrim(p_description),auth.uid(),p_id);
   remaining:=remaining-portion;
  end if;
 end loop;
 if remaining>0 then
  insert into public.money_movements(id,kind,amount,paid_on,method,description,created_by,customer_payment_id)
  values(gen_random_uuid(),'customer_credit',remaining,p_paid_on,p_method,btrim(p_description),auth.uid(),p_id);
 end if;
 return p_id;
end $$;

-- Los cheques están disponibles en los formularios de movimientos existentes.
do $$
declare target regprocedure; definition text;
begin
 for target in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='private' and p.proname='record_income') or (n.nspname='public' and p.proname in ('record_expense','edit_order')) loop
  definition:=pg_get_functiondef(target);
  definition:=replace(definition,'''cash'',''transfer'',''card'',''other''','''cash'',''transfer'',''card'',''check'',''other''');
  execute definition;
 end loop;
end $$;

-- Las notas nuevas descuentan crédito luego de guardar IVA y seña.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'existed:=exists',
  'perform pg_advisory_xact_lock(hashtextextended(coalesce(p_customer_id,p_new_customer_id)::text,91827)); existed:=exists');
 definition:=replace(definition,'update public.order_items set technical_sheet=''{}''::jsonb where order_id=result;',
  'update public.order_items set technical_sheet=''{}''::jsonb where order_id=result; perform private.apply_customer_credit(result);');
 execute definition;
 definition:=pg_get_functiondef('public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid,text,jsonb,boolean[])'::regprocedure);
 definition:=replace(definition,'priced_items jsonb;','priced_items jsonb; credit_customer uuid;');
 definition:=replace(definition,'perform 1 from public.quotes',
  'select coalesce(q.customer_id,p_customer_id,p_new_customer_id) into credit_customer from public.quotes q where q.id=p_quote_id;
   perform pg_advisory_xact_lock(hashtextextended(credit_customer::text,91827)); perform 1 from public.quotes');
 definition:=replace(definition,'update public.order_items set technical_sheet=''{}''::jsonb where order_id=result;',
  'update public.order_items set technical_sheet=''{}''::jsonb where order_id=result; perform private.apply_customer_credit(result);');
 execute definition;
end $$;

-- Finanzas cuenta el dinero una sola vez, en la fecha del cobro original.
create or replace function public.finance_month(p_month date,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; month_start date; month_end date;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_month is null or p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá el mes.'; end if;
 month_start:=date_trunc('month',p_month)::date; month_end:=(month_start+interval '1 month')::date;
 with filtered as (
  select m.*,o.number as order_number,coalesce(o.customer_snapshot->>'display_name',cp.customer_name) as customer_name
  from public.money_movements m left join public.orders o on o.id=m.order_id
  left join public.customer_payments cp on cp.id=m.customer_payment_id
  where m.paid_on>=month_start and m.paid_on<month_end and m.kind<>'credit_application'
 ), page as(select * from filtered order by paid_on desc,created_at desc,id desc limit 20 offset p_offset)
 select jsonb_build_object('income',coalesce(sum(amount) filter(where kind<>'expense'),0),
  'expenses',coalesce(sum(amount) filter(where kind='expense'),0),
  'net',coalesce(sum(case when kind='expense' then -amount else amount end),0),'total',count(*),
  'movements',coalesce((select jsonb_agg(to_jsonb(page) order by paid_on desc,created_at desc,id desc) from page),'[]'::jsonb)) into result from filtered;
 return result;
end $$;

-- Los saldos disponibles se muestran junto a la deuda del cliente.
do $$
declare target regprocedure; definition text;
begin
 for target in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('customer_money','customer_completed_summary','customer_work_summary') loop
  definition:=pg_get_functiondef(target);
  if position('''generated_at''' in definition)>0 then
   definition:=replace(definition,'''generated_at'',now()', '''credit'',private.customer_credit(p_customer_id),''generated_at'',now()');
  else
   definition:=replace(definition,'''total'',coalesce', '''credit'',private.customer_credit(p_customer_id),''total'',coalesce');
  end if;
  execute definition;
 end loop;
end $$;
revoke all on function public.finance_customer_account(uuid),public.finance_customer_payment(uuid),public.record_customer_payment(uuid,uuid,numeric,date,text,text) from public,anon;
grant execute on function public.finance_customer_account(uuid),public.finance_customer_payment(uuid),public.record_customer_payment(uuid,uuid,numeric,date,text,text) to authenticated;
create or replace function public.finance_receipts(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'customer_payment_id',customer_payment_id,
  'amount',amount,'paid_on',paid_on,'method',method,'description',description) order by paid_on desc,created_at desc,id desc),'[]'::jsonb)
  from public.money_movements where order_id=p_order_id);
end $$;
