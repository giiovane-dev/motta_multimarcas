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
 if exists(select 1 from motta_private.financing_details d join public.motta_financing_applications a on a.id=d.application_id where d.request_fingerprint=request_hash and a.created_at>now()-interval '1 day') then raise exception 'Solicitação semelhante já recebida';end if;
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
create or replace function motta_private.financing_rate(ip_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; total integer;begin
 if length(ip_hash)<>64 then return false;end if;
 insert into motta_private.financing_rate_limits(key,window_start,hits) values('global-hour',date_trunc('hour',now()),1)
 on conflict(key) do update set hits=case when financing_rate_limits.window_start<date_trunc('hour',now()) then 1 else financing_rate_limits.hits+1 end,window_start=date_trunc('hour',now()) returning hits into total;
 insert into motta_private.financing_rate_limits(key,window_start,hits) values(ip_hash,date_trunc('hour',now()),1)
 on conflict(key) do update set hits=case when financing_rate_limits.window_start<date_trunc('hour',now()) then 1 else financing_rate_limits.hits+1 end,window_start=date_trunc('hour',now()) returning hits into n;
 return n<=10 and total<=120;
end $$;
