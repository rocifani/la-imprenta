-- El PDF del cliente incluye exclusivamente trabajos terminados.
create or replace function public.customer_completed_summary(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 with notes as(
 select o.id,o.number,o.created_at,o.total,coalesce(p.paid,0) as paid,o.total-coalesce(p.paid,0) as balance,
 (select coalesce(sum(i.amount),0) from public.order_items i where i.order_id=o.id and i.production_status='completed') as completed_total,
 (select jsonb_agg(jsonb_build_object('description',coalesce(nullif(i.client_description,''),i.description),'quantity',i.quantity,'amount',i.amount) order by i.position) from public.order_items i where i.order_id=o.id and i.production_status='completed') as items
 from public.orders o left join(select order_id,sum(amount) paid from public.money_movements group by order_id)p on p.order_id=o.id
 where o.customer_id=p_customer_id and exists(select 1 from public.order_items i where i.order_id=o.id and i.production_status='completed')
 )
 select jsonb_build_object('generated_at',now(),'customer',jsonb_build_object('id',c.id,'name',c.display_name,'cuit',c.cuit,'phone',c.phone,'email',c.email,'address',c.address),
 'balance',coalesce((select sum(balance) from notes),0),'orders',coalesce((select jsonb_agg(to_jsonb(note_row) order by note_row.number desc) from notes note_row),'[]'::jsonb)) into result from public.customers c where c.id=p_customer_id;
 return result;
end $$;
revoke all on function public.customer_completed_summary(uuid) from public,anon;
grant execute on function public.customer_completed_summary(uuid) to authenticated;
