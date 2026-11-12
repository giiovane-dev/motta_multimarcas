import {supabase,command,list,uploadFile} from '../lib/supabase.js';
import {e,field,formValues,modal,money,date,badge,toast,empty,confirmAction,today,labels} from './ui.js';
import {icon} from './icons.js';
import {can} from './permissions.js';

const options={operational_status:{received:'Recebido',preparing:'Em preparação',ready:'Pronto para venda',pending:'Com pendências'}};
const features=['Ar-condicionado','Direção elétrica','Vidros elétricos','Travas elétricas','Central multimídia','Câmera de ré','Sensor de estacionamento','Airbags','ABS','Bancos em couro','Controle de estabilidade'];
export const vehicleLabel=v=>`${v.brand} ${v.model} · ${v.internal_code}`;
export function coverURL(v){const imgs=(v.images||[]).filter(i=>!i.deleted_at).sort((a,b)=>Number(b.is_cover)-Number(a.is_cover)||a.sort_order-b.sort_order);return imgs[0]?supabase.storage.from('vehicle-public-images').getPublicUrl(imgs[0].storage_path).data.publicUrl:'';}
export function vehicleRow(v,profile){const cover=coverURL(v);return `<tr><td><div class="vehicle-cell">${cover?`<img class="car-thumbnail" src="${e(cover)}" alt="${e(v.brand)} ${e(v.model)}">`:`<span class="car-placeholder">${icon('car')}</span>`}<div><strong>${e(v.brand)} ${e(v.model)}</strong><span>${e(v.version)} · ${e(v.internal_code)}</span></div></div></td><td>${e(v.model_year)}</td><td>${Number(v.mileage).toLocaleString('pt-BR')} km</td><td><strong>${money(v.asking_price)}</strong></td><td>${badge(v.commercial_status)}<small>${v.archived_at?'Arquivado':labels[v.publication_status]||v.publication_status}</small></td><td>${date(v.entry_date)}</td><td><div class="row-actions"><button class="icon-button" data-vehicle="${v.id}" data-op="view" aria-label="Visualizar ${e(v.model)}">${icon('eye')}</button>${can(profile,'vehicle_write')&&v.commercial_status!=='sold'?`<button class="icon-button" data-vehicle="${v.id}" data-op="edit" aria-label="Editar ${e(v.model)}">${icon('edit')}</button>`:''}<button class="icon-button" data-vehicle="${v.id}" data-op="more" aria-label="Mais ações para ${e(v.model)}">${icon('chevron')}</button></div></td></tr>`;}
export function vehicleTable(rows,profile){return rows.length?`<div class="table-scroll"><table class="atable"><thead><tr><th>Veículo</th><th>Ano</th><th>Km</th><th>Preço</th><th>Status</th><th>Data de entrada</th><th>Ações</th></tr></thead><tbody>${rows.map(v=>vehicleRow(v,profile)).join('')}</tbody></table></div>`:empty('Seu estoque ainda não tem veículos. Cadastre o primeiro veículo para começar.');}

export async function vehicleActions(id,op,ctx){
 const {data:v,error}=await supabase.from('motta_vehicles').select('*').eq('id',id).single();if(error)throw error;
 if(op==='duplicate'){if(!can(ctx.profile,'vehicle_write'))throw Error('Seu perfil não pode duplicar cadastros.');return confirmAction('Duplicar cadastro',`Criar um novo rascunho de ${v.brand} ${v.model}? Fotografias e dados financeiros não serão reutilizados.`,async()=>{await command('vehicle_duplicate',{id});toast('Novo rascunho criado.');await ctx.refresh();});}
 if(op==='edit'){if(!can(ctx.profile,'vehicle_write'))throw Error('Seu perfil pode gerenciar preparação e fotos, mas não alterar o cadastro comercial.');return await vehicleWizard(ctx,v);}
 if(op==='view'){
 let finance='';
 if(can(ctx.profile,'finance')){
 const [cost,expenses,sale]=await Promise.all([supabase.from('motta_vehicle_costs').select('acquisition_price').eq('vehicle_id',id).maybeSingle(),supabase.from('motta_expenses').select('amount,category').eq('vehicle_id',id),supabase.from('motta_sales').select('sale_price').eq('vehicle_id',id).maybeSingle()]);
 if(cost.error||expenses.error||sale.error)throw cost.error||expenses.error||sale.error;
 const total=(expenses.data||[]).reduce((sum,r)=>sum+Number(r.amount),0),preparation=(expenses.data||[]).filter(r=>r.category==='preparation').reduce((sum,r)=>sum+Number(r.amount),0);
 finance='<section class="vehicle-finance"><h3>Custos e margem estimada</h3><div class="details-grid"><div><small>Aquisição cadastrada</small><p>'+ (cost.data?money(cost.data.acquisition_price):'Não cadastrada')+'</p></div><div><small>Preparação</small><p>'+money(preparation)+'</p></div><div><small>Despesas totais</small><p>'+money(total)+'</p></div><div><small>Margem estimada '+(sale.data?'da venda':'do preço anunciado')+'</small><p>'+(cost.data?money(Number(sale.data?.sale_price||v.asking_price)-Number(cost.data.acquisition_price)-total):'Cadastre o custo de aquisição')+'</p></div></div><p class="muted">Estimativa com os custos cadastrados. Não representa lucro líquido nem confirma recebimento.</p></section>';
 }
 return modal(vehicleLabel(v),`<div class="details-grid">${Object.entries({Código:v.internal_code,Marca:v.brand,Modelo:v.model,Versão:v.version,Ano:v.model_year,Quilometragem:`${v.mileage} km`,Preço:money(v.asking_price),'Situação operacional':v.operational_status,'Situação comercial':v.commercial_status,'Publicação':v.publication_status,'Entrada':date(v.entry_date),'Descrição':v.description,'Observações internas':v.internal_notes}).map(([k,value])=>`<div><small>${e(k)}</small><p>${e(value||'—')}</p></div>`).join('')}</div>${finance}${v.publication_status==='published'&&!v.archived_at?`<a class="abutton" href="/veiculos/${e(v.slug)}" target="_blank" rel="noopener">${icon('external')}Abrir página pública</a>`:''}`);
 }
 const menu=modal(`Gerenciar ${v.brand} ${v.model}`,`<div class="action-menu">${v.commercial_status!=='sold'?'<button type="button" data-do="edit">Editar cadastro e fotografias</button>':''}<button type="button" data-do="duplicate">Duplicar como rascunho sem fotos</button>${can(ctx.profile,'documents')?'<button type="button" data-do="documents">Gerenciar documentação</button>':''}<button type="button" data-do="tasks">Checklist de preparação</button>${can(ctx.profile,'publishing')&&v.commercial_status!=='sold'?`<button type="button" data-do="${v.publication_status==='published'?'unpublish':'publish'}">${v.publication_status==='published'?'Despublicar':'Publicar na vitrine'}</button><button type="button" data-do="reserve">Reservar veículo</button>`:''}${can(ctx.profile,'finance')&&v.commercial_status!=='sold'?'<button type="button" data-do="sale">Registrar venda</button>':''}${can(ctx.profile,'publishing')?`<button type="button" data-do="${v.archived_at?'restore':'archive'}">${v.archived_at?'Restaurar cadastro arquivado':'Arquivar e retirar da vitrine'}</button>`:''}<p class="muted">Históricos são preservados. Não há exclusão definitiva de cadastros por este painel.</p></div>`);
 if(!can(ctx.profile,'vehicle_write')){menu.querySelector('[data-do=edit]')?.remove();menu.querySelector('[data-do=duplicate]')?.remove();}
 if(can(ctx.profile,'images'))menu.querySelector('.action-menu').insertAdjacentHTML('afterbegin','<button type="button" data-do="images">Gerenciar fotografias</button>');
 if(can(ctx.profile,'tasks'))menu.querySelector('.action-menu').insertAdjacentHTML('afterbegin','<button type="button" data-do="preparation">Alterar situação operacional</button>');
 menu.querySelectorAll('[data-do]').forEach(b=>b.onclick=async()=>{const action=b.dataset.do;menu.close();try{
 if(action==='images'){const d=modal('Fotografias · '+v.brand+' '+v.model,'<div class="image-manager"></div>',{wide:true});return await imageManager(d.querySelector('.image-manager'),v,ctx);}
 if(action==='preparation'){return modal('Situação operacional',field('Situação','operational_status',v.operational_status,'select',options.operational_status),{onSubmit:async(values,_,d)=>{await command('vehicle_preparation',{id:v.id,...values});d.close();toast('Situação operacional atualizada.');await ctx.refresh();}});}
 if(action==='edit')return await vehicleWizard(ctx,v);
 if(action==='documents'||action==='tasks'){ctx.navigate(action,{vehicleId:id});return;}
 if(action==='sale')return ctx.sale(v.id);
 if(['archive','unpublish','reserve'].includes(action))return confirmAction('Confirmar alteração',`Deseja ${action==='archive'?'arquivar':action==='reserve'?'reservar':'despublicar'} ${v.brand} ${v.model}? O histórico será preservado.`,async()=>{await command(`vehicle_${action}`,{id});toast('Veículo atualizado.');await ctx.refresh();});
 await command(`vehicle_${action}`,{id});toast(action==='duplicate'?'Rascunho duplicado, sem reutilizar fotografias.':'Veículo atualizado.');await ctx.refresh();
 }catch(err){toast(err.message,true);}});
}

export async function vehicleWizard(ctx,existing){
 let v={internal_code:`MOT-${crypto.randomUUID().slice(0,8).toUpperCase()}`,brand:'',model:'',version:'',manufacture_year:new Date().getFullYear(),model_year:new Date().getFullYear(),mileage:0,asking_price:'',fuel_type:'',transmission:'',engine:'',color:'',doors:4,entry_date:today(),origin:'',supplier:'',internal_notes:'',description:'',features:[],responsible_id:ctx.profile.id,operational_status:'received',...existing};
 delete v.acquisition_price;
 const {data:profiles}=await supabase.from('motta_profiles').select('id,full_name').eq('active',true);
 let step=0;const steps=['Informações básicas','Comercial','Características','Descrição','Fotografias','Publicação'];
 const d=modal(existing?'Editar veículo':'Adicionar novo veículo','<div id="vehicle-wizard"></div>',{wide:true});
 const form=d.querySelector('form');form.onsubmit=ev=>ev.preventDefault();
 const body=d.querySelector('#vehicle-wizard');d.querySelector('.dialog-footer').remove();
 async function persist(){const saved=await command('vehicle_save',v);v={...v,...saved};toast('Rascunho salvo no banco.');return saved;}
 function capture(){
  const values=formValues(form);delete values.photoFiles;v={...v,...values};
  for(const key of ['manufacture_year','model_year','mileage','doors','asking_price','acquisition_price'])if(key in v&&v[key]!=='')v[key]=Number(v[key]);
  if(!v.slug||!existing)v.slug=`${v.brand}-${v.model}-${v.model_year}-${v.internal_code}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(step===2)v.features=[...body.querySelectorAll('[data-feature]:checked')].map(i=>i.value).concat((values.extra_features||'').split('\n').map(x=>x.trim()).filter(Boolean));
  if(v.acquisition_price==='')delete v.acquisition_price;
  delete v.extra_features;
 }
 async function draw(){
 body.innerHTML=`<ol class="wizard-steps">${steps.map((s,i)=>`<li class="${i===step?'current':i<step?'complete':''}"><span>${i+1}</span>${s}</li>`).join('')}</ol><p class="wizard-status">${v.id?'Rascunho persistido · '+e(v.internal_code):'Novo cadastro · Salve o rascunho antes de enviar fotografias.'}</p><section class="wizard-body"></section><p class="wizard-error" role="alert"></p><div class="wizard-footer"><button type="button" class="abutton" data-back ${step===0?'disabled':''}>Voltar</button><span></span>${step>=1?'<button type="button" class="abutton" data-save>Salvar rascunho</button>':''}${step<5?'<button type="button" class="abutton primary" data-next>Continuar →</button>':can(ctx.profile,'publishing')?'<button type="button" class="abutton primary" data-publish>Publicar na vitrine</button>':''}</div>`;
 const section=body.querySelector('.wizard-body');
 if(step===0)section.innerHTML=`<h3>Informações básicas</h3><div class="form-grid">${field('Código interno','internal_code',v.internal_code)}${field('Marca','brand',v.brand)}${field('Modelo','model',v.model)}${field('Versão','version',v.version)}${field('Ano de fabricação','manufacture_year',v.manufacture_year,'number')}${field('Ano do modelo','model_year',v.model_year,'number')}${field('Quilometragem','mileage',v.mileage,'number')}${field('Combustível','fuel_type',v.fuel_type,'select',{'':'Selecione',Flex:'Flex',Gasolina:'Gasolina',Diesel:'Diesel',Elétrico:'Elétrico',Híbrido:'Híbrido',Etanol:'Etanol'})}${field('Câmbio','transmission',v.transmission,'select',{'':'Selecione',Manual:'Manual',Automático:'Automático',CVT:'CVT',Automatizado:'Automatizado'})}${field('Motorização','engine',v.engine)}${field('Cor','color',v.color)}${field('Portas','doors',v.doors,'number')}</div>`;
 if(step===1)section.innerHTML=`<h3>Informações comerciais</h3><div class="form-grid">${field('Preço anunciado (R$)','asking_price',v.asking_price,'money')}${field('Origem','origin',v.origin)}${field('Fornecedor / proprietário anterior · privado','supplier',v.supplier)}${field('Responsável','responsible_id',v.responsible_id,'select',Object.fromEntries((profiles||[]).map(p=>[p.id,p.full_name])))}${field('Situação operacional','operational_status',v.operational_status,'select',options.operational_status)}${v.id?field('Endereço da página (slug)','slug',v.slug):''}${field('Observações internas · privadas','internal_notes',v.internal_notes,'textarea')}</div>`;
 if(step===2)section.innerHTML=`<h3>Opcionais confirmados</h3><p class="muted">Selecione somente os equipamentos verificados neste veículo.</p><div class="feature-grid">${features.map(f=>`<label><input type="checkbox" data-feature value="${e(f)}" ${v.features.includes(f)?'checked':''}>${e(f)}</label>`).join('')}</div>${field('Outros opcionais (um por linha)','extra_features',v.features.filter(f=>!features.includes(f)).join('\n'),'textarea')}`;
 if(step===3){section.innerHTML=`<h3>Descrição comercial</h3>${field('Descrição pública','description',v.description,'textarea')}<details class="description-preview"><summary>Pré-visualizar descrição</summary><div></div></details>`;const input=section.querySelector('textarea');const preview=section.querySelector('.description-preview div');preview.textContent=input.value;input.oninput=()=>preview.textContent=input.value;}
 if(step===4){section.innerHTML='<h3>Fotografias do veículo</h3><div class="image-manager"></div>';if(!v.id){section.querySelector('.image-manager').innerHTML='<p class="muted">Salve o rascunho para associar as fotos ao ID deste veículo.</p>';}else await imageManager(section.querySelector('.image-manager'),v,ctx);}
 if(step===5)section.innerHTML=`<h3>Revisar e publicar</h3><div class="publish-review"><p><strong>${e(v.brand)} ${e(v.model)} ${e(v.version)}</strong></p><p>${e(v.model_year)} · ${Number(v.mileage).toLocaleString('pt-BR')} km · ${money(v.asking_price)}</p><p>${badge(v.operational_status)} ${badge(v.publication_status||'draft')}</p><p>Para publicar, o veículo precisa estar pronto para venda, com os dados obrigatórios preenchidos e uma fotografia de capa cadastrada. O banco valida essas condições antes de disponibilizar o anúncio.</p>${can(ctx.profile,'publishing')?'':'<p>Seu perfil pode salvar o cadastro. A publicação deve ser feita por um gerente ou administrador.</p>'}</div>`;
 if(step===0)for(const name of ['internal_code','brand','model','manufacture_year','model_year','mileage'])form.elements[name].required=true;
 if(step===1)for(const name of ['asking_price'])form.elements[name].required=true;
 if(step===1)form.elements.asking_price.min='0.01';
 const busy=async fn=>{body.querySelectorAll('button').forEach(b=>b.disabled=true);try{capture();await fn();}catch(err){body.querySelector('.wizard-error').textContent=err.message;body.querySelectorAll('button').forEach(b=>b.disabled=false);}};
 body.querySelector('[data-back]').onclick=()=>{capture();step--;draw();};
 body.querySelector('[data-next]')?.addEventListener('click',()=>{if(!form.reportValidity())return;busy(async()=>{if(step===1)await persist();step++;await draw();});});
 body.querySelector('[data-save]')?.addEventListener('click',()=>{if(!form.reportValidity())return;busy(async()=>{await persist();await draw();ctx.refresh();});});
 body.querySelector('[data-publish]')?.addEventListener('click',()=>busy(async()=>{await persist();await command('vehicle_publish',{id:v.id});d.close();toast('Veículo publicado. A vitrine será atualizada automaticamente.');await ctx.refresh();}));
 }
 await draw();
}

export async function validateFile(file,isDocument=false){
 if(file.size>(isDocument?20:10)*1024*1024)throw Error(`Arquivo excede o limite de ${isDocument?'20':'10'} MB.`);
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());const str=String.fromCharCode(...bytes);
 const type=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&str.slice(1,4)==='PNG'?'image/png':str.startsWith('RIFF')&&str.slice(8,12)==='WEBP'?'image/webp':str.startsWith('%PDF-')?'application/pdf':'';
 if(!type||type!==file.type||(!isDocument&&type==='application/pdf'))throw Error('Conteúdo inválido. Envie JPEG, PNG, WebP'+(isDocument?' ou PDF.':'.'));
 if(type==='application/pdf')return file;
 const bitmap=await createImageBitmap(file);if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>60000000){bitmap.close();throw Error('Dimensões da imagem inválidas ou excessivas.');}
 const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));if(!blob)throw Error('Não foi possível processar a imagem.');return blob;
}

export async function imageManager(container,v,ctx){
 container.setAttribute('aria-busy','true');
 const {rows}=await list('vehicle_images',{vehicleId:v.id,size:200});const images=rows.filter(i=>!i.deleted_at).sort((a,b)=>Number(b.is_cover)-Number(a.is_cover)||a.sort_order-b.sort_order);
 const editable=can(ctx.profile,'images');
 container.innerHTML=`${editable?'<label class="upload-zone">'+icon('upload')+'<strong>Arraste fotografias ou clique para selecionar</strong><span>JPEG, PNG ou WebP · até 10 MB por arquivo · otimização para WebP</span><input type="file" name="photoFiles" accept="image/jpeg,image/png,image/webp" multiple></label><progress max="100" value="0" hidden></progress>':''}<p class="upload-error" role="alert"></p><div class="photo-grid">${images.map((i,index)=>`<article class="photo-item" data-photo="${i.id}" ${editable?'draggable="true"':''}><img src="${e(supabase.storage.from('vehicle-public-images').getPublicUrl(i.storage_path).data.publicUrl)}" alt="${e(i.alt_text)}"><span>${i.is_cover?'Capa':`Foto ${index+1}`}</span>${editable?`${field('Categoria','category-'+i.id,i.category,'select',{exterior:'Exterior',interior:'Interior',details:'Detalhes'})}${field('Texto alternativo','alt-'+i.id,i.alt_text)}<div class="photo-actions"><button type="button" data-image-op="cover" data-id="${i.id}">Definir capa</button><button type="button" data-image-op="save" data-id="${i.id}">Salvar texto</button><button type="button" data-image-op="up" data-id="${i.id}" aria-label="Mover foto para cima">↑</button><button type="button" data-image-op="down" data-id="${i.id}" aria-label="Mover foto para baixo">↓</button><button type="button" data-image-op="delete" data-id="${i.id}" aria-label="Excluir foto">${icon('trash')}</button><label class="replace-photo">Substituir<input type="file" accept="image/jpeg,image/png,image/webp" data-replace="${i.id}"></label></div>`:''}</article>`).join('')}</div>${images.length?'':empty('Nenhuma fotografia cadastrada.')}`;
 if(can(ctx.profile,'settings')&&rows.some(i=>i.deleted_at)){
 const deleted=document.createElement('details');deleted.className='removed-files';deleted.innerHTML=`<summary>Fotografias removidas · recuperar</summary>${rows.filter(i=>i.deleted_at).map(i=>`<p>${e(i.alt_text)} <button type="button" class="abutton" data-recover-image="${i.id}">Recuperar</button></p>`).join('')}`;container.append(deleted);
 deleted.querySelectorAll('[data-recover-image]').forEach(b=>b.onclick=async()=>{try{await command('image_restore',{id:b.dataset.recoverImage,vehicle_id:v.id});await imageManager(container,v,ctx);toast('Fotografia recuperada. Revise a capa antes de publicar.');}catch(err){toast(err.message,true);}});
 }
 if(!editable){container.setAttribute('aria-busy','false');return;}
 async function upload(files,replacement){if(container.getAttribute('aria-busy')==='true')return;container.setAttribute('aria-busy','true');const progress=container.querySelector('progress');progress.hidden=false;progress.value=0;container.querySelector('input[type=file]').disabled=true;
 try{for(const [idx,file] of [...files].entries()){
 const blob=await validateFile(file);const path=await uploadFile(blob,'image',{vehicleId:v.id});
 const old=images.find(i=>i.id===replacement);
 await command('image_save',{vehicle_id:v.id,storage_path:path,category:old?.category||'exterior',alt_text:old?.alt_text||`${v.brand} ${v.model} · ${file.name}`,sort_order:old?.sort_order??images.length+idx,is_cover:old?.is_cover||(!images.length&&idx===0)});
 if(old)await command('image_delete',{id:old.id,vehicle_id:v.id});progress.value=Math.round((idx+1)/files.length*100);
 }toast('Fotografias salvas.');await imageManager(container,v,ctx);
 }catch(err){container.querySelector('.upload-error').textContent=err.message;container.querySelector('input[type=file]').disabled=false;}finally{container.setAttribute('aria-busy','false');}}
 container.querySelector('input[name=photoFiles]').onchange=ev=>upload(ev.target.files);
 const zone=container.querySelector('.upload-zone');zone.ondragover=ev=>{ev.preventDefault();zone.classList.add('dragging');};zone.ondragleave=()=>zone.classList.remove('dragging');zone.ondrop=ev=>{ev.preventDefault();zone.classList.remove('dragging');upload(ev.dataTransfer.files);};
 container.querySelectorAll('[data-replace]').forEach(input=>input.onchange=ev=>upload(ev.target.files,input.dataset.replace));
 async function reorder(from,to){if(to<0||to>=images.length)return;const reordered=images.slice();const [item]=reordered.splice(from,1);reordered.splice(to,0,item);for(const [idx,img] of reordered.entries())await command('image_save',{...img,sort_order:idx});await imageManager(container,v,ctx);}
 let dragged;container.querySelectorAll('[data-photo]').forEach(item=>{item.ondragstart=()=>dragged=item.dataset.photo;item.ondragover=ev=>ev.preventDefault();item.ondrop=async ev=>{ev.preventDefault();try{await reorder(images.findIndex(i=>i.id===dragged),images.findIndex(i=>i.id===item.dataset.photo));}catch(err){toast(err.message,true);}};});
 container.querySelectorAll('[data-image-op]').forEach(b=>b.onclick=async()=>{container.setAttribute('aria-busy','true');b.disabled=true;try{const i=images.find(i=>i.id===b.dataset.id),op=b.dataset.imageOp;
 if(op==='delete'){if(!window.confirm('Remover esta fotografia da galeria? O arquivo será preservado para recuperação administrativa.'))return;await command('image_delete',{id:i.id,vehicle_id:v.id});}
 else if(op==='up'||op==='down'){await reorder(images.indexOf(i),images.indexOf(i)+(op==='up'?-1:1));return;}
 else await command('image_save',{...i,category:container.querySelector(`[name="category-${i.id}"]`).value,alt_text:container.querySelector(`[name="alt-${i.id}"]`).value,is_cover:op==='cover'?true:i.is_cover});
 await imageManager(container,v,ctx);
 }catch(err){toast(err.message,true);}finally{b.disabled=false;container.setAttribute('aria-busy','false');}});
 container.setAttribute('aria-busy','false');
}
