create function private.valid_technical_sheet(p_data jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare entry record; row_data jsonb; field record;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>50000 then return false; end if;
 for entry in select * from jsonb_each(p_data) loop
  if entry.key='composition' then
   if jsonb_typeof(entry.value)<>'array' then return false; end if;
   if jsonb_array_length(entry.value)>20 then return false; end if;
   for row_data in select value from jsonb_array_elements(entry.value) loop
    if jsonb_typeof(row_data)<>'object' then return false; end if;
    for field in select * from jsonb_each(row_data) loop
     if field.key not in ('work_type','quantity','copies','paper_color','grammage','perforated','eyeleted') or jsonb_typeof(field.value)<>'string' or length(field.value#>>'{}')>120 then return false; end if;
    end loop;
   end loop;
  elsif entry.key='number_ranges' then
   if jsonb_typeof(entry.value)<>'array' then return false; end if;
   if jsonb_array_length(entry.value)>10 then return false; end if;
   for row_data in select value from jsonb_array_elements(entry.value) loop
    if jsonb_typeof(row_data)<>'object' then return false; end if;
    if not(row_data?'from') or not(row_data?'to') then return false; end if;
    for field in select * from jsonb_each(row_data) loop
     if field.key not in ('from','to') or jsonb_typeof(field.value)<>'string' or length(field.value#>>'{}')>60 then return false; end if;
    end loop;
   end loop;
  else
   if entry.key not in ('forms','observations','printing_color','pad_details','original_attached','width','height','yield_quantity','sheet_format','total_sheets','printer_code','other_info') or jsonb_typeof(entry.value)<>'string' or length(entry.value#>>'{}')>2000 then return false; end if;
  end if;
 end loop;
 return true;
end $$;
revoke all on function private.valid_technical_sheet(jsonb) from public,anon,authenticated;
alter table public.quote_items add column client_description text not null default '' check(length(client_description)<=1000),
 add column technical_sheet jsonb not null default '{}' check(private.valid_technical_sheet(technical_sheet));
alter table public.order_items add column client_description text not null default '' check(length(client_description)<=1000),
 add column technical_sheet jsonb not null default '{}' check(private.valid_technical_sheet(technical_sheet));
update public.quote_items set client_description=description;
update public.order_items set client_description=description;
alter table public.orders add column production_revision integer not null default 1,
 add column production_updated_at timestamptz,add column production_updated_by uuid references auth.users(id);

create function private.apply_work_details(p_owner_id uuid,p_items jsonb,p_quote boolean)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; position_number integer:=0; client_text text; sheet jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  position_number:=position_number+1;
  client_text:=btrim(coalesce(item->>'client_description',item->>'description',''));
  sheet:=coalesce(item->'technical_sheet','{}'::jsonb);
  if length(client_text) not between 2 and 1000 or not private.valid_technical_sheet(sheet) then
   raise exception using errcode='22023',message='Revisá la descripción para el cliente y la ficha técnica.';
  end if;
  if p_quote then update public.quote_items set client_description=client_text,technical_sheet=sheet where version_id=p_owner_id and position=position_number;
  else update public.order_items set client_description=client_text,technical_sheet=sheet where order_id=p_owner_id and position=position_number; end if;
 end loop;
end $$;
revoke all on function private.apply_work_details(uuid,jsonb,boolean) from public,anon,authenticated;

alter function public.save_quote(uuid,integer,text,text,text,jsonb,uuid) set schema private;
alter function private.save_quote(uuid,integer,text,text,text,jsonb,uuid) rename to save_quote_before_work_details;
revoke all on function private.save_quote_before_work_details(uuid,integer,text,text,text,jsonb,uuid) from public,anon,authenticated;
create function public.save_quote(p_id uuid,p_version integer,p_name text,p_phone text,p_notes text,p_items jsonb,p_customer_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare old_version uuid; new_version uuid; result uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select current_version_id into old_version from public.quotes where id=p_id;
 result:=private.save_quote_before_work_details(p_id,p_version,p_name,p_phone,p_notes,p_items,p_customer_id);
 select current_version_id into new_version from public.quotes where id=result;
 if new_version is distinct from old_version then perform private.apply_work_details(new_version,p_items,true); end if;
 return result;
end $$;

alter function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb) set schema private;
alter function private.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb) rename to create_direct_order_before_work_details;
revoke all on function private.create_direct_order_before_work_details(uuid,uuid,jsonb,uuid,text,jsonb,jsonb) from public,anon,authenticated;
create function public.create_direct_order(p_id uuid,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_notes text,p_items jsonb,p_deposit jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existed boolean; result uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 existed:=exists(select 1 from public.orders where id=p_id);
 result:=private.create_direct_order_before_work_details(p_id,p_customer_id,p_new_customer,p_new_customer_id,p_notes,p_items,p_deposit);
 if not existed then perform private.apply_work_details(result,p_items,false); end if;
 return result;
end $$;

alter function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb) set schema private;
alter function private.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb) rename to create_order_from_quote_before_work_details;
revoke all on function private.create_order_from_quote_before_work_details(uuid,integer,uuid,jsonb,uuid,jsonb) from public,anon,authenticated;
create function public.create_order_from_quote(p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_deposit jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existed boolean; result uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform 1 from public.quotes where id=p_quote_id for update;
 existed:=exists(select 1 from public.orders where quote_id=p_quote_id);
 result:=private.create_order_from_quote_before_work_details(p_quote_id,p_version,p_customer_id,p_new_customer,p_new_customer_id,p_deposit);
 if not existed then
  update public.order_items i set client_description=q.client_description,technical_sheet=q.technical_sheet
   from public.orders o,public.quote_items q where i.order_id=result and o.id=result and q.version_id=o.quote_version_id and q.position=i.position;
 end if;
 return result;
end $$;

create function public.save_order_work_details(p_order_id uuid,p_revision integer,p_items jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype; item jsonb; expected integer; client_text text;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 if p_revision is null or p_revision<>target.production_revision then raise exception using errcode='40001',message='La ficha cambió. Recargá antes de guardar.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception using errcode='22023',message='Revisá los trabajos.'; end if;
 select count(*) into expected from public.order_items where order_id=p_order_id;
 if jsonb_array_length(p_items)<>expected or expected not between 1 and 50 then raise exception using errcode='22023',message='La ficha debe conservar todos los trabajos.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='Revisá el trabajo de la ficha.'; end if;
  if not exists(select 1 from public.order_items where id=(item->>'id')::uuid and order_id=p_order_id) then raise exception using errcode='22023',message='El trabajo no pertenece a esta nota.'; end if;
  client_text:=btrim(coalesce(item->>'client_description',''));
  if length(client_text) not between 2 and 1000 or length(coalesce(item->>'specifications',''))>2000 or not private.valid_technical_sheet(coalesce(item->'technical_sheet','{}'::jsonb)) then raise exception using errcode='22023',message='Revisá las descripciones y la ficha técnica.'; end if;
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>expected then raise exception using errcode='22023',message='Hay trabajos repetidos en la ficha.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  update public.order_items set client_description=btrim(item->>'client_description'),specifications=coalesce(item->>'specifications',''),technical_sheet=coalesce(item->'technical_sheet','{}'::jsonb)
   where id=(item->>'id')::uuid and order_id=p_order_id;
 end loop;
 update public.orders set production_revision=production_revision+1,production_updated_at=now(),production_updated_by=auth.uid() where id=p_order_id;
 return p_order_id;
end $$;

create or replace function public.production_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 select jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,'customer_name',o.customer_snapshot->>'display_name','notes',o.notes,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,'client_description',i.client_description,'technical_sheet',i.technical_sheet,
 'specifications',i.specifications,'quantity',i.quantity,'production_status',i.production_status,'completion_note',i.completion_note,'completed_at',i.completed_at) order by i.position)
 from public.order_items i where i.order_id=o.id),'[]'::jsonb)) into result from public.orders o where o.id=p_order_id;
 return result;
end $$;

-- Una única lectura consistente. Sin paginación del historial ni datos internos en el documento del cliente.
create function public.customer_work_summary(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 with notes as(
 select o.id,o.number,o.created_at,o.total,coalesce(p.paid,0) as paid,o.total-coalesce(p.paid,0) as balance,
 (select count(*) from public.order_items i where i.order_id=o.id and i.production_status<>'completed') as pending_count,
 (select coalesce(jsonb_agg(jsonb_build_object('description',coalesce(nullif(i.client_description,''),i.description),'quantity',i.quantity,'completed',i.production_status='completed') order by i.position),'[]'::jsonb) from public.order_items i where i.order_id=o.id) as items
 from public.orders o left join(select order_id,sum(amount) paid from public.money_movements group by order_id)p on p.order_id=o.id where o.customer_id=p_customer_id
 ), relevant as(select * from notes where balance>0 or pending_count>0)
 select jsonb_build_object('generated_at',now(),'customer',jsonb_build_object('id',c.id,'name',c.display_name,'cuit',c.cuit,'phone',c.phone,'email',c.email,'address',c.address),
 'balance',coalesce((select sum(balance) from notes),0),'pending_count',coalesce((select sum(pending_count) from notes),0),
 'orders',coalesce((select jsonb_agg(to_jsonb(relevant) order by number desc) from relevant),'[]'::jsonb)) into result from public.customers c where c.id=p_customer_id;
 return result;
end $$;
revoke all on function public.save_quote(uuid,integer,text,text,text,jsonb,uuid),public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb),public.save_order_work_details(uuid,integer,jsonb),public.customer_work_summary(uuid) from public,anon;
grant execute on function public.save_quote(uuid,integer,text,text,text,jsonb,uuid),public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb),public.save_order_work_details(uuid,integer,jsonb),public.customer_work_summary(uuid) to authenticated;
