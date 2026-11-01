-- Corregir la seña y los ítems en una misma transacción.
create function public.order_deposit(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 return (select jsonb_build_object('amount',amount,'paid_on',paid_on,'method',method) from public.money_movements where order_id=p_order_id and kind='deposit');
end $$;

alter function public.edit_order(uuid,integer,jsonb,text,jsonb,text) set schema private;
alter function private.edit_order(uuid,integer,jsonb,text,jsonb,text) rename to edit_order_keep_deposit;
revoke all on function private.edit_order_keep_deposit(uuid,integer,jsonb,text,jsonb,text) from public,anon,authenticated;
create function public.edit_order(p_order_id uuid,p_revision integer,p_items jsonb,p_description text,p_technical_sheet jsonb,p_notes text,p_deposit jsonb default null,p_change_deposit boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; received numeric; amount_value numeric; date_value date;
begin
 -- Usa el editor base para permitir bajar total y seña juntos, sin validar la seña antigua.
 result:=private.edit_order_before_deposit(p_order_id,p_revision,p_items,p_description,p_technical_sheet,p_notes);
 if p_change_deposit then
  if p_deposit is null or p_deposit='null'::jsonb then
   delete from public.money_movements where order_id=p_order_id and kind='deposit';
  else
   if jsonb_typeof(p_deposit)<>'object' or coalesce(p_deposit->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
    or coalesce(p_deposit->>'paid_on','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_deposit->>'method','') not in ('cash','transfer','card','other') then
    raise exception using errcode='22023',message='Revisá importe, fecha y medio de pago de la seña.';
   end if;
   amount_value:=(p_deposit->>'amount')::numeric;
   begin
    date_value:=(p_deposit->>'paid_on')::date;
   exception when invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode='22023',message='Revisá la fecha de la seña.';
   end;
   if amount_value<=0 or amount_value>=10000000000 or date_value>(now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception using errcode='22023',message='Revisá importe y fecha de la seña.';
   end if;
   update public.money_movements set amount=amount_value,paid_on=date_value,method=p_deposit->>'method'
    where order_id=p_order_id and kind='deposit';
   if not found then perform private.initial_deposit(p_order_id,p_deposit); end if;
  end if;
 end if;
 select coalesce(sum(amount),0) into received from public.money_movements where order_id=p_order_id;
 if (select total from public.orders where id=p_order_id)<received then
  raise exception using errcode='23514',message='La seña no puede superar el total de la nota.';
 end if;
 return result;
end $$;
revoke all on function public.order_deposit(uuid),public.edit_order(uuid,integer,jsonb,text,jsonb,text,jsonb,boolean) from public,anon;
grant execute on function public.order_deposit(uuid),public.edit_order(uuid,integer,jsonb,text,jsonb,text,jsonb,boolean) to authenticated;
