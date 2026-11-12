import {supabase,databaseError} from '../lib/supabase.js';
import {can} from './permissions.js';
import {e,field,modal,toast,empty,confirmAction} from './ui.js';
import './training.css';

export function driveFileId(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='drive.google.com'||url.username||url.password)return '';
  const id=url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1]||(['/', '/open', '/uc'].includes(url.pathname)?url.searchParams.get('id'):'');
  return /^[a-zA-Z0-9_-]{10,200}$/.test(id||'')?id:'';
 }catch{return '';}
}
export async function trainingView(container,ctx){
 const manage=can(ctx.profile,'settings');
 const {data:rows,error}=await supabase.from('motta_training_videos').select('id,title,description,drive_file_id,sort_order,created_at').order('sort_order').order('created_at').order('id');
 if(error)throw databaseError(error);
 container.innerHTML=`<div class="view-heading"><div><p class="overline">APRENDA NO SEU TEMPO</p><h2>Vídeos de uso da plataforma</h2><p class="muted">Escolha uma aula para assistir aqui no painel, sempre que precisar.</p></div>${manage?'<button class="abutton primary" data-add-training>Adicionar vídeo</button>':''}</div><section class="panel training-player" hidden aria-labelledby="training-now"><div class="panel-heading"><h3 id="training-now"></h3><button class="abutton" data-close-training>Fechar vídeo</button></div><div class="training-frame"></div><p class="muted" data-training-description></p><p class="muted">Se o Drive solicitar acesso, entre com a conta autorizada pelo responsável pelo vídeo.</p><a class="abutton" data-open-drive target="_blank" rel="noopener noreferrer">Abrir no Google Drive</a></section><div class="training-grid">${rows.length?rows.map(row=>`<article class="panel training-card"><div class="training-cover" aria-hidden="true">▶</div><h3>${e(row.title)}</h3><p class="muted">${e(row.description)}</p><div class="training-actions"><button class="abutton primary" data-play-training="${row.id}" aria-label="Assistir: ${e(row.title)}">Assistir vídeo</button>${manage?`<button class="abutton" data-edit-training="${row.id}" aria-label="Editar: ${e(row.title)}">Editar</button><button class="abutton" data-remove-training="${row.id}" aria-label="Remover: ${e(row.title)}">Remover</button>`:''}</div></article>`).join(''):empty('As aulas estarão disponíveis aqui assim que os vídeos forem adicionados.')}</div>${manage?'<p class="muted">Suba o vídeo no Google Drive, configure o compartilhamento e copie o link do arquivo. Depois clique em “Adicionar vídeo”. Links de pastas não reproduzem vídeos.</p>':''}`;
 const player=container.querySelector('.training-player');
 container.querySelector('[data-close-training]').onclick=()=>{player.querySelector('.training-frame').replaceChildren();player.hidden=true;};
 container.querySelectorAll('[data-play-training]').forEach(button=>button.onclick=()=>{
  const row=rows.find(r=>r.id===button.dataset.playTraining);if(!/^[a-zA-Z0-9_-]{10,200}$/.test(row.drive_file_id))return;
  player.querySelector('h3').textContent=row.title;player.querySelector('[data-training-description]').textContent=row.description;
  const frame=document.createElement('iframe');frame.title=row.title;frame.src=`https://drive.google.com/file/d/${row.drive_file_id}/preview`;frame.allow='fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  player.querySelector('.training-frame').replaceChildren(frame);player.querySelector('[data-open-drive]').href=`https://drive.google.com/file/d/${row.drive_file_id}/view`;
  player.hidden=false;player.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 });
 function edit(row={}){
  const dialog=modal(row.id?'Editar vídeo':'Adicionar vídeo',`<p class="dialog-copy">Cole o link de um vídeo do Google Drive. Compartilhe o arquivo com o cliente ou escolha “Qualquer pessoa com o link” como leitor.</p><div class="form-grid">${field('Título da aula','title',row.title)}${field('Link do vídeo no Google Drive','drive_url',row.drive_file_id?`https://drive.google.com/file/d/${row.drive_file_id}/view`:'','url')}${field('Descrição (opcional)','description',row.description,'textarea')}${field('Ordem de exibição','sort_order',row.sort_order??rows.length,'number')}</div>`,{onSubmit:async(values,_,d)=>{
   const drive_file_id=driveFileId(values.drive_url);if(!drive_file_id)throw Error('Use um link de arquivo de vídeo do Google Drive, não um link de pasta.');
   const payload={title:values.title.trim(),description:values.description.trim(),sort_order:Number(values.sort_order),drive_file_id};
   let query=supabase.from('motta_training_videos');query=row.id?query.update(payload).eq('id',row.id):query.insert(payload);
   const {error}=await query;if(error)throw databaseError(error);d.close();toast('Vídeo salvo.');await ctx.refresh();
  }});
  for(const name of ['title','drive_url','sort_order'])dialog.querySelector(`[name=${name}]`).required=true;
  dialog.querySelector('[name=title]').maxLength=120;dialog.querySelector('[name=description]').maxLength=2000;dialog.querySelector('[name=sort_order]').max=10000;
 }
 if(manage){
  container.querySelector('[data-add-training]').onclick=()=>edit();
  container.querySelectorAll('[data-edit-training]').forEach(b=>b.onclick=()=>edit(rows.find(r=>r.id===b.dataset.editTraining)));
  container.querySelectorAll('[data-remove-training]').forEach(b=>b.onclick=()=>{const row=rows.find(r=>r.id===b.dataset.removeTraining);confirmAction('Remover aula',`Remover “${row.title}” da plataforma? O arquivo no Google Drive será mantido.`,async()=>{const {error}=await supabase.from('motta_training_videos').delete().eq('id',row.id);if(error)throw databaseError(error);toast('Aula removida.');await ctx.refresh();});});
 }
}
