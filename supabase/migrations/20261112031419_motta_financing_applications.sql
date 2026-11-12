-- Public collection remains disabled until the approved privacy settings exist.
create table public.motta_financing_settings (
 id integer primary key check(id=1), enabled boolean not null default false,
 legal_validated boolean not null default false, legal_basis text not null default '',
 notice_version text not null default '', notice_text text not null default '', policy_url text not null default '',
 retention_days integer check(retention_days between 1 and 3650), extra_fields jsonb not null default '[]',
 validated_by uuid references public.motta_profiles(id), validated_at timestamptz,
 check(jsonb_typeof(extra_fields)='array' and jsonb_array_length(extra_fields)<=5),
 check(not enabled or (legal_validated and length(legal_basis)>5 and length(notice_version)>0 and length(notice_text)>40 and policy_url ~ '^https://' and retention_days is not null and validated_at is not null))
);
insert into public.motta_financing_settings(id) values(1);
alter table public.motta_financing_settings enable row level security;
revoke all on public.motta_financing_settings from anon,authenticated;
grant select on public.motta_financing_settings to anon,authenticated,service_role;
create policy financing_settings_read on public.motta_financing_settings for select to anon,authenticated using(true);

-- Only a minimized summary is exposed to authorized staff and Realtime.
create table public.motta_financing_applications (
 id uuid primary key default gen_random_uuid(), protocol text not null unique default ('MOT-'||upper(encode(extensions.gen_random_bytes(10),'hex'))),
 vehicle_id uuid references public.motta_vehicles(id), vehicle_snapshot jsonb not null default '{}',
 applicant_label text not null,
 status text not null default 'new' check(status in ('new','in_service','awaiting_information','awaiting_documents','forwarded','in_review','approved','declined','completed','cancelled')),
 assigned_to uuid references public.motta_profiles(id), customer_id uuid references public.motta_customers(id),
 next_contact_at timestamptz, privacy_notice_version text not null, privacy_acknowledged_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), expires_at timestamptz not null
);
create index financing_applications_status_created on public.motta_financing_applications(status,created_at desc);
create index financing_applications_assigned on public.motta_financing_applications(assigned_to);
create index financing_applications_vehicle on public.motta_financing_applications(vehicle_id);
create index financing_applications_customer on public.motta_financing_applications(customer_id);
create index financing_applications_expiry on public.motta_financing_applications(expires_at);
alter table public.motta_financing_applications enable row level security;
revoke all on public.motta_financing_applications from anon,authenticated;
grant select on public.motta_financing_applications to authenticated;
create policy financing_staff_summary on public.motta_financing_applications for select to authenticated using((select motta_private.can('finance')));

create table motta_private.financing_details (
 application_id uuid primary key references public.motta_financing_applications(id) on delete cascade,
 encrypted_payload bytea not null, cpf_fingerprint text not null, request_key uuid not null unique, request_fingerprint text not null,
 privacy_snapshot jsonb not null
);
create index financing_details_fingerprint on motta_private.financing_details(cpf_fingerprint);
create table motta_private.financing_events (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.motta_financing_applications(id) on delete cascade,
 actor_id uuid references public.motta_profiles(id), event_type text not null, previous_status text,new_status text,
 notes text not null default '', evidence_reference text not null default '',created_at timestamptz not null default now()
);
create index financing_events_application on motta_private.financing_events(application_id,created_at);
create index financing_events_actor on motta_private.financing_events(actor_id);
create table motta_private.financing_disclosures (
 id uuid primary key default gen_random_uuid(),application_id uuid not null references public.motta_financing_applications(id) on delete cascade,
 institution_id uuid references public.motta_financing_institutions(id) on delete set null,institution_name text not null,
 purpose text not null, disclosed_fields jsonb not null,disclosed_by uuid not null references public.motta_profiles(id),disclosed_at timestamptz not null default now()
);
create index financing_disclosures_application on motta_private.financing_disclosures(application_id);
create index financing_disclosures_institution on motta_private.financing_disclosures(institution_id);
create index financing_disclosures_actor on motta_private.financing_disclosures(disclosed_by);
create table motta_private.financing_tasks (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.motta_financing_applications(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200),assigned_to uuid references public.motta_profiles(id),due_at timestamptz,
 completed_at timestamptz, created_at timestamptz not null default now()
);
create index financing_tasks_application on motta_private.financing_tasks(application_id);
create index financing_tasks_assignee on motta_private.financing_tasks(assigned_to);
create table motta_private.financing_rate_limits (key text primary key,window_start timestamptz not null,hits integer not null);
alter table motta_private.financing_details enable row level security;
alter table motta_private.financing_events enable row level security;
alter table motta_private.financing_disclosures enable row level security;
alter table motta_private.financing_tasks enable row level security;
alter table motta_private.financing_rate_limits enable row level security;
revoke all on motta_private.financing_details,motta_private.financing_events,motta_private.financing_disclosures,motta_private.financing_tasks,motta_private.financing_rate_limits from public,anon,authenticated;
grant usage on schema motta_private to service_role;

do $$ begin
 if not exists(select 1 from vault.secrets where name='motta_financing_key') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'motta_financing_key','Private financing payload encryption; do not rotate without re-encryption');
 end if;
end $$;
create function motta_private.financing_key() returns text language sql security definer set search_path='' as $$select decrypted_secret from vault.decrypted_secrets where name='motta_financing_key'$$;
revoke all on function motta_private.financing_key() from public,anon,authenticated,service_role;

create function motta_private.financing_rate(ip_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;begin
 if length(ip_hash)<>64 then return false;end if;
 insert into motta_private.financing_rate_limits(key,window_start,hits) values(ip_hash,date_trunc('hour',now()),1)
 on conflict(key) do update set hits=case when financing_rate_limits.window_start<date_trunc('hour',now()) then 1 else financing_rate_limits.hits+1 end,window_start=date_trunc('hour',now()) returning hits into n;
 return n<=10;
end $$;
revoke all on function motta_private.financing_rate(text) from public,anon,authenticated;
grant execute on function motta_private.financing_rate(text) to service_role;
create function public.motta_financing_rate(ip_hash text) returns boolean language sql security invoker set search_path='' as $$select motta_private.financing_rate(ip_hash)$$;
revoke all on function public.motta_financing_rate(text) from public,anon,authenticated;
grant execute on function public.motta_financing_rate(text) to service_role;

create function motta_private.financing_receive(payload jsonb,request_key uuid,notice_version text) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.motta_financing_settings; app public.motta_financing_applications; saved motta_private.financing_details; v public.motta_vehicles; snap jsonb='{}'; k text; fingerprint text; request_hash text; linked uuid;begin
 select * into cfg from public.motta_financing_settings where id=1;
 if not cfg.enabled or not cfg.legal_validated or cfg.notice_version<>notice_version then raise exception 'Coleta indisponível';end if;
 k=motta_private.financing_key();fingerprint=encode(extensions.hmac(payload->>'cpf',k,'sha256'),'hex');request_hash=encode(extensions.hmac(payload::text,k,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into saved from motta_private.financing_details d where d.request_key=financing_receive.request_key;
 if found then
  if saved.request_fingerprint<>request_hash then raise exception 'Identificador já utilizado';end if;
  return (select jsonb_build_object('protocol',protocol) from public.motta_financing_applications where id=saved.application_id);
 end if;
 if payload->>'cpf' !~ '^\d{11}$' or length(payload->>'applicant_name')<5 or length(payload->>'email')>254 or not (payload?'phone') then raise exception 'Dados inválidos';end if;
 perform pg_advisory_xact_lock(hashtextextended(fingerprint,1));
 if (select count(*) from motta_private.financing_details d join public.motta_financing_applications a on a.id=d.application_id where d.cpf_fingerprint=fingerprint and a.created_at>now()-interval '1 day')>=3 then raise exception 'Limite de solicitações';end if;
 if nullif(payload->>'vehicle_id','') is not null then
  select * into v from public.motta_vehicles where id=(payload->>'vehicle_id')::uuid for share;
  if not found or v.publication_status<>'published' or v.archived_at is not null or v.commercial_status<>'available' then raise exception 'Veículo indisponível';end if;
  select jsonb_build_object('id',v.id,'brand',v.brand,'model',v.model,'version',v.version,'year',v.model_year,'price',v.asking_price,'image_path',(select storage_path from public.motta_vehicle_images where vehicle_id=v.id and is_cover and deleted_at is null limit 1)) into snap;
  if (payload->>'down_payment')::numeric>v.asking_price then raise exception 'Entrada superior ao valor';end if;
 end if;
 if (payload->>'down_payment')::numeric<0 or (payload->>'down_payment')::numeric='NaN'::numeric then raise exception 'Entrada inválida';end if;
 select c.id into linked from public.motta_customers c where regexp_replace(c.document_number,'\D','','g')=payload->>'cpf' and (lower(c.email)=payload->>'email' or regexp_replace(c.phone,'\D','','g')=payload->>'phone') and c.archived_at is null order by c.created_at limit 1;
 insert into public.motta_financing_applications(vehicle_id,vehicle_snapshot,applicant_label,privacy_notice_version,expires_at,customer_id)
 values(v.id,snap,left(payload->>'applicant_name',1)||'••• '||left(regexp_replace(payload->>'applicant_name','^.*\s',''),1)||'•••',cfg.notice_version,now()+make_interval(days=>cfg.retention_days),linked) returning * into app;
 insert into motta_private.financing_details(application_id,encrypted_payload,cpf_fingerprint,request_key,request_fingerprint,privacy_snapshot)
 values(app.id,extensions.pgp_sym_encrypt(payload::text,k,'cipher-algo=aes256,compress-algo=1'),fingerprint,request_key,request_hash,jsonb_build_object('notice_text',cfg.notice_text,'policy_url',cfg.policy_url,'legal_basis',cfg.legal_basis,'version',cfg.notice_version,'acknowledged_at',app.privacy_acknowledged_at));
 insert into motta_private.financing_events(application_id,event_type,new_status) values(app.id,'received','new');
 insert into public.motta_notifications(user_id,title,entity_id) select id,'Nova ficha de financiamento recebida · '||app.protocol||case when v.id is not null then ' · '||v.brand||' '||v.model else '' end,app.id from public.motta_profiles where active and role in ('admin','manager');
 return jsonb_build_object('protocol',app.protocol);
end $$;
revoke all on function motta_private.financing_receive(jsonb,uuid,text) from public,anon,authenticated;
grant execute on function motta_private.financing_receive(jsonb,uuid,text) to service_role;
create function public.motta_financing_receive(payload jsonb,request_key uuid,notice_version text) returns jsonb language sql security invoker set search_path='' as $$select motta_private.financing_receive(payload,request_key,notice_version)$$;
revoke all on function public.motta_financing_receive(jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.motta_financing_receive(jsonb,uuid,text) to service_role;

create function motta_private.financing_admin(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); app public.motta_financing_applications; raw jsonb; result jsonb; rid uuid=nullif(payload->>'id','')::uuid; target uuid; note text=trim(coalesce(payload->>'notes','')); new_state text; old_state text; inst text; fields jsonb; taskid uuid;begin
 if uid is null or not motta_private.can('finance') then raise exception 'Não autorizado' using errcode='42501';end if;
 if action='list' then
  select jsonb_build_object('rows',(select coalesce(jsonb_agg(x),'[]') from(select * from public.motta_financing_applications where (coalesce(payload->>'status','')='' or status=payload->>'status') and (coalesce(payload->>'search','')='' or protocol ilike '%'||(payload->>'search')||'%' or applicant_label ilike '%'||(payload->>'search')||'%' or vehicle_snapshot->>'model' ilike '%'||(payload->>'search')||'%') order by created_at desc limit 20 offset greatest(0,least(100000,coalesce((payload->>'page')::integer,0)))*20)x),
   'total',(select count(*) from public.motta_financing_applications where (coalesce(payload->>'status','')='' or status=payload->>'status') and (coalesce(payload->>'search','')='' or protocol ilike '%'||(payload->>'search')||'%' or applicant_label ilike '%'||(payload->>'search')||'%' or vehicle_snapshot->>'model' ilike '%'||(payload->>'search')||'%')),
   'counts',(select coalesce(jsonb_object_agg(status,n),'{}') from(select status,count(*) n from public.motta_financing_applications group by status)s)) into result;return result;
 elsif action='config_get' then
  if not motta_private.can('settings') then raise exception 'Não autorizado';end if;return (select to_jsonb(c) from public.motta_financing_settings c where id=1);
 elsif action='config_save' then
  if not motta_private.can('settings') then raise exception 'Não autorizado';end if;
  if length(payload->>'notice_text')>12000 or length(payload->>'legal_basis')>1000 or length(payload->>'policy_url')>1500 or length(payload->>'notice_version')>80 then raise exception 'Configuração muito longa';end if;
  if jsonb_typeof(coalesce(payload->'extra_fields','[]'))<>'array' then raise exception 'Campos adicionais inválidos';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(payload->'extra_fields','[]')) f where length(f->>'label') not between 1 and 80 or f->>'id' !~ '^[a-zA-Z0-9_-]{1,60}$') then raise exception 'Campo adicional inválido';end if;
  update public.motta_financing_settings set enabled=coalesce((payload->>'enabled')::boolean,false),legal_validated=coalesce((payload->>'legal_validated')::boolean,false),legal_basis=coalesce(payload->>'legal_basis',''),notice_text=coalesce(payload->>'notice_text',''),notice_version=coalesce(payload->>'notice_version',''),policy_url=coalesce(payload->>'policy_url',''),retention_days=nullif(payload->>'retention_days','')::integer,extra_fields=coalesce(payload->'extra_fields','[]'),validated_by=uid,validated_at=now() where id=1;
  insert into public.motta_audit_logs(actor_id,entity_type,action,title) values(uid,'financing_settings','update','Configuração de privacidade das fichas atualizada');return '{}';
 end if;
 select * into app from public.motta_financing_applications where id=rid for update;
 if not found then raise exception 'Ficha indisponível';end if;
 if action in ('detail','reveal','export','link_customer') then
  select extensions.pgp_sym_decrypt(encrypted_payload,motta_private.financing_key())::jsonb into raw from motta_private.financing_details where application_id=rid;
 end if;
 if action in ('detail','reveal','export') then
  if action='export' and not motta_private.can('settings') then raise exception 'Exportação restrita ao administrador';end if;
  insert into motta_private.financing_events(application_id,actor_id,event_type) values(rid,uid,case action when 'detail' then 'view_masked' when 'export' then 'exported' else 'view_full' end);
  if action='detail' then raw=jsonb_build_object('applicant_name',app.applicant_label,'cpf','***.***.***-'||right(raw->>'cpf',2),'phone','********'||right(raw->>'phone',4),'email',left(raw->>'email',1)||'***','city',raw->>'city','state',raw->>'state');end if;
  return jsonb_build_object('application',to_jsonb(app),'applicant',raw,'privacy',(select privacy_snapshot from motta_private.financing_details where application_id=rid),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at desc),'[]') from motta_private.financing_events e where application_id=rid),'disclosures',(select coalesce(jsonb_agg(to_jsonb(d) order by disclosed_at desc),'[]') from motta_private.financing_disclosures d where application_id=rid),'tasks',(select coalesce(jsonb_agg(to_jsonb(t) order by due_at nulls last),'[]') from motta_private.financing_tasks t where application_id=rid));
 elsif action='update' then
  if length(note)<3 or length(note)>2000 then raise exception 'Registre o motivo da atualização (3 a 2000 caracteres)';end if;
  target=nullif(payload->>'assigned_to','')::uuid;if target is not null and not exists(select 1 from public.motta_profiles where id=target and active and role in ('admin','manager')) then raise exception 'Responsável sem permissão';end if;
  new_state=coalesce(nullif(payload->>'status',''),app.status);old_state=app.status;
  if new_state in ('approved','declined') then
   if coalesce((payload->>'institution_confirmed')::boolean,false) is not true or length(trim(coalesce(payload->>'evidence_reference','')))<8 or not exists(select 1 from motta_private.financing_disclosures where application_id=rid) then raise exception 'Registre o compartilhamento e a referência documentada da resposta da instituição';end if;
  end if;
  if new_state in ('forwarded','in_review') and not exists(select 1 from motta_private.financing_disclosures where application_id=rid) then raise exception 'Registre o compartilhamento realizado com a instituição';end if;
  update public.motta_financing_applications set status=new_state,assigned_to=target,next_contact_at=nullif(payload->>'next_contact_at','')::timestamptz,updated_at=now() where id=rid;
  insert into motta_private.financing_events(application_id,actor_id,event_type,previous_status,new_status,notes,evidence_reference) values(rid,uid,'updated',old_state,new_state,note,coalesce(payload->>'evidence_reference',''));
 elsif action='disclose' then
  target=(payload->>'institution_id')::uuid;select name into inst from public.motta_financing_institutions where id=target and enabled;if not found then raise exception 'Instituição inválida';end if;
  fields=payload->'disclosed_fields';if length(note)<5 or length(note)>2000 or jsonb_typeof(fields)<>'array' or jsonb_array_length(fields)=0 or exists(select 1 from jsonb_array_elements_text(fields) f where f not in ('nome','cpf','nascimento','telefone','email','cidade','uf','profissao','renda','veiculo','entrada','prazo')) then raise exception 'Informe finalidade e campos compartilhados';end if;
  insert into motta_private.financing_disclosures(application_id,institution_id,institution_name,purpose,disclosed_fields,disclosed_by) values(rid,target,inst,note,fields,uid);
  insert into motta_private.financing_events(application_id,actor_id,event_type,notes) values(rid,uid,'disclosed','Compartilhamento registrado com '||inst);
 elsif action='task_save' then
  target=nullif(payload->>'assigned_to','')::uuid;if target is not null and not exists(select 1 from public.motta_profiles where id=target and active and role in ('admin','manager')) then raise exception 'Responsável sem permissão';end if;
  insert into motta_private.financing_tasks(application_id,title,assigned_to,due_at) values(rid,left(trim(payload->>'title'),200),target,nullif(payload->>'due_at','')::timestamptz) returning id into taskid;
  insert into motta_private.financing_events(application_id,actor_id,event_type,notes) values(rid,uid,'task_added','Tarefa de atendimento criada');
 elsif action='task_complete' then
  update motta_private.financing_tasks set completed_at=coalesce(completed_at,now()) where id=(payload->>'task_id')::uuid and application_id=rid;
  insert into motta_private.financing_events(application_id,actor_id,event_type) values(rid,uid,'task_completed');
 elsif action='link_customer' then
  perform pg_advisory_xact_lock(hashtextextended(raw->>'cpf',2));
  select id into target from public.motta_customers where regexp_replace(document_number,'\D','','g')=raw->>'cpf' and archived_at is null order by created_at limit 1;
  if target is null then insert into public.motta_customers(name,phone,whatsapp,email,document_number,address) values(raw->>'applicant_name',raw->>'phone',raw->>'phone',raw->>'email',raw->>'cpf',(raw->>'city')||' / '||(raw->>'state')) returning id into target;end if;
  update public.motta_financing_applications set customer_id=target,updated_at=now() where id=rid;
  insert into motta_private.financing_events(application_id,actor_id,event_type,notes) values(rid,uid,'customer_linked','Cadastro vinculado sem sobrescrever dados existentes');
 else raise exception 'Operação desconhecida';end if;
 update public.motta_financing_applications set updated_at=now() where id=rid;
 return jsonb_build_object('id',rid);
end $$;
revoke all on function motta_private.financing_admin(text,jsonb) from public,anon;
grant execute on function motta_private.financing_admin(text,jsonb) to authenticated;
create function public.motta_financing_admin(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select motta_private.financing_admin(action,payload)$$;
revoke all on function public.motta_financing_admin(text,jsonb) from public,anon;
grant execute on function public.motta_financing_admin(text,jsonb) to authenticated;

create function motta_private.financing_purge() returns integer language plpgsql security definer set search_path='' as $$declare n integer;begin
 delete from public.motta_notifications where entity_id in(select id from public.motta_financing_applications where expires_at<now());
 delete from public.motta_financing_applications where expires_at<now();get diagnostics n=row_count;
 delete from motta_private.financing_rate_limits where window_start<now()-interval '2 hours';return n;
end $$;
revoke all on function motta_private.financing_purge() from public,anon,authenticated;
-- Hourly disposal is installed only when cron is available. Deployment verifies it.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('motta-financing-retention','17 * * * *','select motta_private.financing_purge()');
alter publication supabase_realtime add table public.motta_financing_applications;
