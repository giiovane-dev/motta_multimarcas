import {supabase,configured} from './lib/supabase.js';
import {vehicles,business} from './data.js';

let snapshot='',running=false,settingsSnapshot='';
export function publicVehicle(row,client=supabase){
 const v=row.data,images=v.images||[];return {...v,images:images.map(i=>({...i,url:client.storage.from('vehicle-public-images').getPublicUrl(i.path).data.publicUrl})),imageUrl:client.storage.from('vehicle-public-images').getPublicUrl(images.find(i=>i.isCover)?.path||images[0]?.path||'').data.publicUrl};
}
export async function loadCatalog(){
 if(!configured)return false;
 const [catalog,settings]=await Promise.all([supabase.from('motta_catalog').select('id,data').order('updated_at',{ascending:false}).abortSignal(AbortSignal.timeout(10000)),supabase.from('motta_public_settings').select('data').eq('id',1).abortSignal(AbortSignal.timeout(10000)).maybeSingle()]);
 if(catalog.error||settings.error){console.warn('Catálogo indisponível.');return false;}
 const serialized=JSON.stringify(catalog.data),nextSettings=JSON.stringify(settings.data?.data||{});const changed=serialized!==snapshot;
 const settingsChanged=settingsSnapshot&&settingsSnapshot!==nextSettings;
 if(settings.data?.data)Object.assign(business,settings.data.data);
 vehicles.splice(0,vehicles.length,...catalog.data.map(row=>publicVehicle(row)));
 snapshot=serialized;settingsSnapshot=nextSettings;
 if(settingsChanged)location.reload();return changed;
}
export function watchCatalog(onChange){
 if(!configured)return;
 const refresh=async()=>{if(running||document.hidden)return;running=true;try{if(await loadCatalog())onChange();}catch{/* Keep the last successful catalog on transient outages. */}finally{running=false;}};
 const channel=supabase.channel('motta-public-catalog').on('postgres_changes',{event:'*',schema:'public',table:'motta_catalog'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'motta_public_settings'},refresh).subscribe();
 const timer=setInterval(refresh,15000);document.addEventListener('visibilitychange',refresh);window.addEventListener('online',refresh);
 window.addEventListener('pagehide',()=>{clearInterval(timer);supabase.removeChannel(channel);},{once:true});
}
