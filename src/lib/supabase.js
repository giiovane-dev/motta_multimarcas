import {createClient} from '@supabase/supabase-js';

const url=import.meta.env?.VITE_SUPABASE_URL;
const key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured=Boolean(url&&key);
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null;
export function requireSupabase(){if(!supabase)throw Error('Conexão com o Supabase ainda não configurada.');return supabase;}
export function databaseError(error){const messages={'23505':'Já existe um registro com esse código ou endereço de página. Confira os dados antes de salvar.','23503':'O cadastro vinculado não foi encontrado. Atualize a tela e selecione novamente.','23514':'Há um valor fora das condições permitidas. Confira os campos preenchidos.','22P02':'Há um campo com formato inválido. Confira números, datas e vínculos.','42501':'Seu perfil não tem autorização para esta operação.','PGRST202':'A configuração do banco está pendente. A operação não foi executada.','PGRST205':'A configuração do banco está pendente. Não foi possível consultar os registros.'};return Object.assign(new Error(messages[error.code]||error.message||'Não foi possível concluir a operação.'),{code:error.code});}
export async function command(action,payload={}){const {data,error}=await requireSupabase().rpc('motta_command',{action,payload});if(error)throw databaseError(error);return data;}
export async function uploadFile(blob,kind,{vehicleId='',customerId=''}={}){
 const form=new FormData();form.set('file',blob,blob.type==='application/pdf'?'document.pdf':'image.webp');form.set('kind',kind);if(vehicleId)form.set('vehicle_id',vehicleId);if(customerId)form.set('customer_id',customerId);
 const {data,error}=await requireSupabase().functions.invoke('motta-upload',{body:form});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error||'Não foi possível enviar. Confira a conexão e a função de upload.');}return data.path;
}
export async function list(table,{page=0,size=20,search='',status='',vehicleId='',from='',to=''}={}){
 const vehicle='vehicle:motta_vehicles(brand,model,internal_code)';
 const projection={vehicles:'*,images:motta_vehicle_images(storage_path,is_cover,sort_order,deleted_at)',sales:`*,${vehicle},customer:motta_customers(name)`,negotiations:`*,${vehicle},customer:motta_customers(name)`,vehicle_tasks:`*,${vehicle}`,vehicle_movements:`*,${vehicle}`,vehicle_documents:`*,${vehicle},customer:motta_customers(name)`};
 let q=requireSupabase().from(`motta_${table}`).select(projection[table]||'*',{count:'exact'});
 if(search){const term=search.replace(/[%_,().\\]/g,' ').trim().slice(0,100);if(term)q=q.ilike(['vehicles','negotiations'].includes(table)?'search_text':table==='customers'?'name':'title',`%${term}%`);}
 if(status)q=q.eq(table==='vehicles'?'commercial_status':table==='vehicle_movements'?'movement_type':'status',status);
 if(vehicleId)q=q.eq('vehicle_id',vehicleId);
 if(from)q=q.gte('created_at',from);if(to)q=q.lt('created_at',`${to}T23:59:59.999Z`);
 const {data,error,count}=await q.order(table==='sale_payments'?'due_date':'created_at',{ascending:table==='sale_payments'}).range(page*size,(page+1)*size-1);if(error)throw databaseError(error);return {rows:data,total:count??data.length};
}
