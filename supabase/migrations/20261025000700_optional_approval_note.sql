create or replace function public.approve_quote(p_id uuid,p_version integer,p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.quotes%rowtype;
begin
  if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
  select * into target from public.quotes where id=p_id for update;
  if not found then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
  if target.status='approved' then return target.id; end if;
  if p_version is null or target.version <> p_version then raise exception using errcode='40001',message='El presupuesto cambió. Recargá antes de aprobar.'; end if;
  if length(coalesce(p_note,'')) > 500 then raise exception using errcode='22023',message='El comentario admite hasta 500 caracteres.'; end if;
  if target.current_version_id is null or not exists(select 1 from public.quote_items where version_id=target.current_version_id) then
    raise exception using errcode='23514',message='El presupuesto debe tener productos.';
  end if;
  update public.quotes set status='approved',approved_at=now(),approved_by=auth.uid(),
    approval_note=nullif(btrim(p_note),''),version=version+1 where id=p_id;
  return p_id;
end $$;
