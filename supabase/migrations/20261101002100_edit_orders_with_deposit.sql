-- La seña permite editar, pero ningún cobro permite borrar físicamente.
create or replace function private.lock_editable_order(p_order_id uuid,p_revision integer)
returns public.orders language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 if exists(select 1 from public.money_movements where order_id=p_order_id and kind<>'deposit')
  or exists(select 1 from public.order_items where order_id=p_order_id and production_status='completed') then
  raise exception using errcode='23514',message='No se puede editar una nota con cobros adicionales a la seña o con ítems terminados.';
 end if;
 if p_revision is null or p_revision<>target.production_revision then raise exception using errcode='40001',message='La nota cambió. Recargá antes de continuar.'; end if;
 return target;
end $$;

alter function public.edit_order(uuid,integer,jsonb,text,jsonb,text) set schema private;
alter function private.edit_order(uuid,integer,jsonb,text,jsonb,text) rename to edit_order_before_deposit;
revoke all on function private.edit_order_before_deposit(uuid,integer,jsonb,text,jsonb,text) from public,anon,authenticated;
create function public.edit_order(p_order_id uuid,p_revision integer,p_items jsonb,p_description text,p_technical_sheet jsonb,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; received numeric;
begin
 -- El editor anterior toma el bloqueo de fila y conserva la revisión y los permisos.
 result:=private.edit_order_before_deposit(p_order_id,p_revision,p_items,p_description,p_technical_sheet,p_notes);
 select coalesce(sum(amount),0) into received from public.money_movements where order_id=p_order_id;
 if (select total from public.orders where id=p_order_id)<received then
  raise exception using errcode='23514',message='El total de la nota no puede ser menor que la seña recibida.';
 end if;
 return result;
end $$;

alter function public.delete_order(uuid,integer,bigint) set schema private;
alter function private.delete_order(uuid,integer,bigint) rename to delete_order_before_deposit;
revoke all on function private.delete_order_before_deposit(uuid,integer,bigint) from public,anon,authenticated;
create function public.delete_order(p_order_id uuid,p_revision integer,p_number bigint)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform private.lock_editable_order(p_order_id,p_revision);
 if exists(select 1 from public.money_movements where order_id=p_order_id) then
  raise exception using errcode='23514',message='No se puede eliminar una nota con cobros registrados, incluida la seña.';
 end if;
 return private.delete_order_before_deposit(p_order_id,p_revision,p_number);
end $$;
revoke all on function public.edit_order(uuid,integer,jsonb,text,jsonb,text),public.delete_order(uuid,integer,bigint) from public,anon;
grant execute on function public.edit_order(uuid,integer,jsonb,text,jsonb,text),public.delete_order(uuid,integer,bigint) to authenticated;
