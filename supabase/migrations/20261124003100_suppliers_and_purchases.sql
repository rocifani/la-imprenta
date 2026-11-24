alter table public.customers add column is_customer boolean not null default true,add column is_supplier boolean not null default false,
 add constraint contact_has_role check(is_customer or is_supplier);
alter table public.money_movements add column supplier_id uuid references public.customers(id),
 add constraint supplier_expense_only check(supplier_id is null or kind='expense');
create index movements_supplier on public.money_movements(supplier_id);
create table public.supplier_purchases(
 id uuid primary key,number bigint generated always as identity unique,supplier_id uuid not null references public.customers(id),
 purchased_on date not null,amount numeric(14,2) not null check(amount>0),description text not null check(length(btrim(description)) between 2 and 1000),reference text not null default '' check(length(reference)<=120),
 initial_payment jsonb,created_at timestamptz not null default now(),created_by uuid not null references auth.users(id)
);
create index purchases_supplier on public.supplier_purchases(supplier_id,number);
create table public.supplier_payment_allocations(
 movement_id uuid not null references public.money_movements(id),purchase_id uuid not null references public.supplier_purchases(id),amount numeric(14,2) not null check(amount>0),primary key(movement_id,purchase_id)
);
create table public.contact_setoffs(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),purchase_id uuid not null references public.supplier_purchases(id),amount numeric(14,2) not null check(amount>0),
 created_at timestamptz not null default now(),created_by uuid not null references auth.users(id)
);
create index setoffs_order on public.contact_setoffs(order_id);
create index setoffs_purchase on public.contact_setoffs(purchase_id);
alter table public.supplier_purchases enable row level security;
alter table public.supplier_payment_allocations enable row level security;
alter table public.contact_setoffs enable row level security;
revoke all on public.supplier_purchases,public.supplier_payment_allocations,public.contact_setoffs from public,anon,authenticated;
grant all on public.supplier_purchases,public.supplier_payment_allocations,public.contact_setoffs to service_role;

-- Compartir la validación de contactos sin abrir las tablas a Finanzas.
do $$ declare definition text; begin
 definition:=pg_get_functiondef('public.save_customer(uuid,integer,jsonb)'::regprocedure);
 definition:=replace(definition,'public.save_customer','private.save_contact_fields');
 definition:=replace(definition,'if not private.has_team_role(''designer'') then','if not (private.has_team_role(''designer'') or private.has_team_role(''finance'')) then');
 execute definition;
end $$;
revoke all on function private.save_contact_fields(uuid,integer,jsonb) from public,anon,authenticated;

create function private.save_contact(p_id uuid,p_version integer,p_data jsonb,p_supplier boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.customers%rowtype; existed boolean; client_flag boolean; supplier_flag boolean; result uuid;
begin
 if (p_supplier and not private.has_team_role('finance')) or (not p_supplier and not private.has_team_role('designer')) then raise exception using errcode='42501',message='Sin permiso para guardar este contacto.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into old from public.customers where id=p_id for update; existed:=found;
 if p_supplier and existed and not old.is_supplier then raise exception using errcode='23514',message='Vinculá el contacto existente como proveedor antes de editarlo.'; end if;
 if existed and p_version is null then return old.id; end if;
 if (p_data ? 'is_customer' and jsonb_typeof(p_data->'is_customer')<>'boolean') or (p_data ? 'is_supplier' and jsonb_typeof(p_data->'is_supplier')<>'boolean') then raise exception using errcode='22023',message='Revisá el tipo de contacto.'; end if;
 client_flag:=coalesce((p_data->>'is_customer')::boolean,old.is_customer,not p_supplier);
 supplier_flag:=coalesce((p_data->>'is_supplier')::boolean,old.is_supplier,p_supplier);
 if not(client_flag or supplier_flag) then raise exception using errcode='22023',message='Marcá Cliente, Proveedor o ambos.'; end if;
 if not client_flag and (exists(select 1 from public.orders where customer_id=p_id) or exists(select 1 from public.quotes where customer_id=p_id)) then raise exception using errcode='23514',message='Conservá la marca Cliente porque tiene presupuestos o pedidos.'; end if;
 if not supplier_flag and (exists(select 1 from public.supplier_purchases where supplier_id=p_id) or exists(select 1 from public.money_movements where supplier_id=p_id)) then raise exception using errcode='23514',message='Conservá la marca Proveedor porque tiene compras o pagos.'; end if;
 result:=private.save_contact_fields(p_id,p_version,p_data);
 update public.customers set is_customer=client_flag,is_supplier=supplier_flag where id=result;
 return result;
end $$;
revoke all on function private.save_contact(uuid,integer,jsonb,boolean) from public,anon,authenticated;
create or replace function public.save_customer(p_id uuid,p_version integer,p_data jsonb)
returns uuid language sql security definer set search_path='' as $$ select private.save_contact(p_id,p_version,p_data,false); $$;
create function public.save_supplier(p_id uuid,p_version integer,p_data jsonb)
returns uuid language sql security definer set search_path='' as $$ select private.save_contact(p_id,p_version,p_data,true); $$;
create function public.enable_supplier(p_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 update public.customers set is_supplier=true,version=version+1 where id=p_id and not is_supplier;
 if not exists(select 1 from public.customers where id=p_id) then raise exception using errcode='P0002',message='El contacto no existe.'; end if;
 return p_id;
end $$;
create function public.supplier_contacts(p_query text default '',p_id uuid default null,p_all boolean default false)
returns table(id uuid,display_name text,phone text,contact_name text) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_query is null or length(p_query)>100 or p_all is null then raise exception using errcode='22023',message='Revisá la búsqueda.'; end if;
 return query select c.id,c.display_name,c.phone,c.contact_name from public.customers c where (p_all or c.is_supplier) and (p_id is null or c.id=p_id) and (p_query='' or strpos(lower(c.display_name),lower(p_query))>0 or strpos(c.phone,p_query)>0) order by c.display_name,c.id limit 20;
end $$;
create function private.require_customer_contact() returns trigger language plpgsql set search_path='' as $$
begin
 if new.customer_id is not null and not exists(select 1 from public.customers where id=new.customer_id and is_customer) then raise exception using errcode='23514',message='Marcá este contacto como Cliente antes de asignarle un presupuesto o pedido.'; end if; return new;
end $$;
create trigger orders_customer_type before insert or update of customer_id on public.orders for each row execute function private.require_customer_contact();
create trigger quotes_customer_type before insert or update of customer_id on public.quotes for each row execute function private.require_customer_contact();

create function private.order_setoff(p_order_id uuid) returns numeric language sql stable security definer set search_path='' as $$ select coalesce(sum(amount),0) from public.contact_setoffs where order_id=p_order_id; $$;
create function private.purchase_balance(p_purchase_id uuid) returns numeric language sql stable security definer set search_path='' as $$
 select p.amount-coalesce((select sum(amount) from public.supplier_payment_allocations where purchase_id=p.id),0)-coalesce((select sum(amount) from public.contact_setoffs where purchase_id=p.id),0) from public.supplier_purchases p where p.id=p_purchase_id;
$$;
create function private.supplier_advance(p_supplier_id uuid) returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(sum(m.amount-coalesce(a.amount,0)),0) from public.money_movements m left join(select movement_id,sum(amount) amount from public.supplier_payment_allocations group by movement_id)a on a.movement_id=m.id where m.supplier_id=p_supplier_id and m.kind='expense';
$$;
create or replace view private.completed_balances as
 select o.id,o.number,o.customer_id,o.created_at,o.customer_snapshot,private.completed_charge(o.id) as total,coalesce(p.paid,0) as paid,
 private.completed_charge(o.id)-coalesce(p.paid,0)-private.order_setoff(o.id) as balance,
 exists(select 1 from public.order_items i where i.order_id=o.id and i.production_status='completed') as has_completed,private.order_setoff(o.id) as settled
 from public.orders o left join(select order_id,sum(amount) paid from public.money_movements group by order_id)p on p.order_id=o.id;

create function private.reconcile_contact(p_contact_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare purchase public.supplier_purchases%rowtype; movement public.money_movements%rowtype; target public.orders%rowtype; remaining numeric; available numeric; portion numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_contact_id::text,91827));
 perform 1 from public.orders where customer_id=p_contact_id order by number for update;
 perform 1 from public.supplier_purchases where supplier_id=p_contact_id order by number for update;
 -- Imputar dinero pagado al proveedor antes de cruzar deudas.
 for purchase in select * from public.supplier_purchases where supplier_id=p_contact_id order by number loop
  remaining:=private.purchase_balance(purchase.id);
  for movement in select * from public.money_movements where supplier_id=p_contact_id and kind='expense' order by paid_on,created_at,id for update loop
   exit when remaining<=0;
   select movement.amount-coalesce(sum(amount),0) into available from public.supplier_payment_allocations where movement_id=movement.id;
   portion:=least(remaining,available);
   if portion>0 then
    insert into public.supplier_payment_allocations(movement_id,purchase_id,amount) values(movement.id,purchase.id,portion) on conflict(movement_id,purchase_id) do update set amount=public.supplier_payment_allocations.amount+excluded.amount;
    remaining:=remaining-portion;
   end if;
  end loop;
 end loop;
 for target in select * from public.orders where customer_id=p_contact_id order by number loop perform private.apply_customer_credit(target.id); end loop;
 if not exists(select 1 from public.customers where id=p_contact_id and is_customer and is_supplier) then return; end if;
 for purchase in select * from public.supplier_purchases where supplier_id=p_contact_id order by number loop
  remaining:=private.purchase_balance(purchase.id);
  for target in select * from public.orders where customer_id=p_contact_id order by number loop
   exit when remaining<=0;
   select private.completed_charge(target.id)-coalesce(sum(amount),0)-private.order_setoff(target.id) into available from public.money_movements where order_id=target.id;
   portion:=least(remaining,available);
   if portion>0 then insert into public.contact_setoffs(order_id,purchase_id,amount,created_by) values(target.id,purchase.id,portion,auth.uid()); remaining:=remaining-portion; end if;
  end loop;
 end loop;
end $$;

create function public.record_supplier_payment(p_id uuid,p_supplier_id uuid,p_amount numeric,p_paid_on date,p_method text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.money_movements%rowtype;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_supplier_id is null or not exists(select 1 from public.customers where id=p_supplier_id and is_supplier) then raise exception using errcode='22023',message='Elegí un proveedor válido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));perform pg_advisory_xact_lock(hashtextextended(p_supplier_id::text,91827));
 select * into existing from public.money_movements where id=p_id;
 if found then
  if existing.supplier_id is distinct from p_supplier_id or existing.amount is distinct from p_amount or existing.paid_on is distinct from p_paid_on or existing.method is distinct from p_method or existing.description is distinct from btrim(p_description) then raise exception using errcode='23514',message='Este pago ya existe con otros datos.'; end if; return p_id;
 end if;
 perform public.record_expense(p_id,p_amount,p_paid_on,p_method,p_description);
 update public.money_movements set supplier_id=p_supplier_id where id=p_id;
 perform private.reconcile_contact(p_supplier_id);
 return p_id;
end $$;

create function public.record_supplier_purchase(p_id uuid,p_supplier_id uuid,p_amount numeric,p_purchased_on date,p_description text,p_reference text,p_payment jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.supplier_purchases%rowtype;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_id is null or p_supplier_id is null or not exists(select 1 from public.customers where id=p_supplier_id and is_supplier) or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount>=10000000000 or p_purchased_on is null or p_purchased_on>(now() at time zone 'America/Argentina/Buenos_Aires')::date or p_description is null or length(btrim(p_description)) not between 2 and 1000 or p_reference is null or length(p_reference)>120 then raise exception using errcode='22023',message='Revisá proveedor, fecha, descripción e importe de la compra.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));perform pg_advisory_xact_lock(hashtextextended(p_supplier_id::text,91827));
 select * into existing from public.supplier_purchases where id=p_id;
 if found then
  if existing.supplier_id<>p_supplier_id or existing.amount<>p_amount or existing.purchased_on<>p_purchased_on or existing.description<>btrim(p_description) or existing.reference<>btrim(p_reference) or existing.initial_payment is distinct from p_payment then raise exception using errcode='23514',message='Esta compra ya existe con otros datos.'; end if; return p_id;
 end if;
 if p_payment is not null and exists(select 1 from public.money_movements where id=p_id) then raise exception using errcode='23514',message='El identificador del pago ya está en uso. Recargá el formulario.'; end if;
 insert into public.supplier_purchases(id,supplier_id,amount,purchased_on,description,reference,initial_payment,created_by) values(p_id,p_supplier_id,p_amount,p_purchased_on,btrim(p_description),btrim(p_reference),p_payment,auth.uid());
 if p_payment is not null then
  if jsonb_typeof(p_payment)<>'object' or coalesce(p_payment->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' or coalesce(p_payment->>'paid_on','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (p_payment->>'amount')::numeric>p_amount then raise exception using errcode='22023',message='Revisá el pago de la compra.'; end if;
  -- Registrar el dinero sin cruzar deudas antes de aplicar este pago.
  perform public.record_expense(p_id,(p_payment->>'amount')::numeric,(p_payment->>'paid_on')::date,p_payment->>'method','Pago de compra: '||left(btrim(p_description),450));
  update public.money_movements set supplier_id=p_supplier_id where id=p_id;
  insert into public.supplier_payment_allocations(movement_id,purchase_id,amount) values(p_id,p_id,(p_payment->>'amount')::numeric);
 end if;
 perform private.reconcile_contact(p_supplier_id);
 return p_id;
end $$;

-- Usar los importes cruzados en todos los saldos y límites de cobro existentes.
do $$ declare definition text; target regprocedure; begin
 definition:=pg_get_functiondef('private.apply_customer_credit(uuid)'::regprocedure);
 definition:=replace(definition,'private.completed_charge(p_order_id)-coalesce(sum(amount),0)','private.completed_charge(p_order_id)-coalesce(sum(amount),0)-private.order_setoff(p_order_id)');execute definition;
 definition:=pg_get_functiondef('public.record_customer_payment(uuid,uuid,numeric,date,text,text)'::regprocedure);
 definition:=replace(definition,'private.completed_charge(target.id)-coalesce(sum(amount),0)','private.completed_charge(target.id)-coalesce(sum(amount),0)-private.order_setoff(target.id)');execute definition;
 definition:=pg_get_functiondef('private.record_income(uuid,uuid,numeric,date,text,text,text)'::regprocedure);
 definition:=replace(definition,'select * into target from public.orders where id=p_order_id for update;', 'perform pg_advisory_xact_lock(hashtextextended((select customer_id::text from public.orders where id=p_order_id),91827)); select * into target from public.orders where id=p_order_id for update;');
 definition:=replace(definition,'then private.completed_charge(p_order_id) else target.total','then private.completed_charge(p_order_id)-private.order_setoff(p_order_id) else target.total');execute definition;
 definition:=pg_get_functiondef('public.complete_production(uuid,uuid,text)'::regprocedure);
 definition:=replace(definition,'return p_order_id;', 'perform private.reconcile_contact((select customer_id from public.orders where id=p_order_id)); return p_order_id;');execute definition;
 for target in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('finance_orders','customer_completed_summary','customer_work_summary') loop
  definition:=pg_get_functiondef(target);
  definition:=replace(definition,'b.total,b.paid,b.balance','b.total,b.paid,b.settled,b.balance');execute definition;
 end loop;
 definition:=pg_get_functiondef('public.order_money(uuid)'::regprocedure);
 definition:=replace(definition,'''due_total'',','''settled'',private.order_setoff(o.id),''due_total'',');
 definition:=replace(definition,'private.completed_charge(o.id)-coalesce(sum(m.amount),0)','private.completed_charge(o.id)-coalesce(sum(m.amount),0)-private.order_setoff(o.id)');
 definition:=replace(definition,'''balance'',o.total-coalesce(sum(m.amount),0)', '''balance'',o.total-coalesce(sum(m.amount),0)-private.order_setoff(o.id)');
 definition:=replace(definition,'private.completed_charge(o.id)>coalesce(sum(m.amount),0)', 'private.completed_charge(o.id)>coalesce(sum(m.amount),0)+private.order_setoff(o.id)');execute definition;
 definition:=pg_get_functiondef('public.finance_month(date,integer)'::regprocedure);
 definition:=replace(definition,'coalesce(o.customer_snapshot->>''display_name'',cp.customer_name)', 'coalesce(o.customer_snapshot->>''display_name'',cp.customer_name,vendor.display_name)');
 definition:=replace(definition,'where m.paid_on>=month_start','left join public.customers vendor on vendor.id=m.supplier_id where m.paid_on>=month_start');execute definition;
end $$;

-- Cuenta corriente única: ventas terminadas y pagos a proveedor en Debe;
-- compras y cobros al cliente en Haber. Los cruces son imputaciones, no dinero.
alter function private.customer_statement(uuid) rename to customer_statement_sales;
create function private.customer_statement(p_customer_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with events as(
 select (e->>'date')::date as date,e->>'description' as description,e->>'kind' as kind,(e->>'number')::bigint as number,(e->>'debit')::numeric as debit,(e->>'credit')::numeric as credit,e->>'method' as method,e->'allocations' as allocations,0 as source,ordinality as seq
 from jsonb_array_elements(private.customer_statement_sales(p_customer_id)->'entries') with ordinality as t(e,ordinality)
 union all select p.purchased_on,p.description||case when p.reference<>'' then ' · '||p.reference else '' end,'purchase',p.number,0,p.amount,null,'[]'::jsonb,1,p.number from public.supplier_purchases p where p.supplier_id=p_customer_id
 union all select m.paid_on,'Pago al proveedor','supplier_payment',null,m.amount,0,m.method,'[]'::jsonb,2,row_number() over(order by m.paid_on,m.created_at,m.id) from public.money_movements m where m.supplier_id=p_customer_id and m.kind='expense'
 ), running as(select *,sum(debit-credit) over(order by date,source,seq rows unbounded preceding) as balance from events)
 select jsonb_build_object('debit',coalesce(sum(debit),0),'credit',coalesce(sum(credit),0),'balance',coalesce(sum(debit-credit),0),'entries',coalesce(jsonb_agg(jsonb_build_object('date',date,'description',description,'kind',kind,'number',number,'debit',debit,'credit',credit,'method',method,'balance',balance,'allocations',allocations) order by date,source,seq),'[]'::jsonb)) from running;
$$;

create function public.supplier_directory(p_query text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_query is null or length(p_query)>100 or p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá la búsqueda.'; end if;
 with filtered as(select * from public.customers where is_supplier and (p_query='' or strpos(lower(display_name),lower(p_query))>0 or strpos(phone,p_query)>0 or strpos(cuit,p_query)>0)),page as(select id,display_name,phone,contact_name,is_customer,is_supplier from filtered order by display_name,id limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from filtered),'suppliers',coalesce((select jsonb_agg(to_jsonb(page) order by display_name,id) from page),'[]'::jsonb)) into result;return result;
end $$;
create function public.supplier_account(p_id uuid,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 if p_offset is null or p_offset<0 or p_offset>2000000 then raise exception using errcode='22023',message='Revisá la página.'; end if;
 select jsonb_build_object('contact',to_jsonb(c)-'created_by','account',private.customer_statement(c.id),'advance',private.supplier_advance(c.id),'purchase_balance',coalesce((select sum(private.purchase_balance(p.id)) from public.supplier_purchases p where p.supplier_id=c.id),0),
 'purchase_count',(select count(*) from public.supplier_purchases where supplier_id=c.id),
 'purchases',coalesce((select jsonb_agg(to_jsonb(p) order by p.number desc) from (select sp.id,sp.number,sp.purchased_on,sp.amount,sp.description,sp.reference,private.purchase_balance(sp.id) as balance,coalesce((select sum(amount) from public.supplier_payment_allocations where purchase_id=sp.id),0) as paid,coalesce((select sum(amount) from public.contact_setoffs where purchase_id=sp.id),0) as settled,
 coalesce((select jsonb_agg(jsonb_build_object('order_number',o.number,'amount',s.amount) order by o.number,s.created_at,s.id) from public.contact_setoffs s join public.orders o on o.id=s.order_id where s.purchase_id=sp.id),'[]'::jsonb) as offsets
 from public.supplier_purchases sp where sp.supplier_id=c.id order by sp.number desc limit 20 offset p_offset)p),'[]'::jsonb)) into result from public.customers c where c.id=p_id and c.is_supplier;return result;
end $$;

-- Los recibos de nota muestran los cruces, sin agregarlos a los ingresos mensuales.
create or replace function public.finance_receipts(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('finance') then raise exception using errcode='42501',message='Necesitás el rol Finanzas.'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(r) order by paid_on desc,created_at desc,id),'[]'::jsonb) from(
 select id,kind,customer_payment_id,amount,paid_on,method,description,created_at from public.money_movements where order_id=p_order_id
 union all select s.id,'offset',null,s.amount,(s.created_at at time zone 'America/Argentina/Buenos_Aires')::date,'offset','Cruce con compra CP-'||lpad(p.number::text,6,'0'),s.created_at from public.contact_setoffs s join public.supplier_purchases p on p.id=s.purchase_id where s.order_id=p_order_id
 )r);
end $$;

revoke all on function private.order_setoff(uuid),private.purchase_balance(uuid),private.supplier_advance(uuid),private.reconcile_contact(uuid),private.customer_statement(uuid),private.customer_statement_sales(uuid),private.require_customer_contact() from public,anon,authenticated;
revoke all on function public.save_supplier(uuid,integer,jsonb),public.enable_supplier(uuid),public.supplier_contacts(text,uuid,boolean),public.record_supplier_payment(uuid,uuid,numeric,date,text,text),public.record_supplier_purchase(uuid,uuid,numeric,date,text,text,jsonb),public.supplier_directory(text,integer),public.supplier_account(uuid,integer) from public,anon;
grant execute on function public.save_supplier(uuid,integer,jsonb),public.enable_supplier(uuid),public.supplier_contacts(text,uuid,boolean),public.record_supplier_payment(uuid,uuid,numeric,date,text,text),public.record_supplier_purchase(uuid,uuid,numeric,date,text,text,jsonb),public.supplier_directory(text,integer),public.supplier_account(uuid,integer) to authenticated;
