-- Motta Multimarcas / GVN DIGITAL. No demo inventory, customers or accounts.
-- All administrative writes go through the guarded command API. Browser roles
-- receive SELECT only; public catalog is a separate, sanitized projection.
create schema if not exists motta_private;
revoke all on schema motta_private from public;
grant usage on schema motta_private to authenticated;

create table public.motta_profiles (
 id uuid primary key references auth.users(id), full_name text not null check(length(trim(full_name))>0),
 role text not null check(role in ('admin','manager','seller','operational')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create function motta_private.can(area text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.motta_profiles p where p.id=auth.uid() and p.active and
 (p.role='admin' or (p.role='manager' and area<>'settings') or
 (p.role='seller' and area in ('inventory','vehicle_write','customers','negotiations','tasks')) or
 (p.role='operational' and area in ('inventory','tasks','images'))));
$$;
revoke all on function motta_private.can(text) from public;
grant execute on function motta_private.can(text) to authenticated;

create table public.motta_vehicles (
 id uuid primary key default gen_random_uuid(), internal_code text not null unique,
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 brand text not null check(length(trim(brand))>0), model text not null check(length(trim(model))>0), version text not null default '',
 manufacture_year integer not null check(manufacture_year between 1900 and 2100),
 model_year integer not null check(model_year between 1900 and 2100), mileage integer not null check(mileage>=0),
 fuel_type text not null default '', transmission text not null default '', engine text not null default '', color text not null default '',
 doors integer check(doors between 2 and 6), asking_price numeric(14,2) not null check(asking_price>0),
 description text not null default '', features jsonb not null default '[]' check(jsonb_typeof(features)='array'),
 operational_status text not null default 'received' check(operational_status in ('received','preparing','ready','pending')),
 commercial_status text not null default 'available' check(commercial_status in ('available','negotiating','reserved','sold','withdrawn')),
 publication_status text not null default 'draft' check(publication_status in ('draft','published','unpublished')),
 entry_date date not null default current_date, origin text not null default '', supplier text not null default '', internal_notes text not null default '',
 responsible_id uuid references public.motta_profiles(id), created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 search_text text generated always as (brand||' '||model||' '||version||' '||internal_code) stored
);
create table public.motta_vehicle_costs (
 vehicle_id uuid primary key references public.motta_vehicles(id), acquisition_price numeric(14,2) not null default 0 check(acquisition_price>=0),
 created_at timestamptz not null default now()
);
create table public.motta_vehicle_images (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.motta_vehicles(id),
 storage_path text not null unique, category text not null check(category in ('exterior','interior','details')),
 alt_text text not null, sort_order integer not null default 0 check(sort_order>=0), is_cover boolean not null default false,
 created_at timestamptz not null default now(), deleted_at timestamptz,
 check(split_part(storage_path,'/',1)=vehicle_id::text)
);
create unique index motta_one_cover on public.motta_vehicle_images(vehicle_id) where is_cover and deleted_at is null;
create table public.motta_customers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), phone text not null default '',
 whatsapp text not null default '', email text not null default '', document_number text not null default '', address text not null default '',
 notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.motta_negotiations (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.motta_vehicles(id), customer_id uuid not null references public.motta_customers(id),
 title text not null, search_text text generated always as (title||' '||id::text) stored,
 assigned_to uuid references public.motta_profiles(id), status text not null default 'new' check(status in ('new','contacting','proposal','negotiating','reserved','won','lost')),
 proposed_price numeric(14,2) check(proposed_price>=0), next_contact_at timestamptz, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.motta_vehicle_tasks (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.motta_vehicles(id), title text not null check(length(trim(title))>0),
 description text not null default '', assigned_to uuid references public.motta_profiles(id), due_date date,
 status text not null default 'pending' check(status in ('pending','done')), completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.motta_vehicle_movements (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.motta_vehicles(id),
 movement_type text not null check(movement_type in ('entry','sale','return','transfer','other')),
 movement_date date not null default current_date, mileage integer check(mileage>=0), acquisition_price numeric(14,2) check(acquisition_price>=0), origin text not null default '', supplier text not null default '',
 notes text not null default '', created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index motta_entries on public.motta_vehicle_movements(vehicle_id,movement_date) where movement_type='entry';
create table public.motta_vehicle_documents (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid references public.motta_vehicles(id), customer_id uuid references public.motta_customers(id),
 title text not null, document_type text not null, storage_path text not null unique, notes text not null default '',
 uploaded_by uuid references auth.users(id), created_at timestamptz not null default now(), deleted_at timestamptz,
 check(vehicle_id is not null or customer_id is not null),
 check(split_part(storage_path,'/',1)=coalesce(vehicle_id,customer_id)::text)
);
create table public.motta_sales (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null unique references public.motta_vehicles(id),
 customer_id uuid not null references public.motta_customers(id), seller_id uuid not null references public.motta_profiles(id),
 sale_price numeric(14,2) not null check(sale_price>0), asking_price numeric(14,2) not null, sale_date date not null,
 payment_method text not null check(payment_method in ('pix','cash','transfer','financing','installments','mixed')), down_payment numeric(14,2) not null default 0 check(down_payment>=0 and down_payment<=sale_price),
 installments integer not null default 1 check(installments between 1 and 120),
 payment_status text not null default 'pending' check(payment_status in ('pending','partial','paid')),
 delivery_status text not null default 'pending' check(delivery_status in ('pending','delivered')),
 notes text not null default '', idempotency_key uuid not null unique, created_at timestamptz not null default now()
);
create table public.motta_sale_payments (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.motta_sales(id), amount numeric(14,2) not null check(amount>0),
 due_date date not null, paid_at timestamptz, status text not null default 'pending' check(status in ('pending','paid')),
 created_at timestamptz not null default now(), check((status='paid')=(paid_at is not null))
);
create table public.motta_expenses (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.motta_vehicles(id), title text not null,
 category text not null check(category in ('preparation','other')), amount numeric(14,2) not null check(amount>0), expense_date date not null,
 paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.motta_customer_interactions (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.motta_customers(id),
 vehicle_id uuid references public.motta_vehicles(id), title text not null, notes text not null default '',
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.motta_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), title text not null,
 entity_id uuid, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.motta_audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), entity_type text not null, entity_id uuid,
 action text not null, title text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.motta_dealership_settings (
 id integer primary key default 1 check(id=1), business_name text not null default 'Motta Multimarcas', whatsapp text not null default '', phone text not null default '',
 address text not null default '', opening_hours text not null default '', logo_url text not null default '/img/07_logotipo_motta_mockup.png',
 socials jsonb not null default '{}', show_sold boolean not null default false, preferences jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.motta_dealership_settings(id,whatsapp,address) values(1,'+55 51 9219-2120','R. Tibúrcio de Azevedo, 493 - Americana, Alvorada - RS, 94820-480');
create table public.motta_catalog (
 id uuid primary key, slug text not null unique, data jsonb not null, updated_at timestamptz not null default now()
);
create table public.motta_public_settings (
 id integer primary key check(id=1), data jsonb not null, updated_at timestamptz not null default now()
);

-- Index every referencing column, then add search/time indexes.
-- PostgreSQL numeric NaN compares above ordinary values: reject it explicitly.
do $$ declare c record;begin
 for c in select table_name,column_name from information_schema.columns where table_schema='public' and table_name like 'motta_%' and data_type='numeric' loop
 execute format('alter table public.%I add check(%I <> ''NaN''::numeric)',c.table_name,c.column_name);
 end loop;
end $$;
do $$ declare r record; begin
 for r in select distinct t.relname,a.attname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
 join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
 where c.contype='f' and n.nspname='public' and t.relname like 'motta_%'
 and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null and i.indkey[0]=a.attnum)
 loop execute format('create index if not exists %I on public.%I(%I)',r.relname||'_'||r.attname||'_idx',r.relname,r.attname);end loop;
end $$;
create index motta_vehicles_state on public.motta_vehicles(commercial_status,publication_status,created_at desc);
create index motta_tasks_due on public.motta_vehicle_tasks(status,due_date);
create index motta_sales_date on public.motta_sales(sale_date);
create index motta_expenses_date on public.motta_expenses(expense_date);
create index motta_movements_date on public.motta_vehicle_movements(movement_date,movement_type);
create index motta_audit_time on public.motta_audit_logs(created_at desc);
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
-- Respect an existing pg_trgm installation in another schema.
do $$ declare ns text;item text;col text;begin
 select n.nspname into ns from pg_extension x join pg_namespace n on n.oid=x.extnamespace where x.extname='pg_trgm';
 foreach item in array array['vehicles','customers','negotiations','vehicle_tasks','vehicle_documents'] loop
 col=case when item in ('vehicles','negotiations') then 'search_text' when item='customers' then 'name' else 'title' end;
 execute format('create index %I on public.motta_%I using gin (%I %I.gin_trgm_ops)','motta_'||item||'_search_idx',item,col,ns);
 end loop;
end $$;

-- SELECT access is role-specific. No direct administrative DML grant or policy.
do $$ declare item text; area text; begin
 foreach item in array array['profiles','vehicles','vehicle_costs','vehicle_images','customers','negotiations','vehicle_tasks','vehicle_movements','vehicle_documents','sales','sale_payments','expenses','customer_interactions','notifications','audit_logs','dealership_settings','catalog','public_settings'] loop
 execute format('alter table public.motta_%I enable row level security',item);
 execute format('revoke all on public.motta_%I from public,anon,authenticated',item);
 execute format('grant select on public.motta_%I to authenticated',item);
 area=case when item in ('vehicle_costs','expenses','sales','sale_payments') then 'finance'
 when item in ('customers','customer_interactions') then 'customers' when item='negotiations' then 'negotiations'
 when item='vehicle_documents' then 'documents' when item='dealership_settings' then 'settings'
 when item='audit_logs' then 'reports' when item='vehicle_tasks' then 'tasks' else 'inventory' end;
 if item in ('catalog','public_settings') then
 execute format('grant select on public.motta_%I to anon',item);
 execute format('create policy public_read on public.motta_%I for select to anon,authenticated using(true)',item);
 elsif item='audit_logs' then
 execute 'create policy audit_read on public.motta_audit_logs for select to authenticated using((select motta_private.can(''reports'')) or (actor_id=(select auth.uid()) and (select motta_private.can(''inventory'')) and entity_type in (''motta_vehicles'',''motta_negotiations'',''motta_customers'',''motta_vehicle_tasks'',''motta_vehicle_images'',''motta_customer_interactions'')))';
 elsif item='profiles' then
 execute 'create policy profile_read on public.motta_profiles for select to authenticated using(id=(select auth.uid()) or (select motta_private.can(''inventory'')))';
 elsif item='notifications' then
 execute 'create policy own_notifications on public.motta_notifications for select to authenticated using(user_id=(select auth.uid()) and (select motta_private.can(''inventory'')))';
 else
 execute format('create policy staff_read on public.motta_%I for select to authenticated using((select motta_private.can(%L)))',item,area);
 end if;
 end loop;
end $$;

create function motta_private.refresh_catalog(vid uuid) returns void language plpgsql security definer set search_path='' as $$
declare v public.motta_vehicles; imgs jsonb; begin
 select * into v from public.motta_vehicles where id=vid for update;
 if not found or v.archived_at is not null or v.operational_status<>'ready' or v.publication_status<>'published' or
 v.commercial_status not in ('available','negotiating','reserved') and not(v.commercial_status='sold' and exists(select 1 from public.motta_dealership_settings where show_sold)) then
 delete from public.motta_catalog where id=vid;return;end if;
 select jsonb_agg(jsonb_build_object('id',i.id,'vehicleId',i.vehicle_id,'path',i.storage_path,'category',i.category,'alt',i.alt_text,'sortOrder',i.sort_order,'isCover',i.is_cover) order by i.is_cover desc,i.sort_order,i.created_at)
 into imgs from public.motta_vehicle_images i where i.vehicle_id=vid and i.deleted_at is null;
 if imgs is null or not exists(select 1 from public.motta_vehicle_images where vehicle_id=vid and is_cover and deleted_at is null) then
 delete from public.motta_catalog where id=vid;return;end if;
 insert into public.motta_catalog(id,slug,data) values(v.id,v.slug,jsonb_build_object(
 'id',v.id,'slug',v.slug,'brand',v.brand,'model',v.model,'version',v.version,'year',v.model_year,'km',v.mileage,'price',v.asking_price,
 'description',v.description,'features',v.features,'status',case v.commercial_status when 'sold' then 'sold' when 'reserved' then 'reserved' else 'available' end,
 'specifications',jsonb_build_object('transmission',v.transmission,'fuel',v.fuel_type,'color',v.color,'engine',v.engine,'doors',v.doors),'images',imgs))
 on conflict(id) do update set slug=excluded.slug,data=excluded.data,updated_at=now();
end $$;
create function motta_private.catalog_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin perform motta_private.refresh_catalog((case when tg_table_name='motta_vehicle_images' then to_jsonb(new)->>'vehicle_id' else to_jsonb(new)->>'id' end)::uuid);return new;end $$;
create trigger motta_catalog_vehicle after insert or update on public.motta_vehicles for each row execute function motta_private.catalog_trigger();
create trigger motta_catalog_image after insert or update on public.motta_vehicle_images for each row execute function motta_private.catalog_trigger();
create function motta_private.settings_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare vid uuid;begin
 insert into public.motta_public_settings(id,data) values(1,jsonb_build_object('name',new.business_name,'whatsapp',new.whatsapp,'phone',new.phone,'address',new.address,'hours',new.opening_hours,'logo',new.logo_url,'socials',new.socials))
 on conflict(id) do update set data=excluded.data,updated_at=now();
 for vid in select id from public.motta_vehicles where commercial_status='sold' loop perform motta_private.refresh_catalog(vid);end loop;return new;
end $$;
create trigger motta_public_settings_update after update on public.motta_dealership_settings for each row execute function motta_private.settings_trigger();
update public.motta_dealership_settings set updated_at=now();

create function motta_private.audit_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare doc jsonb:=to_jsonb(new);previous jsonb;label text;event text:=lower(tg_op);details jsonb:='{}';begin
 if tg_op='UPDATE' then previous=to_jsonb(old);end if;
 label=coalesce(doc->>'brand',doc->>'title',doc->>'name',doc->>'business_name',tg_table_name);
 if doc ? 'brand' then label=label||' '||(doc->>'model');end if;
 if doc->>'vehicle_id' is not null then select v.brand||' '||v.model||' · '||label into label from public.motta_vehicles v where v.id=(doc->>'vehicle_id')::uuid;end if;
 if tg_table_name='motta_vehicles' then
 event=case when tg_op='INSERT' then 'vehicle_created' when previous->>'archived_at' is null and doc->>'archived_at' is not null then 'vehicle_archived'
 when previous->>'archived_at' is not null and doc->>'archived_at' is null then 'vehicle_restored'
 when doc->>'commercial_status'='sold' and previous->>'commercial_status'<>'sold' then 'vehicle_sold'
 when doc->>'publication_status'='published' and previous->>'publication_status'<>'published' then 'vehicle_published'
 when doc->>'publication_status'<>'published' and previous->>'publication_status'='published' then 'vehicle_unpublished'
 when doc->>'commercial_status'='reserved' and previous->>'commercial_status'<>'reserved' then 'vehicle_reserved'
 when doc->>'asking_price' is distinct from previous->>'asking_price' then 'price_updated' else 'vehicle_updated' end;
 details=jsonb_build_object('previous_price',previous->'asking_price','price',doc->'asking_price','publication',doc->'publication_status','commercial',doc->'commercial_status');
 elsif tg_table_name='motta_vehicle_documents' then event=case when tg_op='INSERT' then 'document_added' when doc->>'deleted_at' is not null then 'document_removed' else 'document_restored' end;
 elsif tg_table_name='motta_negotiations' then
 event=case when tg_op='INSERT' then 'negotiation_created' else 'negotiation_updated' end;
 details=jsonb_build_object('previous_status',previous->'status','status',doc->'status','previous_proposed_price',previous->'proposed_price','proposed_price',doc->'proposed_price');
 elsif tg_table_name='motta_sales' then event=case when tg_op='INSERT' then 'sale_registered' else 'sale_updated' end;
 elsif tg_table_name='motta_vehicle_tasks' then event=case when tg_op='INSERT' then 'task_added' when doc->>'status'='done' then 'task_completed' else 'task_updated' end;
 end if;
 insert into public.motta_audit_logs(actor_id,entity_type,entity_id,action,title,metadata)
 values(auth.uid(),tg_table_name,coalesce(nullif(doc->>'id','')::uuid,nullif(doc->>'vehicle_id','')::uuid),event,label,details);return new;
end $$;
do $$ declare item text;begin
 foreach item in array array['vehicles','vehicle_costs','vehicle_images','customers','negotiations','vehicle_tasks','vehicle_movements','vehicle_documents','sales','sale_payments','expenses','customer_interactions'] loop
 execute format('create trigger motta_audit after insert or update on public.motta_%I for each row execute function motta_private.audit_trigger()',item);
 end loop;
end $$;

-- Image and document storage are separate. Documents have no public read policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('vehicle-public-images','vehicle-public-images',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('vehicle-private-documents','vehicle-private-documents',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- INSERT is deliberately unavailable to browser roles. motta-upload validates
-- identity, role, parent, file size and content before uploading server-side.
create policy motta_image_read on storage.objects for select to authenticated using(bucket_id='vehicle-public-images' and (select motta_private.can('inventory')));
-- No overwrite/delete grant: replace with a new path; soft deletion keeps recovery possible.
create policy motta_document_read on storage.objects for select to authenticated using(bucket_id='vehicle-private-documents' and (select motta_private.can('documents')) and
 exists(select 1 from public.motta_vehicle_documents d where d.storage_path=name and d.deleted_at is null));
-- Restrictive guards also protect these buckets from unrelated permissive
-- Storage policies that might already exist on the target project.
create policy motta_upload_guard on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id not in ('vehicle-public-images','vehicle-private-documents'));
create policy motta_retention_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id not in ('vehicle-public-images','vehicle-private-documents')) with check(bucket_id not in ('vehicle-public-images','vehicle-private-documents'));
create policy motta_retention_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id not in ('vehicle-public-images','vehicle-private-documents'));
create policy motta_document_guard on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'vehicle-private-documents' or
 (auth.uid() is not null and (select motta_private.can('documents')) and exists(select 1 from public.motta_vehicle_documents d where d.storage_path=name and d.deleted_at is null)));

create function motta_private.command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); vid uuid:=nullif(payload->>'vehicle_id','')::uuid; rid uuid:=nullif(payload->>'id','')::uuid;
 v public.motta_vehicles; s public.motta_sales; rowdata jsonb; area text; rec record; result jsonb; n integer; total numeric; due date;
begin
 if uid is null or not motta_private.can('inventory') then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 area=case when action in ('vehicle_save','vehicle_duplicate') then 'vehicle_write' when action='vehicle_preparation' then 'tasks' when action like 'customer%' or action='interaction_save' then 'customers' when action like 'negotiation%' then 'negotiations'
 when action like 'task%' then 'tasks' when action like 'image%' then 'images' when action like 'document%' then 'documents'
 when action in ('sale_register','sale_delivery','payment_paid','expense_save','expense_paid','report') then 'finance'
 when action in ('settings_save','profile_save') then 'settings' when action='movement_save' then 'movements' else 'inventory' end;
 if not motta_private.can(area) then raise exception 'Seu perfil não tem permissão para esta operação' using errcode='42501';end if;

 if action='vehicle_save' then
 if rid is not null then
 select * into v from public.motta_vehicles where id=rid for update;
 if not found then raise exception 'Veículo não encontrado';end if;
 if payload->>'updated_at' is distinct from v.updated_at::text and (payload->>'updated_at')::timestamptz is distinct from v.updated_at then raise exception 'Cadastro alterado por outro usuário. Reabra antes de salvar.';end if;
 if v.commercial_status='sold' then raise exception 'Venda concluída: cadastro preservado para histórico';end if;
 end if;
 select * into rec from jsonb_to_record(payload) as x(internal_code text,slug text,brand text,model text,version text,manufacture_year int,model_year int,mileage int,fuel_type text,transmission text,engine text,color text,doors int,asking_price numeric,description text,features jsonb,entry_date date,origin text,supplier text,internal_notes text,responsible_id uuid,operational_status text);
 if rid is null then
 insert into public.motta_vehicles(internal_code,slug,brand,model,version,manufacture_year,model_year,mileage,fuel_type,transmission,engine,color,doors,asking_price,description,features,entry_date,origin,supplier,internal_notes,responsible_id,operational_status,created_by)
 values(rec.internal_code,rec.slug,rec.brand,rec.model,coalesce(rec.version,''),rec.manufacture_year,rec.model_year,rec.mileage,coalesce(rec.fuel_type,''),coalesce(rec.transmission,''),coalesce(rec.engine,''),coalesce(rec.color,''),rec.doors,rec.asking_price,coalesce(rec.description,''),coalesce(rec.features,'[]'),coalesce(rec.entry_date,current_date),coalesce(rec.origin,''),coalesce(rec.supplier,''),coalesce(rec.internal_notes,''),coalesce(rec.responsible_id,uid),coalesce(rec.operational_status,'received'),uid) returning id into rid;
 insert into public.motta_vehicle_movements(vehicle_id,movement_type,movement_date,mileage,acquisition_price,origin,supplier,created_by) values(rid,'entry',coalesce(rec.entry_date,current_date),rec.mileage,nullif(payload->>'acquisition_price','')::numeric,coalesce(rec.origin,''),coalesce(rec.supplier,''),uid);
 foreach area in array array['Inspeção inicial','Revisão mecânica','Limpeza','Higienização','Fotografias','Documentação','Precificação','Aprovação para publicação'] loop
 insert into public.motta_vehicle_tasks(vehicle_id,title) values(rid,area);end loop;
 else
 update public.motta_vehicles set internal_code=rec.internal_code,slug=rec.slug,brand=rec.brand,model=rec.model,version=coalesce(rec.version,''),manufacture_year=rec.manufacture_year,model_year=rec.model_year,mileage=rec.mileage,fuel_type=coalesce(rec.fuel_type,''),transmission=coalesce(rec.transmission,''),engine=coalesce(rec.engine,''),color=coalesce(rec.color,''),doors=rec.doors,asking_price=rec.asking_price,description=coalesce(rec.description,''),features=coalesce(rec.features,'[]'),entry_date=rec.entry_date,origin=coalesce(rec.origin,''),supplier=coalesce(rec.supplier,''),internal_notes=coalesce(rec.internal_notes,''),responsible_id=rec.responsible_id,operational_status=rec.operational_status,updated_at=now() where id=rid;
 end if;
 if payload ? 'acquisition_price' then
 if not motta_private.can('finance') then raise exception 'Sem acesso aos custos';end if;
 insert into public.motta_vehicle_costs(vehicle_id,acquisition_price) values(rid,(payload->>'acquisition_price')::numeric) on conflict(vehicle_id) do update set acquisition_price=excluded.acquisition_price;
 end if;
 update public.motta_vehicles set publication_status='unpublished' where id=rid and publication_status='published' and operational_status<>'ready';
 select to_jsonb(t) into result from public.motta_vehicles t where id=rid;return result;

 elsif action='vehicle_duplicate' then
 select * into v from public.motta_vehicles where id=rid;
 if not found then raise exception 'Veículo não encontrado';end if;
 return motta_private.command('vehicle_save',(to_jsonb(v)-'id'-'updated_at')||jsonb_build_object('internal_code',v.internal_code||'-'||substr(gen_random_uuid()::text,1,8),'slug',v.slug||'-'||substr(gen_random_uuid()::text,1,8),'entry_date',current_date,'operational_status','received'));

 elsif action='vehicle_preparation' then
 update public.motta_vehicles set operational_status=payload->>'operational_status',publication_status=case when payload->>'operational_status'<>'ready' then 'unpublished' else publication_status end,updated_at=now() where id=rid and commercial_status<>'sold' and archived_at is null returning to_jsonb(motta_vehicles.*) into result;
 if result is null then raise exception 'Veículo indisponível para preparação';end if;return result;
 elsif action in ('vehicle_publish','vehicle_unpublish','vehicle_reserve','vehicle_archive','vehicle_restore') then
 if not motta_private.can('publishing') then raise exception 'Publicação e situação comercial exigem gerente ou administrador';end if;
 select * into v from public.motta_vehicles where id=rid for update;
 if not found then raise exception 'Veículo não encontrado';end if;
 if action='vehicle_publish' then
 if v.archived_at is not null or v.commercial_status not in ('available','negotiating','reserved') or v.operational_status<>'ready' or
 not exists(select 1 from public.motta_vehicle_images where vehicle_id=rid and deleted_at is null and is_cover) then raise exception 'Publicação exige veículo pronto para venda, ativo e com fotografia de capa';end if;
 update public.motta_vehicles set publication_status='published',updated_at=now() where id=rid;
 elsif action='vehicle_unpublish' then update public.motta_vehicles set publication_status='unpublished',updated_at=now() where id=rid;
 elsif action='vehicle_reserve' then
 if v.archived_at is not null or v.commercial_status not in ('available','negotiating') then raise exception 'Veículo não pode ser reservado';end if;
 update public.motta_vehicles set commercial_status='reserved',updated_at=now() where id=rid;
 elsif action='vehicle_archive' then update public.motta_vehicles set archived_at=now(),publication_status='unpublished',updated_at=now() where id=rid;
 else update public.motta_vehicles set archived_at=null,updated_at=now() where id=rid;end if;
 return jsonb_build_object('id',rid);

 elsif action='image_save' then
 perform 1 from public.motta_vehicles where id=vid and archived_at is null for update;if not found then raise exception 'Veículo indisponível';end if;
 if not exists(select 1 from storage.objects where bucket_id='vehicle-public-images' and name=payload->>'storage_path' and split_part(name,'/',1)=vid::text) then raise exception 'Upload não encontrado ou associado a outro veículo';end if;
 if coalesce((payload->>'is_cover')::boolean,false) then update public.motta_vehicle_images set is_cover=false where vehicle_id=vid and deleted_at is null;end if;
 insert into public.motta_vehicle_images(id,vehicle_id,storage_path,category,alt_text,sort_order,is_cover)
 values(coalesce(rid,gen_random_uuid()),vid,payload->>'storage_path',payload->>'category',payload->>'alt_text',coalesce((payload->>'sort_order')::int,0),coalesce((payload->>'is_cover')::boolean,false))
 on conflict(id) do update set category=excluded.category,alt_text=excluded.alt_text,sort_order=excluded.sort_order,is_cover=excluded.is_cover where motta_vehicle_images.vehicle_id=excluded.vehicle_id and motta_vehicle_images.storage_path=excluded.storage_path and motta_vehicle_images.deleted_at is null returning to_jsonb(motta_vehicle_images.*) into result;
 if result is null then raise exception 'Fotografia não pertence a este cadastro';end if;
 if not exists(select 1 from public.motta_vehicle_images where vehicle_id=vid and deleted_at is null and is_cover) then update public.motta_vehicles set publication_status='unpublished',updated_at=now() where id=vid and publication_status='published';end if;return result;
 elsif action='image_delete' then
 perform 1 from public.motta_vehicles where id=vid for update;
 update public.motta_vehicle_images set deleted_at=now(),is_cover=false where id=rid and vehicle_id=vid and deleted_at is null;
 if not found then raise exception 'Fotografia não encontrada';end if;
 if not exists(select 1 from public.motta_vehicle_images where vehicle_id=vid and deleted_at is null and is_cover) then update public.motta_vehicles set publication_status='unpublished',updated_at=now() where id=vid and publication_status='published';end if;return '{}'::jsonb;
 elsif action='image_restore' then
 if not motta_private.can('settings') then raise exception 'Somente o administrador pode recuperar arquivos removidos';end if;
 perform 1 from public.motta_vehicles where id=vid for update;
 update public.motta_vehicle_images set deleted_at=null,is_cover=not exists(select 1 from public.motta_vehicle_images where vehicle_id=vid and is_cover and deleted_at is null) where id=rid and vehicle_id=vid and deleted_at is not null returning to_jsonb(motta_vehicle_images.*) into result;
 if result is null then raise exception 'Fotografia removida não encontrada';end if;return result;

 elsif action='customer_save' then
 insert into public.motta_customers(id,name,phone,whatsapp,email,document_number,address,notes)
 values(coalesce(rid,gen_random_uuid()),payload->>'name',coalesce(payload->>'phone',''),coalesce(payload->>'whatsapp',''),coalesce(payload->>'email',''),coalesce(payload->>'document_number',''),coalesce(payload->>'address',''),coalesce(payload->>'notes',''))
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,document_number=excluded.document_number,address=excluded.address,notes=excluded.notes,updated_at=now() returning to_jsonb(motta_customers.*) into result;return result;
 elsif action='interaction_save' then
 insert into public.motta_customer_interactions(customer_id,vehicle_id,title,notes,created_by) values((payload->>'customer_id')::uuid,vid,payload->>'title',coalesce(payload->>'notes',''),uid) returning to_jsonb(motta_customer_interactions.*) into result;return result;

 elsif action='negotiation_save' then
 select * into v from public.motta_vehicles where id=vid for update;
 if not found or v.archived_at is not null or v.commercial_status in ('sold','withdrawn') then raise exception 'Veículo indisponível para negociação';end if;
 if payload->>'status'='won' then raise exception 'Conclua a negociação pelo registro transacional da venda';end if;
 insert into public.motta_negotiations(id,vehicle_id,customer_id,title,assigned_to,status,proposed_price,next_contact_at,notes)
 values(coalesce(rid,gen_random_uuid()),vid,(payload->>'customer_id')::uuid,payload->>'title',coalesce(nullif(payload->>'assigned_to','')::uuid,uid),payload->>'status',nullif(payload->>'proposed_price','')::numeric,nullif(payload->>'next_contact_at','')::timestamptz,coalesce(payload->>'notes',''))
 on conflict(id) do update set title=excluded.title,assigned_to=excluded.assigned_to,status=excluded.status,proposed_price=excluded.proposed_price,next_contact_at=excluded.next_contact_at,notes=excluded.notes,updated_at=now()
 where motta_negotiations.vehicle_id=excluded.vehicle_id and motta_negotiations.customer_id=excluded.customer_id returning to_jsonb(motta_negotiations.*) into result;
 if result is null then raise exception 'Não é permitido trocar cliente ou veículo de uma negociação existente';end if;
 update public.motta_vehicles set commercial_status=case when exists(select 1 from public.motta_negotiations where vehicle_id=vid and status='reserved') then 'reserved'
 when exists(select 1 from public.motta_negotiations where vehicle_id=vid and status not in ('won','lost')) then 'negotiating' else 'available' end,updated_at=now() where id=vid;
 if rid is null then insert into public.motta_notifications(user_id,title,entity_id) values(coalesce(nullif(payload->>'assigned_to','')::uuid,uid),'Nova negociação: '||(payload->>'title'),(result->>'id')::uuid);end if;return result;

 elsif action='task_save' then
 insert into public.motta_vehicle_tasks(id,vehicle_id,title,description,assigned_to,due_date)
 values(coalesce(rid,gen_random_uuid()),vid,payload->>'title',coalesce(payload->>'description',''),nullif(payload->>'assigned_to','')::uuid,nullif(payload->>'due_date','')::date)
 on conflict(id) do update set title=excluded.title,description=excluded.description,assigned_to=excluded.assigned_to,due_date=excluded.due_date where motta_vehicle_tasks.vehicle_id=excluded.vehicle_id returning to_jsonb(motta_vehicle_tasks.*) into result;return result;
 elsif action='task_toggle' then
 update public.motta_vehicle_tasks set status=case when status='done' then 'pending' else 'done' end,completed_at=case when status='done' then null else now() end where id=rid returning to_jsonb(motta_vehicle_tasks.*) into result;
 if result is null then raise exception 'Tarefa não encontrada';end if;return result;

 elsif action='document_save' then
 if not exists(select 1 from storage.objects where bucket_id='vehicle-private-documents' and name=payload->>'storage_path') then raise exception 'Upload do documento não encontrado';end if;
 insert into public.motta_vehicle_documents(vehicle_id,customer_id,title,document_type,storage_path,notes,uploaded_by)
 values(vid,nullif(payload->>'customer_id','')::uuid,payload->>'title',payload->>'document_type',payload->>'storage_path',coalesce(payload->>'notes',''),uid) returning to_jsonb(motta_vehicle_documents.*) into result;return result;
 elsif action='document_delete' then
 update public.motta_vehicle_documents set deleted_at=now() where id=rid and deleted_at is null;if not found then raise exception 'Documento não encontrado';end if;return '{}'::jsonb;
 elsif action='document_restore' then
 if not motta_private.can('settings') then raise exception 'Somente o administrador pode recuperar documentos removidos';end if;
 update public.motta_vehicle_documents set deleted_at=null where id=rid and deleted_at is not null returning to_jsonb(motta_vehicle_documents.*) into result;
 if result is null then raise exception 'Documento removido não encontrado';end if;return result;
 elsif action='document_access' then
 select to_jsonb(d) into result from public.motta_vehicle_documents d where id=rid and deleted_at is null;
 if result is null then raise exception 'Documento não encontrado';end if;
 insert into public.motta_audit_logs(actor_id,entity_type,entity_id,action,title) values(uid,'motta_vehicle_documents',rid,'access','Acesso autorizado ao documento');return result;

 elsif action='movement_save' then
 select * into v from public.motta_vehicles where id=vid for update;if not found then raise exception 'Veículo não encontrado';end if;
 if v.archived_at is not null then raise exception 'Restaure o cadastro antes de movimentar o veículo';end if;
 if payload->>'movement_type'='sale' then raise exception 'Use Registrar Venda';end if;
 if v.commercial_status='sold' then raise exception 'Histórico de venda não pode ser alterado por movimentação';end if;
 if exists(select 1 from public.motta_vehicle_movements where vehicle_id=vid and movement_date>(payload->>'movement_date')::date) then raise exception 'A movimentação não pode anteceder a última movimentação registrada';end if;
 if payload->>'movement_type'='entry' then
 if v.commercial_status<>'withdrawn' and exists(select 1 from public.motta_vehicle_movements where vehicle_id=vid and movement_type='entry') then raise exception 'O veículo já está no estoque e sua entrada está registrada';end if;
 update public.motta_vehicles set commercial_status='available',operational_status='received',publication_status='draft',entry_date=(payload->>'movement_date')::date,mileage=coalesce(nullif(payload->>'mileage','')::int,mileage),updated_at=now() where id=vid;
 if nullif(payload->>'acquisition_price','') is not null then insert into public.motta_vehicle_costs(vehicle_id,acquisition_price) values(vid,(payload->>'acquisition_price')::numeric) on conflict(vehicle_id) do update set acquisition_price=excluded.acquisition_price;end if;
 else
 if v.commercial_status='withdrawn' then raise exception 'O veículo já possui saída registrada';end if;
 if length(trim(coalesce(payload->>'notes','')))<5 then raise exception 'Informe a justificativa da saída';end if;
 update public.motta_vehicles set commercial_status='withdrawn',publication_status='unpublished',updated_at=now() where id=vid;
 update public.motta_negotiations set status='lost',updated_at=now() where vehicle_id=vid and status not in ('won','lost');
 end if;
 insert into public.motta_vehicle_movements(vehicle_id,movement_type,movement_date,mileage,acquisition_price,origin,supplier,notes,created_by)
 values(vid,payload->>'movement_type',(payload->>'movement_date')::date,nullif(payload->>'mileage','')::int,nullif(payload->>'acquisition_price','')::numeric,coalesce(payload->>'origin',''),coalesce(payload->>'supplier',''),coalesce(payload->>'notes',''),uid) returning to_jsonb(motta_vehicle_movements.*) into result;return result;

 elsif action='sale_register' then
 select * into s from public.motta_sales where idempotency_key=(payload->>'idempotency_key')::uuid;
 if found then return to_jsonb(s);end if;
 select * into v from public.motta_vehicles where id=vid for update;
 if not found or v.archived_at is not null or v.commercial_status not in ('available','negotiating','reserved') then raise exception 'Veículo já vendido ou indisponível';end if;
 if (payload->>'sale_date')::date<v.entry_date then raise exception 'A venda não pode anteceder a entrada no estoque';end if;
 insert into public.motta_sales(vehicle_id,customer_id,seller_id,sale_price,asking_price,sale_date,payment_method,down_payment,installments,notes,idempotency_key)
 values(vid,(payload->>'customer_id')::uuid,coalesce(nullif(payload->>'seller_id','')::uuid,uid),(payload->>'sale_price')::numeric,v.asking_price,(payload->>'sale_date')::date,payload->>'payment_method',coalesce((payload->>'down_payment')::numeric,0),coalesce((payload->>'installments')::int,1),coalesce(payload->>'notes',''),(payload->>'idempotency_key')::uuid) returning * into s;
 if s.down_payment>0 then insert into public.motta_sale_payments(sale_id,amount,due_date) values(s.id,s.down_payment,s.sale_date);end if;
 total=s.sale_price-s.down_payment;n=s.installments;due=coalesce(nullif(payload->>'first_due_date','')::date,s.sale_date+30);
 if total>0 and total/n<0.01 then raise exception 'O saldo é insuficiente para a quantidade de parcelas';end if;
 if total>0 then for i in 1..n loop
 insert into public.motta_sale_payments(sale_id,amount,due_date) values(s.id,case when i=n then total-round(total/n,2)*(n-1) else round(total/n,2) end,(due+make_interval(months=>i-1))::date);end loop;end if;
 -- Preserve whether the advertisement was approved. refresh_catalog removes
 -- sold cars unless show_sold is enabled, so enabling that preference later
 -- can restore only previously published records with valid photographs.
 update public.motta_vehicles set commercial_status='sold',updated_at=now() where id=vid;
 insert into public.motta_vehicle_movements(vehicle_id,movement_type,movement_date,created_by) values(vid,'sale',s.sale_date,uid);
 update public.motta_negotiations set status=case when customer_id=s.customer_id then 'won' else 'lost' end,updated_at=now() where vehicle_id=vid and status not in ('won','lost');
 return to_jsonb(s);
 elsif action='sale_delivery' then
 update public.motta_sales set delivery_status='delivered' where id=rid returning to_jsonb(motta_sales.*) into result;return result;
 elsif action='payment_paid' then
 select s1.* into s from public.motta_sales s1 join public.motta_sale_payments p on p.sale_id=s1.id where p.id=rid for update of s1;
 if not found then raise exception 'Parcela não encontrada';end if;
 update public.motta_sale_payments set status='paid',paid_at=coalesce(paid_at,now()) where id=rid;
 select coalesce(sum(amount),0) into total from public.motta_sale_payments where sale_id=s.id and status='paid';
 update public.motta_sales set payment_status=case when total>=sale_price then 'paid' when total>0 then 'partial' else 'pending' end where id=s.id;return '{}'::jsonb;
 elsif action='expense_save' then
 insert into public.motta_expenses(vehicle_id,title,category,amount,expense_date,paid_at) values(vid,payload->>'title',payload->>'category',(payload->>'amount')::numeric,(payload->>'expense_date')::date,nullif(payload->>'paid_at','')::timestamptz) returning to_jsonb(motta_expenses.*) into result;return result;
 elsif action='expense_paid' then
 update public.motta_expenses set paid_at=coalesce(paid_at,now()) where id=rid returning to_jsonb(motta_expenses.*) into result;
 if result is null then raise exception 'Despesa não encontrada';end if;return result;

 elsif action='notification_read' then
 update public.motta_notifications set read_at=now() where id=rid and user_id=uid;return '{}'::jsonb;
 elsif action='profile_save' then
 if rid=uid and (payload->>'role'<>'admin' or not (payload->>'active')::boolean) then raise exception 'Não remova seu próprio acesso administrativo';end if;
 insert into public.motta_profiles(id,full_name,role,active) values(rid,payload->>'full_name',payload->>'role',(payload->>'active')::boolean)
 on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,active=excluded.active;
 insert into public.motta_audit_logs(actor_id,entity_type,entity_id,action,title) values(uid,'motta_profiles',rid,'permission','Permissão de usuário alterada');return '{}'::jsonb;
 elsif action='settings_save' then
 update public.motta_dealership_settings set business_name=payload->>'business_name',whatsapp=coalesce(payload->>'whatsapp',''),phone=coalesce(payload->>'phone',''),address=coalesce(payload->>'address',''),opening_hours=coalesce(payload->>'opening_hours',''),logo_url=coalesce(payload->>'logo_url','/img/07_logotipo_motta_mockup.png'),socials=coalesce(payload->'socials','{}'),show_sold=coalesce((payload->>'show_sold')::boolean,false),preferences=coalesce(payload->'preferences','{}'),updated_at=now() where id=1;
 insert into public.motta_audit_logs(actor_id,entity_type,action,title) values(uid,'motta_dealership_settings','update','Configurações da loja atualizadas');return '{}'::jsonb;
 else raise exception 'Operação desconhecida';end if;
end $$;
revoke all on all functions in schema motta_private from public,anon;
grant execute on function motta_private.can(text),motta_private.command(text,jsonb) to authenticated;
create function public.motta_command(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select motta_private.command(action,payload)$$;
revoke all on function public.motta_command(text,jsonb) from public,anon;
grant execute on function public.motta_command(text,jsonb) to authenticated;

create function public.motta_dashboard(months integer default 6) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;begin
 if not motta_private.can('inventory') then raise exception 'Não autorizado' using errcode='42501';end if;
 if months not in (3,6,12) then raise exception 'Período inválido';end if;
 select jsonb_build_object(
 'available',(select count(*) from public.motta_vehicles where archived_at is null and commercial_status='available'),
 'negotiating',(select count(distinct vehicle_id) from public.motta_negotiations where status not in ('won','lost')),
 'sold',(select count(*) from public.motta_vehicles where commercial_status='sold' and id in(select vehicle_id from public.motta_vehicle_movements where movement_type='sale' and movement_date>=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date)),
 'entries',(select count(*) from public.motta_vehicle_movements where movement_type='entry' and movement_date>=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date),
 'history',(select coalesce(jsonb_agg(x order by x.month),'[]') from (
 select d::date as month,(select count(*) from public.motta_vehicle_movements where movement_type='entry' and movement_date>=d::date and movement_date<(d+interval '1 month')::date) as entries,
 (select count(*) from public.motta_vehicle_movements where movement_type='sale' and movement_date>=d::date and movement_date<(d+interval '1 month')::date) as sales,
 (select count(*) from public.motta_vehicle_movements where movement_type='entry' and movement_date<(d+interval '1 month')::date)-(select count(*) from public.motta_vehicle_movements where movement_type<>'entry' and movement_date<(d+interval '1 month')::date) as stock
 from generate_series(date_trunc('month',now() at time zone 'America/Sao_Paulo')-make_interval(months=>months-1),date_trunc('month',now() at time zone 'America/Sao_Paulo'),interval '1 month') d) x),
 'events',(select coalesce(jsonb_agg(x),'[]') from(select a.*,(select full_name from public.motta_profiles where id=a.actor_id) as actor_name from public.motta_audit_logs a order by created_at desc limit 5)x),
 'tasks',(select coalesce(jsonb_agg(x),'[]') from(select * from public.motta_vehicle_tasks where status='pending' order by due_date nulls last,created_at limit 5)x)
 ) into result;return result;end $$;
revoke all on function public.motta_dashboard(integer) from public,anon;
grant execute on function public.motta_dashboard(integer) to authenticated;

create function public.motta_report(start_date date,end_date date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;begin
 if not motta_private.can('finance') then raise exception 'Não autorizado' using errcode='42501';end if;
 if start_date>end_date or end_date-start_date>3660 then raise exception 'Período inválido';end if;
 select jsonb_build_object(
 'registered',(select count(*) from public.motta_vehicles where entry_date between start_date and end_date),
 'available',(select count(*) from public.motta_vehicles where commercial_status='available' and archived_at is null),
 'sold',(select count(*) from public.motta_sales where sale_date between start_date and end_date),
 'entries',(select count(*) from public.motta_vehicle_movements where movement_type='entry' and movement_date between start_date and end_date),
 'exits',(select count(*) from public.motta_vehicle_movements where movement_type<>'entry' and movement_date between start_date and end_date),
 'asking_total',(select coalesce(sum(asking_price),0) from public.motta_vehicles where archived_at is null and commercial_status in ('available','negotiating','reserved')),
 'sales_total',(select coalesce(sum(sale_price),0) from public.motta_sales where sale_date between start_date and end_date),
 'recorded_costs',(select coalesce(sum(acquisition_price),0) from public.motta_vehicle_costs c join public.motta_vehicles v on v.id=c.vehicle_id where v.entry_date between start_date and end_date)+(select coalesce(sum(amount),0) from public.motta_expenses where expense_date between start_date and end_date),
 'estimated_margin',(select coalesce(sum(s.sale_price-c.acquisition_price-coalesce((select sum(amount) from public.motta_expenses e where e.vehicle_id=s.vehicle_id),0)),0) from public.motta_sales s join public.motta_vehicle_costs c on c.vehicle_id=s.vehicle_id where sale_date between start_date and end_date),
 'sales_without_cost',(select count(*) from public.motta_sales s where sale_date between start_date and end_date and not exists(select 1 from public.motta_vehicle_costs c where c.vehicle_id=s.vehicle_id)),
 'received',(select coalesce(sum(amount),0) from public.motta_sale_payments where status='paid' and (paid_at at time zone 'America/Sao_Paulo')::date between start_date and end_date),
 'avg_days',(select round(avg(s.sale_date-v.entry_date),1) from public.motta_sales s join public.motta_vehicles v on v.id=s.vehicle_id where s.sale_date between start_date and end_date),
 'negotiations',(select coalesce(jsonb_agg(x),'[]') from(select status,count(*) as count from public.motta_negotiations where created_at::date between start_date and end_date group by status)x)
 ) into result;return result;end $$;
revoke all on function public.motta_report(date,date) from public,anon;
grant execute on function public.motta_report(date,date) to authenticated;

-- Realtime is optional; polling on the client also covers reconnects and DELETE.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.motta_catalog,public.motta_public_settings;
 end if;
end $$;
