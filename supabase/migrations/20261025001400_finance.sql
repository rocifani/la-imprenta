create table public.money_movements(
 id uuid primary key,kind text not null check(kind in ('deposit','payment','expense')),
 order_id uuid references public.orders(id),amount numeric(14,2) not null check(amount>0),
 paid_on date not null,method text not null check(method in ('cash','transfer','card','other')),
 description text not null default '' check(length(description)<=500),
 created_at timestamptz not null default now(),created_by uuid not null references auth.users(id),
 check((kind='expense' and order_id is null) or (kind<>'expense' and order_id is not null))
);
create unique index one_initial_deposit on public.money_movements(order_id) where kind='deposit';
create index movements_order on public.money_movements(order_id);
create index movements_date on public.money_movements(paid_on desc);
alter table public.money_movements enable row level security;
revoke all on public.money_movements from anon,authenticated;
grant all on public.money_movements to service_role;

create function private.record_income(p_id uuid,p_order_id uuid,p_amount numeric,p_paid_on date,p_method text,p_description text,p_kind text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype; received numeric; existing public.money_movements%rowtype;
begin
 if (p_kind='deposit' and not private.has_team_role('designer')) or (p_kind='payment' and not private.has_team_role('finance')) or p_kind not in ('deposit','payment') or p_kind is null then
  raise exception using errcode='42501',message='Sin permiso para registrar este cobro.';
 end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 select * into existing from public.money_movements where id=p_id;
 if found then
  if existing.order_id<>p_order_id or existing.kind<>p_kind then raise exception using errcode='23514',message='El movimiento pertenece a otro registro.'; end if;
  return existing.id;
 end if;
 if p_id is null or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount>=10000000000
  or p_paid_on is null or p_paid_on>(now() at time zone 'America/Argentina/Buenos_Aires')::date
  or p_method is null or p_method not in ('cash','transfer','card','other') or p_description is null or length(p_description)>500 then
  raise exception using errcode='22023',message='Revisá importe, fecha, medio de pago y comentario.';
 end if;
 select coalesce(sum(amount),0) into received from public.money_movements where order_id=p_order_id;
 if received+p_amount>target.total then raise exception using errcode='23514',message='El cobro supera el saldo pendiente de la nota.'; end if;
 insert into public.money_movements(id,kind,order_id,amount,paid_on,method,description,created_by)
  values(p_id,p_kind,p_order_id,p_amount,p_paid_on,p_method,btrim(p_description),auth.uid());
 return p_id;
end $$;
revoke all on function private.record_income(uuid,uuid,numeric,date,text,text,text) from public,anon,authenticated;

create function public.record_payment(p_id uuid,p_order_id uuid,p_amount numeric,p_paid_on date,p_method text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 return private.record_income(p_id,p_order_id,p_amount,p_paid_on,p_method,p_description,'payment');
end $$;

create function private.initial_deposit(p_order_id uuid,p_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 if p_data is null then return; end if;
 if jsonb_typeof(p_data)<>'object' or coalesce(p_data->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
  or coalesce(p_data->>'paid_on','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  raise exception using errcode='22023',message='Revisá los datos de la seña.';
 end if;
 perform private.record_income(gen_random_uuid(),p_order_id,(p_data->>'amount')::numeric,(p_data->>'paid_on')::date,p_data->>'method','Seña al crear la nota','deposit');
end $$;
revoke all on function private.initial_deposit(uuid,jsonb) from public,anon,authenticated;

-- Altas atómicas: nota, cliente, trabajos y seña se confirman juntos.
alter function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb) set schema private;
alter function private.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb) rename to create_direct_order_without_deposit;
revoke all on function private.create_direct_order_without_deposit(uuid,uuid,jsonb,uuid,text,jsonb) from public,anon,authenticated;
create function public.create_direct_order(p_id uuid,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_notes text,p_items jsonb,p_deposit jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existed boolean; result uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 existed:=exists(select 1 from public.orders where id=p_id);
 result:=private.create_direct_order_without_deposit(p_id,p_customer_id,p_new_customer,p_new_customer_id,p_notes,p_items);
 if not existed then perform private.initial_deposit(result,p_deposit); end if;
 return result;
end $$;

alter function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) set schema private;
alter function private.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) rename to create_order_without_deposit;
revoke all on function private.create_order_without_deposit(uuid,integer,uuid,jsonb,uuid) from public,anon,authenticated;
create function public.create_order_from_quote(p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_deposit jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existed boolean; result uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform 1 from public.quotes where id=p_quote_id for update;
 existed:=exists(select 1 from public.orders where quote_id=p_quote_id);
 result:=private.create_order_without_deposit(p_quote_id,p_version,p_customer_id,p_new_customer,p_new_customer_id);
 if not existed then perform private.initial_deposit(result,p_deposit); end if;
 return result;
end $$;

create function public.order_money(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not(private.has_team_role('designer') or private.has_team_role('finance')) then raise exception using errcode='42501',message='Sin permiso para consultar el saldo.'; end if;
 select jsonb_build_object('total',o.total,'paid',coalesce(sum(m.amount),0),'deposit',coalesce(sum(m.amount) filter(where m.kind='deposit'),0),
  'balance',o.total-coalesce(sum(m.amount),0),'overdue',o.created_at<=now()-interval '15 days' and o.total>coalesce(sum(m.amount),0)) into result
 from public.orders o left join public.money_movements m on m.order_id=o.id where o.id=p_order_id group by o.id;
 return result;
end $$;

create function public.customer_money(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not(private.has_team_role('designer') or private.has_team_role('finance')) then raise exception using errcode='42501',message='Sin permiso para consultar el saldo.'; end if;
 select jsonb_build_object('total',coalesce(sum(o.total),0),'paid',coalesce(sum(p.amount),0),'balance',coalesce(sum(o.total-coalesce(p.amount,0)),0)) into result
 from public.orders o left join(select order_id,sum(amount) amount from public.money_movements group by order_id)p on p.order_id=o.id where o.customer_id=p_customer_id;
 return result;
end $$;

create function public.finance_orders(p_status text default 'unpaid',p_offset integer default 0,p_id uuid default null)
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
 select jsonb_build_object('total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.record_expense(p_id uuid,p_amount numeric,p_paid_on date,p_method text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_id is null then raise exception using errcode='22023',message='Falta identificar el egreso.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from public.money_movements where id=p_id and kind='expense') then return p_id; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount>=10000000000
  or p_paid_on is null or p_paid_on>(now() at time zone 'America/Argentina/Buenos_Aires')::date
  or p_method is null or p_method not in ('cash','transfer','card','other') or p_description is null or length(btrim(p_description)) not between 2 and 500 then
  raise exception using errcode='22023',message='Revisá importe, fecha, medio de pago y descripción.';
 end if;
 insert into public.money_movements(id,kind,amount,paid_on,method,description,created_by) values(p_id,'expense',p_amount,p_paid_on,p_method,btrim(p_description),auth.uid());
 return p_id;
end $$;

create function public.finance_month(p_month date,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; month_start date; month_end date;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_month is null or p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá el mes.'; end if;
 month_start:=date_trunc('month',p_month)::date; month_end:=(month_start+interval '1 month')::date;
 with filtered as(select m.*,o.number as order_number,o.customer_snapshot->>'display_name' as customer_name from public.money_movements m left join public.orders o on o.id=m.order_id where m.paid_on>=month_start and m.paid_on<month_end),
 page as(select * from filtered order by paid_on desc,created_at desc,id desc limit 20 offset p_offset)
 select jsonb_build_object('income',coalesce(sum(amount) filter(where kind<>'expense'),0),'expenses',coalesce(sum(amount) filter(where kind='expense'),0),
 'net',coalesce(sum(case when kind='expense' then -amount else amount end),0),'total',count(*),
 'movements',coalesce((select jsonb_agg(to_jsonb(page) order by paid_on desc,created_at desc,id desc) from page),'[]'::jsonb)) into result from filtered;
 return result;
end $$;

create function public.finance_receipts(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'amount',amount,'paid_on',paid_on,'method',method,'description',description) order by paid_on desc,created_at desc),'[]'::jsonb) from public.money_movements where order_id=p_order_id);
end $$;
revoke all on function public.record_payment(uuid,uuid,numeric,date,text,text),public.record_expense(uuid,numeric,date,text,text),public.order_money(uuid),public.customer_money(uuid),public.finance_orders(text,integer,uuid),public.finance_month(date,integer),public.finance_receipts(uuid),public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb) from public,anon;
grant execute on function public.record_payment(uuid,uuid,numeric,date,text,text),public.record_expense(uuid,numeric,date,text,text),public.order_money(uuid),public.customer_money(uuid),public.finance_orders(text,integer,uuid),public.finance_month(date,integer),public.finance_receipts(uuid),public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb) to authenticated;
