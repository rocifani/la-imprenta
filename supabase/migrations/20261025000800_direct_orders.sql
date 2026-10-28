-- El origen es opcional, pero debe conservarse completo cuando existe.
alter table public.orders alter column quote_id drop not null;
alter table public.orders alter column quote_version_id drop not null;
alter table public.orders add constraint orders_complete_quote_origin
 check ((quote_id is null) = (quote_version_id is null));
create index orders_customer_date on public.orders(customer_id,created_at desc);
create index orders_created_at on public.orders(created_at desc);

create function public.create_direct_order(p_id uuid,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_notes text,p_items jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare customer public.customers%rowtype; selected_customer_id uuid; item jsonb; item_position integer:=0; total_amount numeric:=0;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 if p_id is null then raise exception using errcode='22023',message='Falta identificar la nota.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from public.orders where id=p_id) then
  if exists(select 1 from public.orders where id=p_id and quote_id is not null) then
   raise exception using errcode='23514',message='La nota ya tiene un presupuesto de origen.';
  end if;
  return p_id;
 end if;
 if p_notes is null or length(p_notes)>2000 then raise exception using errcode='22023',message='Revisá las observaciones.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception using errcode='22023',message='Agregá entre 1 y 50 productos.'; end if;
 if jsonb_array_length(p_items) not between 1 and 50 then raise exception using errcode='22023',message='Agregá entre 1 y 50 productos.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or length(btrim(coalesce(item->>'description',''))) not between 2 and 180
   or length(coalesce(item->>'specifications',''))>2000
   or coalesce(item->>'quantity','') !~ '^[0-9]{1,8}$'
   or coalesce(item->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' then
   raise exception using errcode='22023',message='Revisá la descripción, cantidad y precio de cada producto.';
  end if;
  if (item->>'quantity')::integer not between 1 and 10000000 or (item->>'amount')::numeric<=0 then
   raise exception using errcode='22023',message='Las cantidades y precios deben ser mayores a cero.';
  end if;
  total_amount:=total_amount+(item->>'amount')::numeric;
 end loop;
 if p_customer_id is not null then selected_customer_id:=p_customer_id;
 else selected_customer_id:=public.save_customer(p_new_customer_id,null,p_new_customer); end if;
 select * into customer from public.customers where id=selected_customer_id for share;
 if not found then raise exception using errcode='P0002',message='Seleccioná un cliente válido.'; end if;
 insert into public.orders(id,customer_id,customer_snapshot,total,notes,created_by)
  values(p_id,customer.id,to_jsonb(customer)-'created_by'-'version',total_amount,p_notes,auth.uid());
 for item in select value from jsonb_array_elements(p_items) loop
  item_position:=item_position+1;
  insert into public.order_items(order_id,position,description,specifications,quantity,amount)
   values(p_id,item_position,btrim(item->>'description'),coalesce(item->>'specifications',''),(item->>'quantity')::integer,(item->>'amount')::numeric);
 end loop;
 return p_id;
end $$;
revoke all on function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb) from public,anon;
grant execute on function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb) to authenticated;
