import {validateApplication} from './validation.js';
export function createFinancingHandler({createClient,env,now=()=>Date.now()}){
 const origins=['https://www.mottamultimarcas.com.br','https://mottamultimarcas.com.br','https://motta-multimarcas.vercel.app','http://127.0.0.1:5173','http://localhost:5173'];
 const encode=new TextEncoder();
 async function hmac(value){const key=await crypto.subtle.importKey('raw',encode.encode(env('SUPABASE_SERVICE_ROLE_KEY')), {name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encode.encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
 return async req=>{
  const origin=req.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  const reply=(data,status=200)=>Response.json(data,{status,headers});
  if(!origins.includes(origin))return reply({error:'Origem não permitida.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method))return reply({error:'Método não permitido.'},405);
  try{
   const client=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:settings,error:settingsError}=await client.from('motta_financing_settings').select('*').eq('id',1).single();
   if(settingsError||!settings?.enabled||!settings?.legal_validated)return reply({error:'O envio de fichas ainda não está disponível. Fale com nossa equipe pelo WhatsApp.'},503);
   const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();const ipHash=await hmac('financing-ip:'+ip);
   if(req.method==='GET'){const issued_at=now(),nonce=crypto.randomUUID(),signature=await hmac(nonce+':'+issued_at+':'+ipHash);return reply({nonce,issued_at,signature});}
   const {data:allowed,error:rateError}=await client.rpc('motta_financing_rate',{ip_hash:ipHash});if(rateError)throw Error('rate');if(!allowed)return reply({error:'Muitas tentativas. Aguarde antes de tentar novamente.'},429);
   if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'Formato inválido.'},400);
   const reader=req.body?.getReader();if(!reader)return reply({error:'Dados ausentes.'},400);let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>24576){await reader.cancel();return reply({error:'Solicitação muito grande.'},413);}chunks.push(value);}let body;try{body=JSON.parse(new TextDecoder().decode(await new Blob(chunks).arrayBuffer()));if(!body||typeof body!=='object'||!body.application||typeof body.application!=='object')throw Error();}catch{return reply({error:'Dados inválidos.'},400);}
   const c=body.challenge,age=now()-Number(c?.issued_at);if(body.website||!c||age<2000||age>3600000||!/^[0-9a-f-]{36}$/.test(c.nonce||'')||await hmac(c.nonce+':'+c.issued_at+':'+ipHash)!==c.signature)return reply({error:'Verificação de segurança expirada. Recarregue a ficha e tente novamente.'},400);
   if(body.privacy_acknowledged!==true||body.privacy_notice_version!==settings.notice_version)return reply({error:'Confira e confirme o aviso de privacidade vigente.'},400);
   if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.idempotency_key||''))return reply({error:'Identificador inválido.'},400);
   const checked=validateApplication(body.application,settings.extra_fields||[]);if(!checked.valid)return reply({error:'Confira os campos indicados.',fields:checked.errors},400);
   const {data,error}=await client.rpc('motta_financing_receive',{payload:checked.data,request_key:body.idempotency_key,notice_version:settings.notice_version});
   if(error)return reply({error:['23514','22P02','P0001'].includes(error.code)?'Confira a disponibilidade do veículo e os dados da ficha. Se já enviou, aguarde o contato da equipe.':'Não foi possível enviar agora. Tente novamente com a mesma ficha.'},error.code==='P0001'?409:503);
   return reply({protocol:data.protocol},201);
  }catch{return reply({error:'Não foi possível concluir a solicitação. Confira sua conexão e tente novamente.'},503);}
 };
}
