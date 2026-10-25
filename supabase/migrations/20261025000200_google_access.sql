-- Solo Auth puede invocar el filtro, y solo Google puede iniciar un alta.
create function private.before_team_user_created(event jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  incoming_email text := lower(btrim(event->'user'->>'email'));
  incoming_id uuid := (event->'user'->>'id')::uuid;
begin
  if event->'user'->'app_metadata'->>'provider' = 'google'
    and exists (
      select 1 from public.team_members m
      where m.email = incoming_email and m.active
        and (m.auth_user_id is null or m.auth_user_id = incoming_id)
        and exists (select 1 from public.team_member_roles r where r.member_id = m.id)
    ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Esta cuenta no tiene acceso al equipo.'
  ));
end;
$$;

grant usage on schema private to supabase_auth_admin;
revoke all on function private.before_team_user_created(jsonb) from public, anon, authenticated;
grant execute on function private.before_team_user_created(jsonb) to supabase_auth_admin;

-- El correo se toma de Auth, validado por Google, nunca de datos enviados por el navegador.
create function private.link_google_team_member()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data->>'provider' = 'google' and new.email_confirmed_at is not null then
    update public.team_members
      set auth_user_id = new.id
      where email = lower(btrim(new.email)) and active
        and (auth_user_id is null or auth_user_id = new.id);
    if not found then
      raise exception 'No existe una habilitación activa para esta identidad.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.link_google_team_member() from public, anon, authenticated;
create trigger link_google_team_member
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.link_google_team_member();
