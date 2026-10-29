-- Una nota cobrada (incluso seña) o con algún ítem terminado es inmutable para Diseño.
create function private.lock_editable_order(p_order_id uuid,p_revision integer)
returns public.orders language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 if exists(select 1 from public.money_movements where order_id=p_order_id)
  or exists(select 1 from public.order_items where order_id=p_order_id and production_status='completed') then
  raise exception using errcode='23514',message='No se puede editar ni eliminar una nota con cobros o con ítems terminados.';
 end if;
 if p_revision is null or p_revision<>target.production_revision then raise exception using errcode='40001',message='La nota cambió. Recargá antes de continuar.'; end if;
 return target;
end $$;
revoke all on function private.lock_editable_order(uuid,integer) from public,anon,authenticated;

-- También se protege el editor anterior de descripciones/ficha.
alter function public.save_order_work_details(uuid,integer,jsonb,text,jsonb) set schema private;
alter function private.save_order_work_details(uuid,integer,jsonb,text,jsonb) rename to save_order_details_before_lock;
revoke all on function private.save_order_details_before_lock(uuid,integer,jsonb,text,jsonb) from public,anon,authenticated;
create function public.save_order_work_details(p_order_id uuid,p_revision integer,p_items jsonb,p_description text default null,p_technical_sheet jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform private.lock_editable_order(p_order_id,p_revision);
 return private.save_order_details_before_lock(p_order_id,p_revision,p_items,p_description,p_technical_sheet);
end $$;

create function public.edit_order(p_order_id uuid,p_revision integer,p_items jsonb,p_description text,p_technical_sheet jsonb,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype; item jsonb; item_id uuid; kept uuid[]:='{}'; total_amount numeric:=0; position_index integer:=0;
begin
 target:=private.lock_editable_order(p_order_id,p_revision);
 perform private.validate_order_header(p_description,p_technical_sheet);
 if p_notes is null or length(p_notes)>2000 or p_items is null or jsonb_typeof(p_items)<>'array' then raise exception using errcode='22023',message='Revisá los ítems y las observaciones.'; end if;
 if jsonb_array_length(p_items) not between 1 and 50 then raise exception using errcode='22023',message='Agregá entre 1 y 50 ítems.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'description') is distinct from 'string'
   or length(btrim(item->>'description')) not between 2 and 180
   or jsonb_typeof(item->'client_description') is distinct from 'string' or length(btrim(item->>'client_description')) not between 2 and 1000
   or jsonb_typeof(item->'specifications') is distinct from 'string' or length(item->>'specifications')>2000
   or coalesce(item->>'quantity','') !~ '^[0-9]{1,8}$' or coalesce(item->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' then
   raise exception using errcode='22023',message='Revisá descripción, cantidad y precio de cada ítem.';
  end if;
  if (item->>'quantity')::integer not between 1 and 10000000 or (item->>'amount')::numeric<=0 or (item->>'amount')::numeric>=10000000000 then raise exception using errcode='22023',message='La cantidad y el precio deben ser mayores a cero y estar dentro de los límites.'; end if;
  if item->>'id' is not null then
   if item->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='El identificador del ítem no es válido.'; end if;
   item_id:=(item->>'id')::uuid;
   if item_id=any(kept) or not exists(select 1 from public.order_items where id=item_id and order_id=p_order_id) then raise exception using errcode='22023',message='Hay ítems repetidos o que no pertenecen a esta nota.'; end if;
   kept:=array_append(kept,item_id);
  end if;
  total_amount:=total_amount+(item->>'amount')::numeric;
 end loop;
 -- Posiciones temporales negativas evitan colisiones al quitar o reordenar.
 update public.order_items set position=-position where order_id=p_order_id;
 delete from public.order_items where order_id=p_order_id and not(id=any(kept));
 for item in select value from jsonb_array_elements(p_items) loop
  position_index:=position_index+1;
  if item->>'id' is null then
   insert into public.order_items(order_id,position,description,client_description,specifications,quantity,amount,technical_sheet)
   values(p_order_id,position_index,btrim(item->>'description'),btrim(item->>'client_description'),btrim(item->>'specifications'),(item->>'quantity')::integer,(item->>'amount')::numeric,'{}');
  else
   update public.order_items set position=position_index,description=btrim(item->>'description'),client_description=btrim(item->>'client_description'),specifications=btrim(item->>'specifications'),quantity=(item->>'quantity')::integer,amount=(item->>'amount')::numeric,technical_sheet='{}'
   where id=(item->>'id')::uuid and order_id=p_order_id;
  end if;
 end loop;
 update public.orders set total=total_amount,notes=btrim(p_notes),work_description=btrim(p_description),technical_sheet=p_technical_sheet,
  production_revision=production_revision+1,production_updated_at=now(),production_updated_by=auth.uid() where id=p_order_id;
 return p_order_id;
end $$;

-- Las copias son independientes y sobreviven al borrado de su nota de origen.
alter table public.orders drop constraint orders_source_order_id_fkey;
alter table public.orders add constraint orders_source_order_id_fkey foreign key(source_order_id) references public.orders(id) on delete set null;
create function public.delete_order(p_order_id uuid,p_revision integer,p_number bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 target:=private.lock_editable_order(p_order_id,p_revision);
 if p_number is null or p_number<>target.number then raise exception using errcode='22023',message='Confirmá la nota que querés eliminar.'; end if;
 delete from public.order_handoffs where order_id=p_order_id;
 delete from public.order_items where order_id=p_order_id;
 delete from public.orders where id=p_order_id;
 -- El cliente y el presupuesto aprobado se conservan. El número no se reutiliza.
 return p_order_id;
end $$;
revoke all on function public.save_order_work_details(uuid,integer,jsonb,text,jsonb),public.edit_order(uuid,integer,jsonb,text,jsonb,text),public.delete_order(uuid,integer,bigint) from public,anon;
grant execute on function public.save_order_work_details(uuid,integer,jsonb,text,jsonb),public.edit_order(uuid,integer,jsonb,text,jsonb,text),public.delete_order(uuid,integer,bigint) to authenticated;
