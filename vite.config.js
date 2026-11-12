import {defineConfig,loadEnv} from 'vite';
// Vehicle URLs are live routes; publishing does not require another build.
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_SUPABASE_');const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
 let role='';try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role;}catch{}
 if(key.startsWith('sb_secret_')||role==='service_role')throw Error('Chave secreta proibida em VITE_SUPABASE_PUBLISHABLE_KEY. Use uma chave publishable.');
 return {build:{target:'es2022'},plugins:[{
 name:'admin-entry',generateBundle:{order:'post',handler(_,bundle){
 const index=bundle['index.html'];if(!index)return;
 this.emitFile({type:'asset',fileName:'admin/index.html',source:String(index.source).replace('</head>','<meta name="robots" content="noindex,nofollow"></head>').replace(/<title>.*?<\/title>/,'<title>Painel Administrativo | Motta Multimarcas</title>')});
 }}
}]};});
