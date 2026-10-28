alter table public.team_members add column version integer not null default 1;

create table private.team_member_changes (
  id bigint generated always as identity primary key,
  member_id uuid not null,
  actor_auth_user_id uuid not null,
  changed_at timestamptz not null default now(),
  previous_data jsonb,
  new_data jsonb not null
);
revoke all on private.team_member_changes from public, anon, authenticated;

-- Escritura acotada, atómica y con comprobación de permisos dentro de la base.
-- No necesita una clave service_role en la aplicación.
create function public.save_team_member(
  p_id uuid,
  p_display_name text,
  p_email text,
  p_roles public.team_role[],
  p_active boolean,
  p_version integer
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  target public.team_members%rowtype;
  previous_roles public.team_role[];
  normalized_roles public.team_role[];
  normalized_email text := lower(btrim(p_email));
  previous_snapshot jsonb;
begin
  if not private.has_team_role('administrator') then
    raise exception using errcode = '42501', message = 'Solo la administradora puede gestionar usuarios.';
  end if;
  if p_display_name is null or length(btrim(p_display_name)) < 2 or length(btrim(p_display_name)) > 120 then
    raise exception using errcode = '22023', message = 'El nombre debe tener entre 2 y 120 caracteres.';
  end if;
  if normalized_email is null or length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Ingresá un correo válido.';
  end if;
  if p_active is null or p_roles is null or cardinality(p_roles) = 0 or array_position(p_roles, null) is not null then
    raise exception using errcode = '22023', message = 'Elegí al menos un rol y un estado válido.';
  end if;
  select array_agg(distinct role order by role) into normalized_roles from unnest(p_roles) role;

  if p_id is null then
    if 'administrator' = any(normalized_roles) then
      raise exception using errcode = '23514', message = 'No se puede crear otra cuenta administradora.';
    end if;
    insert into public.team_members(email, display_name, active)
      values (normalized_email, btrim(p_display_name), p_active) returning * into target;
  else
    select * into target from public.team_members where id = p_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'El usuario no existe.';
    end if;
    if p_version is null or p_version <> target.version then
      raise exception using errcode = '40001', message = 'Este usuario cambió. Recargá la página antes de guardar.';
    end if;
    select coalesce(array_agg(role order by role), '{}'::public.team_role[])
      into previous_roles from public.team_member_roles where member_id = target.id;
    previous_snapshot := to_jsonb(target) || jsonb_build_object('roles', previous_roles);

    if 'administrator' = any(previous_roles) then
      if not p_active or not ('administrator' = any(normalized_roles)) or normalized_email <> target.email then
        raise exception using errcode = '23514', message = 'La cuenta administradora debe conservar su correo, su rol y su acceso activo.';
      end if;
    elsif 'administrator' = any(normalized_roles) then
      raise exception using errcode = '23514', message = 'No se puede asignar el rol administrador a otra cuenta.';
    end if;
    if target.auth_user_id is not null and normalized_email <> target.email then
      raise exception using errcode = '23514', message = 'El correo ya está vinculado a Google. Desactivá este acceso y creá uno nuevo para otro correo.';
    end if;
    update public.team_members set email = normalized_email,
      display_name = btrim(p_display_name), active = p_active, version = version + 1
      where id = target.id returning * into target;
  end if;

  delete from public.team_member_roles where member_id = target.id;
  insert into public.team_member_roles(member_id, role)
    select target.id, unnest(normalized_roles);
  insert into private.team_member_changes(member_id, actor_auth_user_id, previous_data, new_data)
    values (target.id, auth.uid(), previous_snapshot,
      to_jsonb(target) || jsonb_build_object('roles', normalized_roles));
  return target.id;
end;
$$;
revoke all on function public.save_team_member(uuid, text, text, public.team_role[], boolean, integer) from public, anon;
grant execute on function public.save_team_member(uuid, text, text, public.team_role[], boolean, integer) to authenticated;
