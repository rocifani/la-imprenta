alter table public.orders add column invoiced_at timestamptz,
 add column invoiced_by uuid references auth.users(id);

create function public.billing_queue(p_status text default 'pending',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 if p_status is null or p_status not in ('pending','invoiced','all') or p_offset is null or p_offset<0 or p_offset>2000000 then
  raise exception using errcode='22023',message='Revisá los filtros.';
 end if;
 with summaries as (
  select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,o.total,o.invoiced,o.invoiced_at,
   count(i.id) as item_count,count(i.id) filter(where i.production_status='completed') as completed_count
  from public.orders o join public.order_items i on i.order_id=o.id group by o.id
 ), filtered as (
  select * from summaries where p_status='all' or (p_status='invoiced' and invoiced)
   or (p_status='pending' and not invoiced and completed_count=item_count)
 ), page as(select * from filtered order by number desc limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.billing_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 select jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,'total',o.total,
  'invoiced',o.invoiced,'invoiced_at',o.invoiced_at,
  'invoiced_by_name',(select m.display_name from public.team_members m where m.auth_user_id=o.invoiced_by),
  'customer',jsonb_build_object('name',o.customer_snapshot->>'display_name','cuit',o.customer_snapshot->>'cuit',
   'address',o.customer_snapshot->>'address','contact',o.customer_snapshot->>'contact_name',
   'phone',o.customer_snapshot->>'phone','email',o.customer_snapshot->>'email'),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,
   'specifications',i.specifications,'quantity',i.quantity,'amount',i.amount,'production_status',i.production_status) order by i.position)
   from public.order_items i where i.order_id=o.id),'[]'::jsonb)) into result
 from public.orders o where o.id=p_order_id;
 return result;
end $$;

create function public.mark_order_invoiced(p_order_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not private.has_team_role('billing') then raise exception using errcode='42501',message='Necesitás el rol Facturación.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota de pedido no existe.'; end if;
 if target.invoiced then return target.id; end if;
 if not exists(select 1 from public.order_items where order_id=p_order_id)
  or exists(select 1 from public.order_items where order_id=p_order_id and production_status<>'completed') then
  raise exception using errcode='23514',message='Primero deben estar terminados todos los trabajos de la nota.';
 end if;
 update public.orders set invoiced=true,invoiced_at=now(),invoiced_by=auth.uid() where id=p_order_id;
 return p_order_id;
end $$;
revoke all on function public.billing_queue(text,integer),public.billing_order(uuid),public.mark_order_invoiced(uuid) from public,anon;
grant execute on function public.billing_queue(text,integer),public.billing_order(uuid),public.mark_order_invoiced(uuid) to authenticated;
