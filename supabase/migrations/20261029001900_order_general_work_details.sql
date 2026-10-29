-- Una descripción comercial y una ficha técnica común por nota.
alter table public.orders
 add column work_description text not null default '' check(length(work_description)<=2000),
 add column technical_sheet jsonb not null default '{}' check(private.valid_technical_sheet(technical_sheet));

-- El usuario autorizó descartar las fichas anteriores por ítem.
-- Se conservan cantidades, importes, descripciones, indicaciones y cierres.
update public.order_items set technical_sheet='{}'::jsonb where technical_sheet<>'{}'::jsonb;

create function private.validate_order_header(p_description text,p_sheet jsonb)
returns void language plpgsql immutable set search_path='' as $$
begin
 if p_description is null or length(p_description)>2000 or not private.valid_technical_sheet(p_sheet) then
  raise exception using errcode='22023',message='Revisá la descripción general y la ficha técnica de la nota.';
 end if;
end $$;
revoke all on function private.validate_order_header(text,jsonb) from public,anon,authenticated;

alter function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid) set schema private;
alter function private.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid) rename to create_direct_order_before_header;
revoke all on function private.create_direct_order_before_header(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid) from public,anon,authenticated;
create function public.create_direct_order(p_id uuid,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_notes text,p_items jsonb,p_deposit jsonb default null,p_assignee_id uuid default null,p_source_order_id uuid default null,p_description text default null,p_technical_sheet jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; existed boolean; source public.orders%rowtype; description text; sheet jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 existed:=exists(select 1 from public.orders where id=p_id);
 if p_source_order_id is not null then select * into source from public.orders where id=p_source_order_id; end if;
 description:=coalesce(p_description,source.work_description,'');sheet:=coalesce(p_technical_sheet,source.technical_sheet,'{}'::jsonb);
 perform private.validate_order_header(description,sheet);
 result:=private.create_direct_order_before_header(p_id,p_customer_id,p_new_customer,p_new_customer_id,p_notes,p_items,p_deposit,p_assignee_id,p_source_order_id);
 if not existed then
  update public.orders set work_description=btrim(description),technical_sheet=sheet where id=result;
  update public.order_items set technical_sheet='{}'::jsonb where order_id=result;
 end if;
 return result;
end $$;

alter function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid) set schema private;
alter function private.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid) rename to create_order_from_quote_before_header;
revoke all on function private.create_order_from_quote_before_header(uuid,integer,uuid,jsonb,uuid,jsonb,uuid) from public,anon,authenticated;
create function public.create_order_from_quote(p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_deposit jsonb default null,p_assignee_id uuid default null,p_description text default '',p_technical_sheet jsonb default '{}')
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; existed boolean;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform 1 from public.quotes where id=p_quote_id for update;
 existed:=exists(select 1 from public.orders where quote_id=p_quote_id);
 perform private.validate_order_header(p_description,p_technical_sheet);
 result:=private.create_order_from_quote_before_header(p_quote_id,p_version,p_customer_id,p_new_customer,p_new_customer_id,p_deposit,p_assignee_id);
 if not existed then
  update public.orders set work_description=btrim(p_description),technical_sheet=p_technical_sheet where id=result;
  update public.order_items set technical_sheet='{}'::jsonb where order_id=result;
 end if;
 return result;
end $$;

alter function public.save_order_work_details(uuid,integer,jsonb) set schema private;
alter function private.save_order_work_details(uuid,integer,jsonb) rename to save_order_items_before_header;
revoke all on function private.save_order_items_before_header(uuid,integer,jsonb) from public,anon,authenticated;
create function public.save_order_work_details(p_order_id uuid,p_revision integer,p_items jsonb,p_description text default null,p_technical_sheet jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype; description text; sheet jsonb;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 description:=coalesce(p_description,target.work_description);sheet:=coalesce(p_technical_sheet,target.technical_sheet);
 perform private.validate_order_header(description,sheet);
 perform private.save_order_items_before_header(p_order_id,p_revision,p_items);
 update public.orders set work_description=btrim(description),technical_sheet=sheet where id=p_order_id;
 update public.order_items set technical_sheet='{}'::jsonb where order_id=p_order_id;
 return p_order_id;
end $$;

create or replace function public.workshop_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not(private.has_team_role('designer') or private.has_team_role('operator')) then raise exception using errcode='42501',message='Sin permiso para consultar la ficha de taller.'; end if;
 select jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,'customer_name',o.customer_snapshot->>'display_name','notes',o.notes,'work_description',o.work_description,'technical_sheet',o.technical_sheet,
 'assigned_to',o.assigned_to,'assignee_name',(select m.display_name from public.team_members m where m.id=o.assigned_to),'assignment_revision',o.assignment_revision,
 'handoffs',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'from_name',fm.display_name,'to_name',tm.display_name,'actor_name',am.display_name,'note',h.note,'created_at',h.created_at) order by h.id) from public.order_handoffs h left join public.team_members fm on fm.id=h.from_member join public.team_members tm on tm.id=h.to_member left join public.team_members am on am.auth_user_id=h.actor where h.order_id=o.id),'[]'::jsonb),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,'client_description',i.client_description,'technical_sheet',i.technical_sheet,'specifications',i.specifications,'quantity',i.quantity,'production_status',i.production_status,'completion_note',i.completion_note,'completed_at',i.completed_at) order by i.position) from public.order_items i where i.order_id=o.id),'[]'::jsonb)) into result from public.orders o where o.id=p_order_id;
 return result;
end $$;

revoke all on function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid,text,jsonb),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid,text,jsonb),public.save_order_work_details(uuid,integer,jsonb,text,jsonb) from public,anon;
grant execute on function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid,text,jsonb),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid,text,jsonb),public.save_order_work_details(uuid,integer,jsonb,text,jsonb) to authenticated;
