create or replace function motta_private.financing_receive(payload jsonb,request_key uuid,notice_version text) returns jsonb language plpgsql security definer set search_path='' as $$
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
 values(app.id,extensions.pgp_sym_encrypt(payload::text,k,'cipher-algo=aes256,compress-algo=1'),fingerprint,request_key,request_hash,jsonb_build_object('notice_text',cfg.notice_text,'policy_url',cfg.policy_url,'legal_basis',cfg.legal_basis,'version',cfg.notice_version,'extra_fields',cfg.extra_fields,'acknowledged_at',app.privacy_acknowledged_at));
 insert into motta_private.financing_events(application_id,event_type,new_status) values(app.id,'received','new');
 insert into public.motta_notifications(user_id,title,entity_id) select id,'Nova ficha de financiamento recebida · '||app.protocol||case when v.id is not null then ' · '||v.brand||' '||v.model else '' end,app.id from public.motta_profiles where active and role in ('admin','manager');
 return jsonb_build_object('protocol',app.protocol);
end $$;

create or replace function motta_private.financing_admin(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if exists(select 1 from public.motta_financing_settings c where c.id=1 and c.notice_version<>'' and c.notice_version=payload->>'notice_version' and (c.notice_text is distinct from payload->>'notice_text' or c.legal_basis is distinct from payload->>'legal_basis' or c.policy_url is distinct from payload->>'policy_url' or c.extra_fields is distinct from coalesce(payload->'extra_fields','[]'::jsonb))) then raise exception 'Use uma nova versão ao alterar o aviso, os campos ou as condições de privacidade';end if;
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
