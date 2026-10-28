alter table public.order_items
 add column completion_note text not null default '' check(length(completion_note)<=2000),
 add column completed_at timestamptz,
 add column completed_by uuid references auth.users(id);

-- Producción recibe una proyección de trabajo: no se habilita lectura de precios ni finanzas.
create function public.production_queue(p_status text default 'pending',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 if p_status is null or p_status not in ('pending','completed','all') or p_offset is null or p_offset<0 or p_offset>2000000 then
  raise exception using errcode='22023',message='Revisá los filtros.';
 end if;
 with summaries as (
  select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,
   count(i.id) as item_count,count(i.id) filter(where i.production_status='completed') as completed_count
  from public.orders o join public.order_items i on i.order_id=o.id
  group by o.id
 ), filtered as (
  select * from summaries where p_status='all'
   or (p_status='pending' and completed_count<item_count)
   or (p_status='completed' and completed_count=item_count)
 ), page as (select * from filtered order by number desc limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.production_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 select jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,
  'customer_name',o.customer_snapshot->>'display_name','notes',o.notes,
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,
   'specifications',i.specifications,'quantity',i.quantity,'production_status',i.production_status,
   'completion_note',i.completion_note,'completed_at',i.completed_at) order by i.position)
   from public.order_items i where i.order_id=o.id),'[]'::jsonb)) into result
 from public.orders o where o.id=p_order_id;
 return result;
end $$;

-- El bloqueo de la nota serializa el cierre individual y el cierre completo.
-- Repetir el cierre no sobrescribe comentarios, fecha ni autor ya registrados.
create function public.complete_production(p_order_id uuid,p_item_id uuid default null,p_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 if p_note is null or length(p_note)>2000 then raise exception using errcode='22023',message='El comentario admite hasta 2000 caracteres.'; end if;
 perform 1 from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota de pedido no existe.'; end if;
 if p_item_id is not null and not exists(select 1 from public.order_items where id=p_item_id and order_id=p_order_id) then
  raise exception using errcode='P0002',message='El producto no pertenece a esta nota.';
 end if;
 update public.order_items set production_status='completed',completion_note=btrim(p_note),completed_at=now(),completed_by=auth.uid()
  where order_id=p_order_id and (p_item_id is null or id=p_item_id) and production_status<>'completed';
 return p_order_id;
end $$;
revoke all on function public.production_queue(text,integer),public.production_order(uuid),public.complete_production(uuid,uuid,text) from public,anon;
grant execute on function public.production_queue(text,integer),public.production_order(uuid),public.complete_production(uuid,uuid,text) to authenticated;
