import {supabase} from '../lib/supabase.js';
import {e,field as baseField,modal,toast,confirmAction} from './ui.js';
import {institutionVisual,bindLogoFallback,safeInstitutionLogo} from '../financing.js';
import './financing.css';
const field=(...args)=>baseField(...args).replace(/for="f-/g,'for="f-bank-').replace(/id="f-/g,'id="f-bank-');

export async function financingSettings(container,ctx){
 if(ctx.profile.role!=='admin'||!ctx.profile.active)return;
 const panel=document.createElement('section');panel.className='panel settings-panel financing-settings';panel.id='financing-settings';container.append(panel);
 async function load(){
  panel.setAttribute('aria-busy','true');
  try{
   const {data,error}=await supabase.from('motta_financing_institutions').select('*').order('sort_order').order('name').order('id').limit(200);if(error)throw error;
   panel.innerHTML=`<div class="panel-heading"><h2>Instituições financeiras</h2><button class="abutton" type="button" data-bank-add>Adicionar instituição</button></div><p class="muted">Gerencie a seção abaixo do financiamento na homepage. A ordem menor aparece primeiro. Sem logotipo confirmado, exibimos o nome em texto.</p><p class="muted">Use apenas arquivos oficiais com autorização de uso. Preserve as cores e proporções da marca e não utilize marcas semelhantes como substitutas.</p><div class="financing-admin-list">${data.length?data.map(bank=>`<article class="financing-admin-row"><div class="financing-admin-visual">${institutionVisual(bank)}</div><div><strong>${e(bank.name)}</strong><small>Ordem ${bank.sort_order} · ${bank.enabled?'Visível na homepage':'Oculta da homepage'}</small></div><div class="financing-admin-actions"><button class="abutton" type="button" data-bank-edit="${bank.id}" aria-label="Editar ${e(bank.name)}">Editar</button><button class="abutton danger" type="button" data-bank-remove="${bank.id}" aria-label="Remover ${e(bank.name)}">Remover</button></div></article>`).join(''):'<p class="muted">Nenhuma instituição cadastrada. A seção pública fica oculta enquanto não houver instituições ativas.</p>'}</div>`;
   bindLogoFallback(panel);
   panel.querySelector('[data-bank-add]').onclick=()=>edit({},data);
   panel.querySelectorAll('[data-bank-edit]').forEach(button=>button.onclick=()=>edit(data.find(bank=>bank.id===button.dataset.bankEdit),data));
   panel.querySelectorAll('[data-bank-remove]').forEach(button=>button.onclick=()=>{
    const bank=data.find(row=>row.id===button.dataset.bankRemove);
    confirmAction('Remover instituição',`Remover ${e(bank.name)} da seção de financiamento? Você também pode desativar a exibição em Editar.`,async()=>{
     const {data:removed,error}=await supabase.from('motta_financing_institutions').delete().eq('id',bank.id).select('id');if(error)throw error;if(!removed.length)throw Error('Não foi possível remover. Atualize a página e confira seu acesso.');toast('Instituição removida.');await load();
    });
   });
  }catch{panel.innerHTML='<div class="panel-heading"><h2>Instituições financeiras</h2></div><p class="form-error" role="alert">Não foi possível carregar as instituições. Confira a conexão e tente novamente.</p><button class="abutton" type="button" data-bank-retry>Tentar novamente</button>';panel.querySelector('[data-bank-retry]').onclick=load;}
  finally{panel.setAttribute('aria-busy','false');}
 }
 function edit(bank,rows){
  const nextOrder=Math.min(10000,Math.max(0,...rows.map(row=>row.sort_order))+10);
  const dialog=modal(bank.id?'Editar instituição':'Adicionar instituição',`<div class="form-grid">${field('Nome da instituição','name',bank.name||'')}${field('Ordem de exibição','sort_order',bank.sort_order??nextOrder,'number')}${field('URL do logotipo oficial (HTTPS ou /img/)','logo_url',bank.logo_url||'')}${field('Identidade e autorização de uso deste logotipo confirmadas','logo_authorized',bank.logo_authorized??false,'checkbox')}${field('Exibir instituição na homepage','enabled',bank.enabled??true,'checkbox')}</div><p class="muted">Para usar apenas texto, deixe a URL vazia. Não use marcas parecidas como substitutas. Desative a exibição para ocultar sem remover o cadastro.</p>`,{onSubmit:async(values,_,d)=>{
   const name=values.name.trim(),logo_url=values.logo_url.trim(),sort_order=Number(values.sort_order);
   if(!name||name.length>80)throw Error('Informe um nome com até 80 caracteres.');
   if(!Number.isInteger(sort_order)||sort_order<0||sort_order>10000)throw Error('Informe uma ordem entre 0 e 10000.');
   if(logo_url&&!safeInstitutionLogo(logo_url))throw Error('Use uma URL HTTPS ou um arquivo válido em /img/.');
   if(logo_url&&!values.logo_authorized)throw Error('Confirme a identidade e a autorização de uso do logotipo, ou deixe a URL vazia.');
   const payload={name,logo_url,sort_order,logo_authorized:values.logo_authorized,enabled:values.enabled};
   const query=bank.id?supabase.from('motta_financing_institutions').update(payload).eq('id',bank.id):supabase.from('motta_financing_institutions').insert(payload);
   const {error}=await query.select('id').single();if(error)throw error;d.close();toast('Instituição salva. A homepage será atualizada automaticamente.');await load();
  }});
  dialog.querySelector('[name=name]').required=true;dialog.querySelector('[name=name]').maxLength=80;dialog.querySelector('[name=sort_order]').required=true;dialog.querySelector('[name=sort_order]').max=10000;dialog.querySelector('[name=logo_url]').maxLength=1500;
 }
 await load();
}
