import {vehicles,business} from './data.js';
import {vehiclePath,vehicleName,orderedImages,categories,buildInterestMessage,whatsappUrl,vehicleSEO} from './vehicle-model.js';
import {vehicleView,interestDialog} from './vehicle-view.js';
import './vehicle-details.css';

export function setupVehicleRequests(){
 document.body.insertAdjacentHTML('beforeend',interestDialog());
 const dialog=document.querySelector('#vehicle-request'),form=dialog.querySelector('form');let selected;
 const values=()=>({name:form.elements.customerName.value,topics:[...form.querySelectorAll('[name=topics]:checked')].map(i=>i.value),question:form.elements.question.value});
 const message=()=>buildInterestMessage(selected,values(),location.origin);
 const update=()=>{if(!selected)return;form.querySelector('pre').textContent=message();};
 dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
 form.addEventListener('input',update);
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-vehicle-request],[data-vehicle-consult]');if(!button)return;
  selected=vehicles.find(v=>v.id===(button.dataset.vehicleRequest||button.dataset.vehicleConsult));if(!selected)return;
  if(button.hasAttribute('data-vehicle-consult')){
   const url=whatsappUrl(business.whatsapp,buildInterestMessage(selected,{topics:['Disponibilidade do veículo']},location.origin));
   if(url){window.open(url,'_blank','noopener,noreferrer');return;}
  }
  form.reset();dialog.querySelector('.requested-vehicle').textContent=`${vehicleName(selected)} · ${selected.year}`;
  const configured=Boolean(whatsappUrl(business.whatsapp,''));
  form.querySelector('[type=submit]').disabled=!configured;
  form.querySelector('.whatsapp-pending').textContent=configured?'':'O WhatsApp oficial ainda não foi configurado. Nenhuma mensagem será enviada.';
  update();dialog.showModal();
 });
 form.addEventListener('submit',e=>{e.preventDefault();if(!selected)return;const url=whatsappUrl(business.whatsapp,message());if(url)window.open(url,'_blank','noopener,noreferrer');});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
}

export function mountVehiclePage(){
 let slug;try{slug=decodeURIComponent(location.pathname.replace(/\/$/,'').split('/').at(-1));}catch{slug='';}
 const vehicle=vehicles.find(v=>v.slug===slug);
 const main=document.querySelector('main');
 document.querySelectorAll('header a[href^="#"],footer a[href^="#"]').forEach(a=>a.setAttribute('href',`/${a.getAttribute('href')}`));
 document.querySelectorAll('header nav a').forEach(a=>{const active=a.getAttribute('href')==='/#estoque';a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(!vehicle){main.innerHTML='<div class="container vehicle-not-found"><h1>Veículo não encontrado</h1><p>Este endereço não corresponde a um veículo disponível no catálogo.</p><a class="button" href="/#estoque">Voltar ao estoque</a></div>';document.title='Veículo não encontrado | Motta Multimarcas';for(const selector of ['link[rel=canonical]','#vehicle-schema','meta[property^="og:"]'])document.querySelectorAll(selector).forEach(n=>n.remove());const meta=document.querySelector('meta[name=robots]')||document.head.appendChild(document.createElement('meta'));meta.name='robots';meta.content='noindex,follow';return;}
 main.innerHTML=vehicleView(vehicle,vehicles);
 const seo=vehicleSEO(vehicle,business.siteUrl);
 document.title=seo.title;document.querySelector('meta[name=description]').content=seo.description;
 if(vehicle.status==='demonstration'&&!document.querySelector('meta[name=robots]')){const meta=document.createElement('meta');meta.name='robots';meta.content='noindex,follow';document.head.append(meta);}
 for(const [property,value] of Object.entries({'og:title':seo.title,'og:description':seo.description,'og:url':seo.url,'og:image':seo.image,'og:type':'website'})){
  let meta=document.querySelector(`meta[property="${property}"]`);if(!meta){meta=document.createElement('meta');meta.setAttribute('property',property);document.head.append(meta);}meta.content=value;
 }
 if(!document.querySelector('link[rel=canonical]')){const link=document.createElement('link');link.rel='canonical';link.href=seo.url;document.head.append(link);}
 if(!document.querySelector('#vehicle-schema')){const script=document.createElement('script');script.id='vehicle-schema';script.type='application/ld+json';script.textContent=JSON.stringify(seo.structured);document.head.append(script);}
 setupGallery(vehicle);
}

function setupGallery(vehicle){
 const images=orderedImages(vehicle);let category='all',current=0,suppressOpenUntil=0;
 const visible=()=>images.filter(i=>category==='all'||i.category===category);
 const stage=document.querySelector('.gallery-stage'),open=stage.querySelector('.gallery-open'),image=stage.querySelector('img'),empty=stage.querySelector('.gallery-empty');
 const lightbox=document.createElement('dialog');lightbox.className='vehicle-lightbox';lightbox.setAttribute('aria-label','Fotografia ampliada do veículo');
 lightbox.innerHTML='<button class="close" aria-label="Fechar fotografia ampliada">×</button><div class="lightbox-stage"><button class="lightbox-prev" aria-label="Fotografia anterior ampliada">‹</button><img alt="" width="1200" height="800"><button class="lightbox-next" aria-label="Próxima fotografia ampliada">›</button></div><p class="lightbox-count" aria-live="polite"></p>';
 document.body.append(lightbox);
 const large=lightbox.querySelector('img');
 function render(){
  const list=visible();current=Math.max(0,Math.min(current,list.length-1));const selected=list[current];
  open.hidden=!selected;empty.hidden=Boolean(selected);
  empty.textContent=`Ainda não há fotografias cadastradas ${category==='all'?'para este veículo':`na categoria ${categories[category]}`}.`;
  if(selected&&image){image.src=selected.url;image.alt=selected.alt;large.src=selected.url;large.alt=selected.alt;image.animate?.([{opacity:.65},{opacity:1}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:200});}
  document.querySelector('.gallery-count').textContent=list.length?`${current+1} / ${list.length}`:'0 / 0';
  lightbox.querySelector('.lightbox-count').textContent=selected?`${current+1} / ${list.length} — ${selected.alt}`:'';
  document.querySelectorAll('.gallery-prev,.gallery-next,.lightbox-prev,.lightbox-next').forEach(b=>b.disabled=list.length<2);
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  document.querySelectorAll('[data-image]').forEach(b=>{const img=images.find(i=>i.id===b.dataset.image);b.hidden=!(category==='all'||img.category===category);b.setAttribute('aria-pressed',String(selected?.id===img.id));});
 }
 const move=delta=>{const count=visible().length;if(count>1){current=(current+delta+count)%count;render();}};
 document.querySelector('.gallery-prev').addEventListener('click',()=>move(-1));document.querySelector('.gallery-next').addEventListener('click',()=>move(1));
 lightbox.querySelector('.lightbox-prev').addEventListener('click',()=>move(-1));lightbox.querySelector('.lightbox-next').addEventListener('click',()=>move(1));
 document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;current=0;render();}));
 document.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>{current=visible().findIndex(i=>i.id===b.dataset.image);render();}));
 open.addEventListener('click',()=>{if(visible().length&&Date.now()>suppressOpenUntil)lightbox.showModal();});
 lightbox.querySelector('.close').addEventListener('click',()=>lightbox.close());
 lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close();});
 document.addEventListener('keydown',e=>{if((lightbox.open||e.target.closest('.gallery'))&&!e.target.matches('input,textarea,select')){if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}});
 for(const area of [stage,lightbox.querySelector('.lightbox-stage')]){
  let start;area.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')start={x:e.clientX,y:e.clientY};});
  area.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){suppressOpenUntil=Date.now()+400;move(dx<0?1:-1);}});
  area.addEventListener('pointercancel',()=>{start=null;});
 }
 render();
}
