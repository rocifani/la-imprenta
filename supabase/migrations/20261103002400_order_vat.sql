alter table public.order_items
  add column with_vat boolean not null default false,
  add column vat_amount numeric(14,2) not null default 0 check (vat_amount >= 0);

-- amount sigue siendo el importe final usado por cobros, saldos y reportes.
create function private.order_items_with_vat(items jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; result jsonb := '[]'; base numeric; vat numeric;
begin
 if jsonb_typeof(items) is distinct from 'array' then
  raise exception using errcode='22023',message='Revisá los ítems de la nota.';
 end if;
 for item in select value from jsonb_array_elements(items) loop
  if item ? 'with_vat' and jsonb_typeof(item->'with_vat') is distinct from 'boolean' then
   raise exception using errcode='22023',message='Revisá la selección de IVA.';
  end if;
  vat := 0;
  if item->'with_vat' = 'true'::jsonb then
   if coalesce(item->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' then
    raise exception using errcode='22023',message='Revisá el precio sin IVA.';
   end if;
   base := (item->>'amount')::numeric;
   vat := round(base * 0.21, 2);
   if base + vat >= 10000000000 then
    raise exception using errcode='22023',message='El precio con IVA supera el máximo permitido.';
   end if;
   item := jsonb_set(item, '{amount}', to_jsonb(base + vat));
  end if;
  result := result || jsonb_build_array(item || jsonb_build_object('vat_amount',vat));
 end loop;
 return result;
end $$;

create function private.save_order_item_vat(order_key uuid, items jsonb)
returns void language sql set search_path='' as $$
 with ordered_items as (
  select id, row_number() over (order by position) as ordinal
  from public.order_items where order_id=order_key
 )
 update public.order_items i
 set with_vat=coalesce((j.item->>'with_vat')::boolean,false),
     vat_amount=(j.item->>'vat_amount')::numeric
 from ordered_items o
 join jsonb_array_elements(items) with ordinality as j(item,ordinal) using (ordinal)
 where i.id=o.id;
$$;
revoke all on function private.order_items_with_vat(jsonb),private.save_order_item_vat(uuid,jsonb) from public,anon,authenticated;

create or replace function public.create_direct_order(p_id uuid,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_notes text,p_items jsonb,p_deposit jsonb default null,p_assignee_id uuid default null,p_source_order_id uuid default null,p_description text default null,p_technical_sheet jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; existed boolean; source public.orders%rowtype; description text; sheet jsonb; priced_items jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 existed:=exists(select 1 from public.orders where id=p_id);
 if p_source_order_id is not null then select * into source from public.orders where id=p_source_order_id; end if;
 description:=coalesce(p_description,source.work_description,'');sheet:=coalesce(p_technical_sheet,source.technical_sheet,'{}'::jsonb);
 perform private.validate_order_header(description,sheet);
 priced_items:=private.order_items_with_vat(p_items);
 result:=private.create_direct_order_before_header(p_id,p_customer_id,p_new_customer,p_new_customer_id,p_notes,priced_items,p_deposit,p_assignee_id,p_source_order_id);
 if not existed then
  perform private.save_order_item_vat(result,priced_items);
  update public.orders set work_description=btrim(description),technical_sheet=sheet where id=result;
  update public.order_items set technical_sheet='{}'::jsonb where order_id=result;
 end if;
 return result;
end $$;

drop function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid,text,jsonb);
create or replace function public.create_order_from_quote(p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_deposit jsonb default null,p_assignee_id uuid default null,p_description text default '',p_technical_sheet jsonb default '{}',p_vat_items boolean[] default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; existed boolean; priced_items jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform 1 from public.quotes where id=p_quote_id for update;
 existed:=exists(select 1 from public.orders where quote_id=p_quote_id);
 perform private.validate_order_header(p_description,p_technical_sheet);
 result:=private.create_order_from_quote_before_header(p_quote_id,p_version,p_customer_id,p_new_customer,p_new_customer_id,null,p_assignee_id);
 if not existed then
  if p_vat_items is not null then
   if cardinality(p_vat_items) <> (select count(*) from public.order_items where order_id=result)
      or array_position(p_vat_items,null) is not null then
    raise exception using errcode='22023',message='Revisá el IVA de los trabajos aprobados.';
   end if;
   select private.order_items_with_vat(jsonb_agg(
    jsonb_build_object('amount',amount,'with_vat',p_vat_items[ordinal::integer]) order by ordinal
   )) into priced_items from (
    select amount,row_number() over (order by position) as ordinal from public.order_items where order_id=result
   ) items;
   perform private.save_order_item_vat(result,priced_items);
   update public.order_items set amount=amount+vat_amount where order_id=result;
   update public.orders set total=(select sum(amount) from public.order_items where order_id=result) where id=result;
  end if;
  perform private.initial_deposit(result,p_deposit);
  update public.orders set work_description=btrim(p_description),technical_sheet=p_technical_sheet where id=result;
  update public.order_items set technical_sheet='{}'::jsonb where order_id=result;
 end if;
 return result;
end $$;
revoke all on function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid,text,jsonb,boolean[]) from public,anon;
grant execute on function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid,text,jsonb,boolean[]) to authenticated;

create or replace function public.edit_order(p_order_id uuid,p_revision integer,p_items jsonb,p_description text,p_technical_sheet jsonb,p_notes text,p_deposit jsonb default null,p_change_deposit boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; received numeric; amount_value numeric; date_value date; priced_items jsonb;
begin
 -- Usa el editor base para permitir bajar total y seña juntos, sin validar la seña antigua.
 perform private.lock_editable_order(p_order_id,p_revision);
 if exists(select 1 from public.order_items where order_id=p_order_id and with_vat)
    and exists(select 1 from jsonb_array_elements(p_items) item where not (item ? 'with_vat')) then
  raise exception using errcode='22023',message='Recargá el editor para guardar el IVA de los ítems.';
 end if;
 priced_items:=private.order_items_with_vat(p_items);
 result:=private.edit_order_before_deposit(p_order_id,p_revision,priced_items,p_description,p_technical_sheet,p_notes);
 perform private.save_order_item_vat(result,priced_items);
 if p_change_deposit then
  if p_deposit is null or p_deposit='null'::jsonb then
   delete from public.money_movements where order_id=p_order_id and kind='deposit';
  else
   if jsonb_typeof(p_deposit)<>'object' or coalesce(p_deposit->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
    or coalesce(p_deposit->>'paid_on','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_deposit->>'method','') not in ('cash','transfer','card','other') then
    raise exception using errcode='22023',message='Revisá importe, fecha y medio de pago de la seña.';
   end if;
   amount_value:=(p_deposit->>'amount')::numeric;
   begin
    date_value:=(p_deposit->>'paid_on')::date;
   exception when invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode='22023',message='Revisá la fecha de la seña.';
   end;
   if amount_value<=0 or amount_value>=10000000000 or date_value>(now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception using errcode='22023',message='Revisá importe y fecha de la seña.';
   end if;
   update public.money_movements set amount=amount_value,paid_on=date_value,method=p_deposit->>'method'
    where order_id=p_order_id and kind='deposit';
   if not found then perform private.initial_deposit(p_order_id,p_deposit); end if;
  end if;
 end if;
 select coalesce(sum(amount),0) into received from public.money_movements where order_id=p_order_id;
 if (select total from public.orders where id=p_order_id)<received then
  raise exception using errcode='23514',message='La seña no puede superar el total de la nota.';
 end if;
 return result;
end $$;

create or replace function public.mark_order_invoiced(p_order_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota de pedido no existe.'; end if;
 if not exists(select 1 from public.order_items where order_id=p_order_id and with_vat) then
  raise exception using errcode='23514',message='La nota no tiene ítems con IVA para facturar.';
 end if;
 if target.invoiced then return target.id; end if;
 update public.orders set invoiced=true,invoiced_at=now(),invoiced_by=auth.uid() where id=p_order_id;
 return p_order_id;
end $$;

create or replace function public.billing_queue(p_status text default 'all',p_offset integer default 0,p_customer_id uuid default null,p_from timestamptz default null,p_until timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 if p_status is null or p_status not in ('pending','invoiced','all') or p_offset is null or p_offset<0 or p_offset>2000000
  or (p_from is not null and p_until is not null and p_from>=p_until) then
  raise exception using errcode='22023',message='Revisá los filtros.';
 end if;
 with summaries as (
  select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,sum(i.amount) as total,o.invoiced,o.invoiced_at,
   count(i.id) as item_count,count(i.id) filter(where i.production_status='completed') as completed_count
  from public.orders o join public.order_items i on i.order_id=o.id and i.with_vat
  where (p_customer_id is null or o.customer_id=p_customer_id)
   and (p_from is null or o.created_at>=p_from) and (p_until is null or o.created_at<p_until)
   and (p_status='all' or (p_status='invoiced' and o.invoiced) or (p_status='pending' and not o.invoiced))
  group by o.id
 ), page as(select * from summaries order by number desc limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from summaries),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

create or replace function public.billing_customers(p_query text default '',p_id uuid default null)
returns table(id uuid,display_name text,phone text) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 if p_query is null or length(p_query)>100 then raise exception using errcode='22023',message='Revisá la búsqueda.'; end if;
 return query select c.id,c.display_name,c.phone from public.customers c
 where exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id and i.with_vat where o.customer_id=c.id)
  and (p_id is null or c.id=p_id)
  and (p_query='' or strpos(lower(c.display_name),lower(p_query))>0 or strpos(c.phone,p_query)>0)
 order by c.display_name,c.id limit 20;
end $$;

create or replace function public.billing_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 select jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,'total',(select sum(i.amount) from public.order_items i where i.order_id=o.id and i.with_vat),
  'invoiced',o.invoiced,'invoiced_at',o.invoiced_at,
  'invoiced_by_name',(select m.display_name from public.team_members m where m.auth_user_id=o.invoiced_by),
  'customer',jsonb_build_object('name',o.customer_snapshot->>'display_name','cuit',o.customer_snapshot->>'cuit',
   'address',o.customer_snapshot->>'address','contact',o.customer_snapshot->>'contact_name',
   'phone',o.customer_snapshot->>'phone','email',o.customer_snapshot->>'email'),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,
   'specifications',i.specifications,'quantity',i.quantity,'amount',i.amount,'with_vat',i.with_vat,'vat_amount',i.vat_amount,'production_status',i.production_status) order by i.position)
   from public.order_items i where i.order_id=o.id and i.with_vat),'[]'::jsonb)) into result
 from public.orders o where o.id=p_order_id and exists(select 1 from public.order_items i where i.order_id=o.id and i.with_vat);
 return result;
end $$;

create or replace function private.lock_editable_order(p_order_id uuid,p_revision integer)
returns public.orders language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 if target.invoiced then
  raise exception using errcode='23514',message='No se puede editar ni eliminar una nota con facturación registrada.';
 end if;
 if exists(select 1 from public.money_movements where order_id=p_order_id and kind<>'deposit')
  or exists(select 1 from public.order_items where order_id=p_order_id and production_status='completed') then
  raise exception using errcode='23514',message='No se puede editar una nota con cobros adicionales a la seña o con ítems terminados.';
 end if;
 if p_revision is null or p_revision<>target.production_revision then raise exception using errcode='40001',message='La nota cambió. Recargá antes de continuar.'; end if;
 return target;
end $$;
