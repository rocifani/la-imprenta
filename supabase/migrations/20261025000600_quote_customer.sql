alter table public.quotes add column customer_id uuid references public.customers(id);
alter table public.quote_versions add column customer_id uuid references public.customers(id);
create index quotes_customer_date on public.quotes(customer_id, created_at desc);
create index quotes_created_at on public.quotes(created_at desc);

-- Solo se recuperan vínculos inequívocos desde notas ya existentes.
update public.quotes q set customer_id=o.customer_id from public.orders o where o.quote_id=q.id;
update public.quote_versions v set customer_id=o.customer_id from public.orders o where o.quote_version_id=v.id;

-- Se reutiliza el guardado versionado sin exponer su implementación original.
alter function public.save_quote(uuid,integer,text,text,text,jsonb) set schema private;
alter function private.save_quote(uuid,integer,text,text,text,jsonb) rename to save_quote_content;
revoke all on function private.save_quote_content(uuid,integer,text,text,text,jsonb) from public,anon,authenticated;

create function public.save_quote(
  p_id uuid,p_version integer,p_name text,p_phone text,p_notes text,p_items jsonb,p_customer_id uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare customer public.customers%rowtype; result_id uuid;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
  if p_id is null then raise exception using errcode='22023',message='Falta identificar el presupuesto.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  -- Un reintento de alta conserva el documento original y no reasigna clientes.
  if p_version is null and exists(select 1 from public.quotes where id=p_id) then return p_id; end if;
  if p_customer_id is not null then
    select * into customer from public.customers where id=p_customer_id for share;
    if not found then raise exception using errcode='P0002',message='El cliente seleccionado no existe.'; end if;
    p_name := customer.display_name;
    p_phone := customer.phone;
  end if;
  result_id := private.save_quote_content(p_id,p_version,p_name,p_phone,p_notes,p_items);
  update public.quotes set customer_id=p_customer_id where id=result_id;
  update public.quote_versions set customer_id=p_customer_id
    where id=(select current_version_id from public.quotes where id=result_id);
  return result_id;
end $$;
revoke all on function public.save_quote(uuid,integer,text,text,text,jsonb,uuid) from public,anon;
grant execute on function public.save_quote(uuid,integer,text,text,text,jsonb,uuid) to authenticated;

alter function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) set schema private;
alter function private.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) rename to create_order_from_quote_content;
revoke all on function private.create_order_from_quote_content(uuid,integer,uuid,jsonb,uuid) from public,anon,authenticated;

create function public.create_order_from_quote(
  p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare target public.quotes%rowtype; result_id uuid; result_customer_id uuid;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
  select * into target from public.quotes where id=p_quote_id for update;
  if not found then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
  if target.customer_id is not null then
    if p_customer_id is not null and p_customer_id <> target.customer_id then
      raise exception using errcode='23514',message='La nota debe conservar el cliente asociado al presupuesto.';
    end if;
    p_customer_id := target.customer_id;
  end if;
  result_id := private.create_order_from_quote_content(p_quote_id,p_version,p_customer_id,p_new_customer,p_new_customer_id);
  select customer_id into result_customer_id from public.orders where id=result_id;
  update public.quotes set customer_id=result_customer_id where id=p_quote_id and customer_id is null;
  update public.quote_versions set customer_id=result_customer_id where id=target.current_version_id and customer_id is null;
  return result_id;
end $$;
revoke all on function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) from public,anon;
grant execute on function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) to authenticated;
