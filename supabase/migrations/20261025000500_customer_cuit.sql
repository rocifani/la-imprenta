alter table public.customers add column cuit text not null default ''
  check (cuit = '' or cuit ~ '^[0-9]{11}$');

create or replace function public.save_customer(p_id uuid, p_version integer, p_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target public.customers%rowtype;
  raw_cuit text := btrim(coalesce(p_data->>'cuit',''));
  normalized_cuit text := regexp_replace(raw_cuit,'[[:space:]-]','','g');
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501', message='Necesitás el rol Diseño.'; end if;
  if p_id is null or p_data is null or jsonb_typeof(p_data) <> 'object'
    or length(btrim(coalesce(p_data->>'display_name',''))) not between 2 and 160
    or length(coalesce(p_data->>'contact_name','')) > 120 or length(coalesce(p_data->>'phone','')) > 50
    or length(coalesce(p_data->>'email','')) > 254 or length(coalesce(p_data->>'address','')) > 250
    or length(coalesce(p_data->>'notes','')) > 2000 then
    raise exception using errcode='22023', message='Revisá los datos del cliente.';
  end if;
  if raw_cuit <> '' and (raw_cuit !~ '^[0-9[:space:]-]+$' or normalized_cuit !~ '^[0-9]{11}$') then
    raise exception using errcode='22023', message='El CUIT debe tener 11 dígitos. Podés ingresarlo con o sin guiones.';
  end if;
  if coalesce(p_data->>'email','') <> '' and (p_data->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode='22023', message='Ingresá un correo válido.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into target from public.customers where id=p_id for update;
  if found then
    if p_version is null then return target.id; end if;
    if target.version <> p_version then raise exception using errcode='40001', message='El cliente cambió. Recargá antes de guardar.'; end if;
    update public.customers set display_name=btrim(p_data->>'display_name'),
      contact_name=btrim(coalesce(p_data->>'contact_name','')), phone=btrim(coalesce(p_data->>'phone','')),
      email=lower(btrim(coalesce(p_data->>'email',''))), address=btrim(coalesce(p_data->>'address','')),
      notes=coalesce(p_data->>'notes',''), cuit=normalized_cuit, version=version+1 where id=p_id;
  else
    if p_version is not null then raise exception using errcode='P0002', message='El cliente no existe.'; end if;
    insert into public.customers(id,display_name,contact_name,phone,email,address,notes,cuit,created_by)
      values (p_id,btrim(p_data->>'display_name'),btrim(coalesce(p_data->>'contact_name','')),
        btrim(coalesce(p_data->>'phone','')),lower(btrim(coalesce(p_data->>'email',''))),
        btrim(coalesce(p_data->>'address','')),coalesce(p_data->>'notes',''),normalized_cuit,auth.uid());
  end if;
  return p_id;
end $$;
