create function public.start_production(p_order_id uuid,p_item_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 perform 1 from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota de pedido no existe.'; end if;
 if p_item_id is null or not exists(select 1 from public.order_items where id=p_item_id and order_id=p_order_id) then
  raise exception using errcode='P0002',message='El producto no pertenece a esta nota.';
 end if;
 update public.order_items set production_status='in_progress' where id=p_item_id and order_id=p_order_id and production_status='pending';
 return p_order_id;
end $$;
revoke all on function public.start_production(uuid,uuid) from public,anon;
grant execute on function public.start_production(uuid,uuid) to authenticated;
