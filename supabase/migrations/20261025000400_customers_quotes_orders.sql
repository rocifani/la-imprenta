create table public.customers (
  id uuid primary key,
  display_name text not null check (length(btrim(display_name)) between 2 and 160),
  contact_name text not null default '', phone text not null default '',
  email text not null default '', address text not null default '', notes text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(), created_by uuid not null references auth.users(id)
);

create table public.quotes (
  id uuid primary key, number bigint generated always as identity unique,
  status text not null default 'draft' check (status in ('draft','approved')),
  version integer not null default 0, revision integer not null default 0,
  current_version_id uuid,
  created_at timestamptz not null default now(), created_by uuid not null references auth.users(id),
  approved_at timestamptz, approved_by uuid references auth.users(id), approval_note text,
  check ((status = 'draft' and approved_at is null and approved_by is null)
    or (status = 'approved' and approved_at is not null and approved_by is not null))
);
create table public.quote_versions (
  id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.quotes(id),
  revision integer not null, recipient_name text not null, recipient_phone text not null default '',
  notes text not null default '', currency text not null default 'ARS' check (currency = 'ARS'),
  created_at timestamptz not null default now(), created_by uuid not null references auth.users(id),
  unique (quote_id, revision), unique (quote_id, id)
);
alter table public.quotes add constraint quote_current_version
  foreign key (id, current_version_id) references public.quote_versions(quote_id, id);
create table public.quote_items (
  id uuid primary key default gen_random_uuid(), version_id uuid not null references public.quote_versions(id),
  position integer not null, description text not null check (length(btrim(description)) between 2 and 180),
  specifications text not null default '', quantity integer not null check (quantity between 1 and 10000000),
  amount numeric(14,2) not null check (amount > 0), unique (version_id, position)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
  quote_id uuid not null unique references public.quotes(id),
  quote_version_id uuid not null references public.quote_versions(id),
  customer_id uuid not null references public.customers(id), customer_snapshot jsonb not null,
  total numeric(16,2) not null check (total > 0), currency text not null default 'ARS' check (currency = 'ARS'),
  notes text not null default '', invoiced boolean not null default false,
  created_at timestamptz not null default now(), created_by uuid not null references auth.users(id)
);
create index orders_customer_id on public.orders(customer_id);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  position integer not null, description text not null, specifications text not null,
  quantity integer not null check (quantity > 0), amount numeric(14,2) not null check (amount > 0),
  production_status text not null default 'pending' check (production_status in ('pending','in_progress','completed')),
  unique (order_id, position)
);
create index quote_versions_quote_id on public.quote_versions(quote_id);

-- Esta entrega habilita el circuito de Diseño. Los demás permisos de negocio
-- se incorporarán al implementar cada módulo; Administrador no implica Diseño.
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;
alter table public.quote_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.customers, public.quotes, public.quote_versions, public.quote_items, public.orders, public.order_items from anon, authenticated;
grant select on public.customers, public.quotes, public.quote_versions, public.quote_items, public.orders, public.order_items to authenticated;
grant all on public.customers, public.quotes, public.quote_versions, public.quote_items, public.orders, public.order_items to service_role;
create policy designer_read on public.customers for select to authenticated using (private.has_team_role('designer'));
create policy designer_read on public.quotes for select to authenticated using (private.has_team_role('designer'));
create policy designer_read on public.quote_versions for select to authenticated using (private.has_team_role('designer'));
create policy designer_read on public.quote_items for select to authenticated using (private.has_team_role('designer'));
create policy designer_read on public.orders for select to authenticated using (private.has_team_role('designer'));
create policy designer_read on public.order_items for select to authenticated using (private.has_team_role('designer'));

create function public.save_customer(p_id uuid, p_version integer, p_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.customers%rowtype;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501', message='Necesitás el rol Diseño.'; end if;
  if p_id is null or p_data is null or jsonb_typeof(p_data) <> 'object'
    or length(btrim(coalesce(p_data->>'display_name',''))) not between 2 and 160
    or length(coalesce(p_data->>'contact_name','')) > 120 or length(coalesce(p_data->>'phone','')) > 50
    or length(coalesce(p_data->>'email','')) > 254 or length(coalesce(p_data->>'address','')) > 250
    or length(coalesce(p_data->>'notes','')) > 2000 then
    raise exception using errcode='22023', message='Revisá los datos del cliente.';
  end if;
  if coalesce(p_data->>'email','') <> '' and (p_data->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode='22023', message='Ingresá un correo válido.';
  end if;
  -- El id estable del formulario impide altas duplicadas por reintentos.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into target from public.customers where id=p_id for update;
  if found then
    if p_version is null then return target.id; end if;
    if target.version <> p_version then raise exception using errcode='40001', message='El cliente cambió. Recargá antes de guardar.'; end if;
    update public.customers set display_name=btrim(p_data->>'display_name'),
      contact_name=btrim(coalesce(p_data->>'contact_name','')), phone=btrim(coalesce(p_data->>'phone','')),
      email=lower(btrim(coalesce(p_data->>'email',''))), address=btrim(coalesce(p_data->>'address','')),
      notes=coalesce(p_data->>'notes',''), version=version+1 where id=p_id;
  else
    if p_version is not null then raise exception using errcode='P0002', message='El cliente no existe.'; end if;
    insert into public.customers(id,display_name,contact_name,phone,email,address,notes,created_by)
      values (p_id,btrim(p_data->>'display_name'),btrim(coalesce(p_data->>'contact_name','')),
        btrim(coalesce(p_data->>'phone','')),lower(btrim(coalesce(p_data->>'email',''))),
        btrim(coalesce(p_data->>'address','')),coalesce(p_data->>'notes',''),auth.uid());
  end if;
  return p_id;
end $$;

create function public.save_quote(p_id uuid, p_version integer, p_name text, p_phone text, p_notes text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.quotes%rowtype; new_version uuid; item jsonb; item_position integer := 0;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501', message='Necesitás el rol Diseño.'; end if;
  if p_id is null or p_name is null or length(btrim(p_name)) not between 2 and 160
    or p_phone is null or length(p_phone)>50 or p_notes is null or length(p_notes)>2000 then
    raise exception using errcode='22023', message='Revisá el destinatario y las observaciones.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception using errcode='22023',message='Agregá al menos un producto.'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception using errcode='22023',message='El presupuesto admite entre 1 y 50 productos.'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or length(btrim(coalesce(item->>'description',''))) not between 2 and 180
      or length(coalesce(item->>'specifications',''))>2000
      or coalesce(item->>'quantity','') !~ '^[0-9]{1,8}$'
      or coalesce(item->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' then
      raise exception using errcode='22023', message='Revisá la descripción, cantidad y precio de cada producto.';
    end if;
    if (item->>'quantity')::integer not between 1 and 10000000 or (item->>'amount')::numeric <= 0 then
      raise exception using errcode='22023', message='Las cantidades y precios deben ser mayores a cero.';
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into target from public.quotes where id=p_id for update;
  if found then
    if p_version is null then return target.id; end if;
    if target.status <> 'draft' then raise exception using errcode='23514', message='El presupuesto aprobado no se puede editar.'; end if;
    if target.version <> p_version then raise exception using errcode='40001',message='El presupuesto cambió. Recargá antes de guardar.'; end if;
  else
    if p_version is not null then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
    insert into public.quotes(id,created_by) values(p_id,auth.uid()) returning * into target;
  end if;
  insert into public.quote_versions(quote_id,revision,recipient_name,recipient_phone,notes,created_by)
    values(p_id,target.revision+1,btrim(p_name),btrim(p_phone),p_notes,auth.uid()) returning id into new_version;
  for item in select value from jsonb_array_elements(p_items) loop
    item_position := item_position+1;
    insert into public.quote_items(version_id,position,description,specifications,quantity,amount)
      values(new_version,item_position,btrim(item->>'description'),coalesce(item->>'specifications',''),
        (item->>'quantity')::integer,(item->>'amount')::numeric);
  end loop;
  update public.quotes set current_version_id=new_version,revision=revision+1,version=version+1 where id=p_id;
  return p_id;
end $$;

create function public.approve_quote(p_id uuid,p_version integer,p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.quotes%rowtype;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
  select * into target from public.quotes where id=p_id for update;
  if not found then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
  if target.status='approved' then return target.id; end if;
  if p_version is null or target.version <> p_version then raise exception using errcode='40001',message='El presupuesto cambió. Recargá antes de aprobar.'; end if;
  if p_note is null or length(btrim(p_note)) not between 3 and 500 then raise exception using errcode='22023',message='Indicá cómo se confirmó la aprobación del cliente.'; end if;
  if target.current_version_id is null or not exists(select 1 from public.quote_items where version_id=target.current_version_id) then
    raise exception using errcode='23514',message='El presupuesto debe tener productos.';
  end if;
  update public.quotes set status='approved',approved_at=now(),approved_by=auth.uid(),approval_note=btrim(p_note),version=version+1 where id=p_id;
  return p_id;
end $$;

create function public.create_order_from_quote(p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.quotes%rowtype; customer public.customers%rowtype;
  quotation public.quote_versions%rowtype; order_id uuid; customer_id uuid;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
  select * into target from public.quotes where id=p_quote_id for update;
  if not found then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
  select id into order_id from public.orders where quote_id=p_quote_id;
  if found then return order_id; end if;
  if target.status <> 'approved' then raise exception using errcode='23514',message='Primero registrá la aprobación del presupuesto.'; end if;
  if p_version is null or p_version <> target.version then raise exception using errcode='40001',message='El presupuesto cambió. Recargá antes de generar el pedido.'; end if;
  if p_customer_id is not null then
    customer_id := p_customer_id;
  else
    customer_id := public.save_customer(p_new_customer_id,null,p_new_customer);
  end if;
  select * into customer from public.customers where id=customer_id for share;
  if not found then raise exception using errcode='P0002',message='Seleccioná un cliente válido.'; end if;
  select * into quotation from public.quote_versions where id=target.current_version_id;
  insert into public.orders(quote_id,quote_version_id,customer_id,customer_snapshot,total,notes,created_by)
    select target.id,quotation.id,customer.id,to_jsonb(customer)-'created_by'-'version',sum(amount),quotation.notes,auth.uid()
      from public.quote_items where version_id=quotation.id returning id into order_id;
  insert into public.order_items(order_id,position,description,specifications,quantity,amount)
    select order_id,position,description,specifications,quantity,amount from public.quote_items where version_id=quotation.id;
  return order_id;
end $$;

revoke all on function public.save_customer(uuid,integer,jsonb) from public,anon;
revoke all on function public.save_quote(uuid,integer,text,text,text,jsonb) from public,anon;
revoke all on function public.approve_quote(uuid,integer,text) from public,anon;
revoke all on function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) from public,anon;
grant execute on function public.save_customer(uuid,integer,jsonb), public.save_quote(uuid,integer,text,text,text,jsonb),
  public.approve_quote(uuid,integer,text),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid) to authenticated;
