-- Ejecutar después de las migraciones, solo en la-imprenta-dev
-- Project ref: llpwaezydncunkikgbfd. No crea contraseñas ni asigna roles comerciales.
begin;
with member as (
 insert into public.team_members(email,display_name,active)
 values ('rociobfani@gmail.com','Rocío',true)
 on conflict(email) do update set display_name=excluded.display_name,active=true
 returning id
) insert into public.team_member_roles(member_id,role)
 select id,'administrator' from member on conflict(member_id,role) do nothing;
commit;
