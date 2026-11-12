const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body,status=200)=>Response.json(body,{status,headers:cors});
export function validateContent(bytes,type,kind){
 if(!bytes.length||bytes.length>(kind==='image'?10:20)*1024*1024)throw Error('Tamanho do arquivo inválido.');
 const ascii=(start,end)=>String.fromCharCode(...bytes.subarray(start,end));
 if(type==='application/pdf'&&kind==='document'){
 if(!ascii(0,8).startsWith('%PDF-')||!new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-1024))).includes('%%EOF'))throw Error('O conteúdo não é um PDF válido.');
 return 'pdf';
 }
 // Images are decoded/re-encoded in the browser, then independently inspected
 // here. Public clients cannot bypass this endpoint using Storage directly.
 if(type!=='image/webp'||bytes.length<30||ascii(0,4)!=='RIFF'||ascii(8,12)!=='WEBP')throw Error('Imagem inválida. Envie uma imagem processada em WebP.');
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(data.getUint32(4,true)+8!==bytes.length)throw Error('Arquivo WebP truncado ou inconsistente.');
 let offset=12,frame=false;
 while(offset+8<=bytes.length){const chunk=ascii(offset,offset+4),size=data.getUint32(offset+4,true),start=offset+8;
 if(start+size>bytes.length)throw Error('Conteúdo WebP inconsistente.');
 let width,height;
 if(chunk==='VP8 '){if(size<10||ascii(start+3,start+6)!=='\x9d\x01\x2a')throw Error('Quadro WebP inválido.');width=data.getUint16(start+6,true)&0x3fff;height=data.getUint16(start+8,true)&0x3fff;frame=true;}
 if(chunk==='VP8L'){if(size<5||bytes[start]!==0x2f)throw Error('Quadro WebP inválido.');const bits=data.getUint32(start+1,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;frame=true;}
 if(chunk==='ANIM'||chunk==='ANMF')throw Error('Fotografias animadas não são aceitas.');
 if(width!==undefined&&(!width||!height||width>2200||height>2200))throw Error('A imagem deve ter até 2200 pixels em cada lado.');
 offset=start+size+(size%2);
 }
 if(!frame||offset!==bytes.length)throw Error('WebP sem quadro de imagem válido.');return 'webp';
}
export async function handleUpload(req,{createClient,env}){
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Método não permitido.'},405);
 try{
 const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Autenticação obrigatória.'},401);
 const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({error:'Armazenamento ainda não configurado.'},503);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();if(authError||!user)return reply({error:'Sessão inválida.'},401);
 const {data:profile,error:profileError}=await caller.from('motta_profiles').select('role,active').eq('id',user.id).maybeSingle();
 if(profileError||!profile?.active)return reply({error:'Conta sem autorização.'},403);
 // Bound the body before parsing multipart, including requests with no length.
 const reader=req.body?.getReader();if(!reader)return reply({error:'Arquivo ausente.'},400);const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>21*1024*1024){await reader.cancel();return reply({error:'Arquivo muito grande.'},413);}chunks.push(value);}
 const all=new Uint8Array(size);let pos=0;for(const chunk of chunks){all.set(chunk,pos);pos+=chunk.length;}
 const form=await new Request(req.url,{method:'POST',headers:req.headers,body:all}).formData();
 const kind=form.get('kind'),vehicleId=form.get('vehicle_id'),customerId=form.get('customer_id'),file=form.get('file');
 if(!['image','document'].includes(kind)||!(file instanceof File))return reply({error:'Arquivo ou categoria inválida.'},400);
 if(!(kind==='image'?['admin','manager','operational']:['admin','manager']).includes(profile.role))return reply({error:'Seu perfil não pode enviar este arquivo.'},403);
 const parent=vehicleId||customerId;if(!/^[0-9a-f-]{36}$/.test(parent||'')||(kind==='image'&&!vehicleId))return reply({error:'Vínculo do arquivo inválido.'},400);
 let parentQuery=caller.from(vehicleId?'motta_vehicles':'motta_customers').select('id').eq('id',parent).is('archived_at',null);
 const {data:record,error:parentError}=await parentQuery.maybeSingle();if(parentError||!record)return reply({error:'Cadastro não encontrado ou sem acesso.'},403);
 const bytes=new Uint8Array(await file.arrayBuffer());const extension=validateContent(bytes,file.type,kind);
 const bucket=kind==='image'?'vehicle-public-images':'vehicle-private-documents';const path=`${parent}/${crypto.randomUUID()}.${extension}`;
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await admin.storage.from(bucket).upload(path,bytes,{contentType:file.type,upsert:false});if(error)return reply({error:'Não foi possível armazenar o arquivo.'},502);
 return reply({path,bucket,size:bytes.length});
 }catch(err){return reply({error:err instanceof Error?err.message:'Arquivo inválido.'},400);}
}
