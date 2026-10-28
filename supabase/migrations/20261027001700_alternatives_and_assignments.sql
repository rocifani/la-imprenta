-- Alternativas completas y contacto conservado por versión.
alter table public.quote_versions add column recipient_contact text not null default '' check(length(recipient_contact)<=120);
create table public.quote_alternatives(id uuid primary key default gen_random_uuid(),version_id uuid not null references public.quote_versions(id),position integer not null,name text not null check(length(btrim(name)) between 2 and 120),unique(version_id,position),unique(version_id,id));
alter table public.quote_alternatives enable row level security;
revoke all on public.quote_alternatives from public,anon,authenticated;
grant select on public.quote_alternatives to authenticated;
grant all on public.quote_alternatives to service_role;
create policy designer_read on public.quote_alternatives for select to authenticated using(private.has_team_role('designer'));
insert into public.quote_alternatives(version_id,position,name) select id,1,'Propuesta' from public.quote_versions;
alter table public.quote_items add column alternative_id uuid references public.quote_alternatives(id);
update public.quote_items i set alternative_id=a.id from public.quote_alternatives a where a.version_id=i.version_id;
alter table public.quotes add column selected_alternative_id uuid references public.quote_alternatives(id);
update public.quotes q set selected_alternative_id=a.id from public.quote_alternatives a where a.version_id=q.current_version_id and q.status='approved';

alter function public.save_quote(uuid,integer,text,text,text,jsonb,uuid) set schema private;
alter function private.save_quote(uuid,integer,text,text,text,jsonb,uuid) rename to save_quote_single_proposal;
revoke all on function private.save_quote_single_proposal(uuid,integer,text,text,text,jsonb,uuid) from public,anon,authenticated;
create function public.save_quote(p_id uuid,p_version integer,p_name text,p_phone text,p_notes text,p_items jsonb,p_customer_id uuid default null,p_contact text default '',p_alternatives jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare options jsonb; option_data jsonb; work jsonb; all_items jsonb:='[]'; old_version uuid; new_version uuid; result uuid; option_id uuid; item_offset integer:=0; option_position integer:=0;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select current_version_id into old_version from public.quotes where id=p_id;
 if old_version is not null and p_version is null then return p_id; end if;
 if p_contact is null or length(p_contact)>120 then raise exception using errcode='22023',message='Revisá la persona de contacto.'; end if;
 options:=coalesce(p_alternatives,jsonb_build_array(jsonb_build_object('name','Propuesta','items',p_items)));
 if jsonb_typeof(options)<>'array' then raise exception using errcode='22023',message='Revisá las alternativas.'; end if;
 if jsonb_array_length(options) not between 1 and 10 then raise exception using errcode='22023',message='El presupuesto admite entre 1 y 10 alternativas.'; end if;
 for option_data in select value from jsonb_array_elements(options) loop
  if jsonb_typeof(option_data)<>'object' or length(btrim(coalesce(option_data->>'name',''))) not between 2 and 120 or jsonb_typeof(option_data->'items') is distinct from 'array' then raise exception using errcode='22023',message='Cada alternativa necesita nombre y trabajos.'; end if;
  if jsonb_array_length(option_data->'items')<1 then raise exception using errcode='22023',message='Cada alternativa necesita al menos un trabajo.'; end if;
  all_items:=all_items||(option_data->'items');
 end loop;
 if jsonb_array_length(all_items)>50 then raise exception using errcode='22023',message='Se permiten hasta 50 trabajos entre todas las alternativas.'; end if;
 result:=private.save_quote_single_proposal(p_id,p_version,p_name,p_phone,p_notes,all_items,p_customer_id);
 select current_version_id into new_version from public.quotes where id=result;
 if new_version is not distinct from old_version then return result; end if;
 if p_customer_id is not null then select contact_name into p_contact from public.customers where id=p_customer_id; end if;
 update public.quote_versions set recipient_contact=btrim(coalesce(p_contact,'')) where id=new_version;
 for option_data in select value from jsonb_array_elements(options) loop
  option_position:=option_position+1;
  insert into public.quote_alternatives(version_id,position,name) values(new_version,option_position,btrim(option_data->>'name')) returning id into option_id;
  update public.quote_items set alternative_id=option_id where version_id=new_version and position>item_offset and position<=item_offset+jsonb_array_length(option_data->'items');
  item_offset:=item_offset+jsonb_array_length(option_data->'items');
 end loop;
 return result;
end $$;

alter function public.approve_quote(uuid,integer,text) set schema private;
alter function private.approve_quote(uuid,integer,text) rename to approve_quote_content;
revoke all on function private.approve_quote_content(uuid,integer,text) from public,anon,authenticated;
create function public.approve_quote(p_id uuid,p_version integer,p_note text,p_alternative_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.quotes%rowtype; choice uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.quotes where id=p_id for update;
 if not found then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
 if target.status='approved' then
  if p_alternative_id is not null and p_alternative_id is distinct from target.selected_alternative_id then raise exception using errcode='23514',message='La alternativa aprobada ya no puede cambiarse.'; end if;
  return target.id;
 end if;
 choice:=p_alternative_id;
 if choice is null and (select count(*) from public.quote_alternatives where version_id=target.current_version_id)=1 then select id into choice from public.quote_alternatives where version_id=target.current_version_id; end if;
 if choice is null or not exists(select 1 from public.quote_alternatives where id=choice and version_id=target.current_version_id) then raise exception using errcode='22023',message='Elegí una alternativa del presupuesto actual.'; end if;
 perform private.approve_quote_content(p_id,p_version,p_note);
 update public.quotes set selected_alternative_id=choice where id=p_id;
 return p_id;
end $$;

-- Responsabilidad actual y pases ilimitados; el estado del trabajo permanece independiente.
alter table public.orders add column assigned_to uuid references public.team_members(id),add column assignment_revision integer not null default 1,add column source_order_id uuid references public.orders(id);
create index orders_assigned_to on public.orders(assigned_to);
create table public.order_handoffs(id bigint generated always as identity primary key,order_id uuid not null references public.orders(id),from_member uuid references public.team_members(id),to_member uuid not null references public.team_members(id),actor uuid not null references auth.users(id),note text not null check(length(btrim(note)) between 3 and 1000),created_at timestamptz not null default now());
create index handoffs_order on public.order_handoffs(order_id,id);
alter table public.order_handoffs enable row level security;
revoke all on public.order_handoffs from public,anon,authenticated;
grant all on public.order_handoffs to service_role;
create function public.production_team()
returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
begin
 if not(private.has_team_role('designer') or private.has_team_role('operator')) then raise exception using errcode='42501',message='Sin permiso para consultar Producción.'; end if;
 return query select m.id,m.display_name from public.team_members m where m.active and exists(select 1 from public.team_member_roles r where r.member_id=m.id and r.role='operator') order by m.display_name,m.id;
end $$;
create function public.assign_production(p_order_id uuid,p_to uuid,p_revision integer,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.orders%rowtype;
begin
 if not(private.has_team_role('designer') or private.has_team_role('operator')) then raise exception using errcode='42501',message='Sin permiso para asignar Producción.'; end if;
 select * into target from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='La nota no existe.'; end if;
 if not private.has_team_role('operator') and target.assigned_to is not null then raise exception using errcode='42501',message='Los pases posteriores se realizan desde Producción.'; end if;
 if p_revision is null or p_revision<>target.assignment_revision then raise exception using errcode='40001',message='El responsable cambió. Recargá la nota antes de derivar.'; end if;
 if not exists(select 1 from public.order_items where order_id=p_order_id and production_status<>'completed') then raise exception using errcode='23514',message='La nota ya está terminada.'; end if;
 if p_to is null or not exists(select 1 from public.team_members m join public.team_member_roles r on r.member_id=m.id where m.id=p_to and m.active and r.role='operator') then raise exception using errcode='22023',message='Elegí una persona activa con rol Producción.'; end if;
 if p_to=target.assigned_to then raise exception using errcode='22023',message='La nota ya está asignada a esa persona.'; end if;
 if p_note is null or length(btrim(p_note)) not between 3 and 1000 then raise exception using errcode='22023',message='Dejá una indicación de entre 3 y 1000 caracteres para el pase.'; end if;
 insert into public.order_handoffs(order_id,from_member,to_member,actor,note) values(p_order_id,target.assigned_to,p_to,auth.uid(),btrim(p_note));
 update public.orders set assigned_to=p_to,assignment_revision=assignment_revision+1 where id=p_order_id;
 return p_order_id;
end $$;

alter function public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb) set schema private;
alter function private.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb) rename to create_direct_order_unassigned;
revoke all on function private.create_direct_order_unassigned(uuid,uuid,jsonb,uuid,text,jsonb,jsonb) from public,anon,authenticated;
create function public.create_direct_order(p_id uuid,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_notes text,p_items jsonb,p_deposit jsonb default null,p_assignee_id uuid default null,p_source_order_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existed boolean; result uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 existed:=exists(select 1 from public.orders where id=p_id);
 if not existed and p_source_order_id is not null and (p_source_order_id=p_id or not exists(select 1 from public.orders where id=p_source_order_id)) then raise exception using errcode='22023',message='La nota de origen no es válida.'; end if;
 result:=private.create_direct_order_unassigned(p_id,p_customer_id,p_new_customer,p_new_customer_id,p_notes,p_items,p_deposit);
 if not existed then
  update public.orders set source_order_id=p_source_order_id where id=result;
  if p_assignee_id is not null then perform public.assign_production(result,p_assignee_id,1,'Asignación inicial'); end if;
 end if;
 return result;
end $$;

-- La conversión copia exclusivamente la alternativa ganadora, incluida su ficha.
alter function public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb) set schema private;
alter function private.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb) rename to create_order_from_quote_all_items;
revoke all on function private.create_order_from_quote_all_items(uuid,integer,uuid,jsonb,uuid,jsonb) from public,anon,authenticated;
create function public.create_order_from_quote(p_quote_id uuid,p_version integer,p_customer_id uuid,p_new_customer jsonb,p_new_customer_id uuid,p_deposit jsonb default null,p_assignee_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.quotes%rowtype; client public.customers%rowtype; quotation public.quote_versions%rowtype; result uuid; selected_customer uuid;
begin
 if not private.has_team_role('designer') then raise exception using errcode='42501',message='Necesitás el rol Diseño.'; end if;
 select * into target from public.quotes where id=p_quote_id for update;
 if not found then raise exception using errcode='P0002',message='El presupuesto no existe.'; end if;
 select id into result from public.orders where quote_id=p_quote_id;
 if found then return result; end if;
 if target.status<>'approved' then raise exception using errcode='23514',message='Primero registrá la aprobación del presupuesto.'; end if;
 if p_version is null or target.version<>p_version then raise exception using errcode='40001',message='El presupuesto cambió. Recargá antes de generar el pedido.'; end if;
 if target.customer_id is not null and p_customer_id is not null and target.customer_id<>p_customer_id then raise exception using errcode='23514',message='La nota debe conservar el cliente asociado al presupuesto.'; end if;
 selected_customer:=coalesce(target.customer_id,p_customer_id);
 if selected_customer is null then selected_customer:=public.save_customer(p_new_customer_id,null,p_new_customer); end if;
 select * into client from public.customers where id=selected_customer for share;
 if not found then raise exception using errcode='P0002',message='Seleccioná un cliente válido.'; end if;
 if not exists(select 1 from public.quote_alternatives where id=target.selected_alternative_id and version_id=target.current_version_id) then raise exception using errcode='23514',message='Falta la alternativa aprobada.'; end if;
 select * into quotation from public.quote_versions where id=target.current_version_id;
 insert into public.orders(quote_id,quote_version_id,customer_id,customer_snapshot,total,notes,created_by)
 select target.id,quotation.id,client.id,to_jsonb(client)-'created_by'-'version',sum(amount),quotation.notes,auth.uid() from public.quote_items where version_id=quotation.id and alternative_id=target.selected_alternative_id returning id into result;
 insert into public.order_items(order_id,position,description,specifications,quantity,amount,client_description,technical_sheet)
 select result,row_number() over(order by position),description,specifications,quantity,amount,client_description,technical_sheet from public.quote_items where version_id=quotation.id and alternative_id=target.selected_alternative_id;
 update public.quotes set customer_id=selected_customer where id=target.id and customer_id is null;
 update public.quote_versions set customer_id=selected_customer where id=quotation.id and customer_id is null;
 perform private.initial_deposit(result,p_deposit);
 if p_assignee_id is not null then perform public.assign_production(result,p_assignee_id,1,'Asignación inicial'); end if;
 return result;
end $$;

create function public.workshop_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not(private.has_team_role('designer') or private.has_team_role('operator')) then raise exception using errcode='42501',message='Sin permiso para consultar la ficha de taller.'; end if;
 select jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,'customer_name',o.customer_snapshot->>'display_name','notes',o.notes,
 'assigned_to',o.assigned_to,'assignee_name',(select m.display_name from public.team_members m where m.id=o.assigned_to),'assignment_revision',o.assignment_revision,
 'handoffs',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'from_name',fm.display_name,'to_name',tm.display_name,'actor_name',am.display_name,'note',h.note,'created_at',h.created_at) order by h.id) from public.order_handoffs h left join public.team_members fm on fm.id=h.from_member join public.team_members tm on tm.id=h.to_member left join public.team_members am on am.auth_user_id=h.actor where h.order_id=o.id),'[]'::jsonb),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,'client_description',i.client_description,'technical_sheet',i.technical_sheet,'specifications',i.specifications,'quantity',i.quantity,'production_status',i.production_status,'completion_note',i.completion_note,'completed_at',i.completed_at) order by i.position) from public.order_items i where i.order_id=o.id),'[]'::jsonb)) into result from public.orders o where o.id=p_order_id;
 return result;
end $$;
create or replace function public.production_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 return public.workshop_order(p_order_id);
end $$;
drop function public.production_queue(text,integer);
create function public.production_queue(p_status text default 'pending',p_offset integer default 0,p_customer_id uuid default null,p_assignee text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; current_member uuid;
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 if p_status is null or p_status not in ('pending','completed','all') or p_offset is null or p_offset<0 or p_offset>2000000 or p_assignee is null or p_assignee not in ('all','mine','others','unassigned') then raise exception using errcode='22023',message='Revisá los filtros.'; end if;
 select id into current_member from public.team_members where auth_user_id=auth.uid() and active;
 with summaries as(
 select o.id,o.number,o.created_at,o.customer_snapshot->>'display_name' as customer_name,o.assigned_to,m.display_name as assignee_name,count(i.id) as item_count,count(i.id) filter(where i.production_status='completed') as completed_count
 from public.orders o join public.order_items i on i.order_id=o.id left join public.team_members m on m.id=o.assigned_to
 where (p_customer_id is null or o.customer_id=p_customer_id) and (p_assignee='all' or(p_assignee='mine' and o.assigned_to=current_member) or(p_assignee='others' and o.assigned_to is not null and o.assigned_to<>current_member) or(p_assignee='unassigned' and o.assigned_to is null)) group by o.id,m.display_name
 ),filtered as(select * from summaries where p_status='all' or(p_status='pending' and completed_count<item_count) or(p_status='completed' and completed_count=item_count)),page as(select * from filtered order by number desc limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from filtered),'orders',coalesce((select jsonb_agg(to_jsonb(page) order by number desc) from page),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.production_customers(p_query text default '',p_id uuid default null)
returns table(id uuid,display_name text,phone text) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_team_role('operator') then raise exception using errcode='42501',message='Necesitás el rol Producción.'; end if;
 if p_query is null or length(p_query)>100 then raise exception using errcode='22023',message='Revisá la búsqueda.'; end if;
 return query select c.id,c.display_name,''::text from public.customers c where exists(select 1 from public.orders o where o.customer_id=c.id) and(p_id is null or c.id=p_id) and(p_query='' or strpos(lower(c.display_name),lower(p_query))>0) order by c.display_name,c.id limit 20;
end $$;
revoke all on function public.save_quote(uuid,integer,text,text,text,jsonb,uuid,text,jsonb),public.approve_quote(uuid,integer,text,uuid),public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid),public.production_team(),public.assign_production(uuid,uuid,integer,text),public.workshop_order(uuid),public.production_queue(text,integer,uuid,text),public.production_customers(text,uuid) from public,anon;
grant execute on function public.save_quote(uuid,integer,text,text,text,jsonb,uuid,text,jsonb),public.approve_quote(uuid,integer,text,uuid),public.create_direct_order(uuid,uuid,jsonb,uuid,text,jsonb,jsonb,uuid,uuid),public.create_order_from_quote(uuid,integer,uuid,jsonb,uuid,jsonb,uuid),public.production_team(),public.assign_production(uuid,uuid,integer,text),public.workshop_order(uuid),public.production_queue(text,integer,uuid,text),public.production_customers(text,uuid) to authenticated;
