import './experience.css';

const external = (value) => {
 try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
 catch { return ''; }
};
const el = (tag, className, text) => {
 const node = document.createElement(tag);
 if (className) node.className = className;
 if (text !== undefined) node.textContent = text;
 return node;
};
function link(text, href, className = '') {
 const a = el('a', className, text);
 a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
 return a;
}
function stars(rating) {
 const row = el('div', 'review-stars');
 row.setAttribute('aria-label', `${rating.toLocaleString('pt-BR')} de 5 estrelas`);
 const text = el('span', '', '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)));
 text.setAttribute('aria-hidden', 'true'); row.append(text);
 return row;
}

export function mountExperience({business, logo, icon}) {
 const sections = document.createElement('div');
 sections.className = 'community-sections';
 sections.innerHTML = `
 <section id="avaliacoes" class="container google-reviews" aria-labelledby="reviews-title">
  <div class="community-heading"><p class="section-kicker">AVALIAÇÕES DO GOOGLE</p><h2 id="reviews-title">A confiança de quem já <span>escolheu a Motta</span></h2><p>Conheça a experiência de clientes que avaliaram nossa loja no Google.</p></div>
  <div class="reviews-content" aria-busy="false"><div class="reviews-summary" hidden></div><div class="reviews-state" role="status"></div><div class="reviews-carousel" hidden><div class="reviews-track" tabindex="0" role="region" aria-label="Comentários de clientes no Google Maps"></div><div class="reviews-controls"><button class="review-prev" aria-label="Avaliações anteriores">${icon('arrow')}</button><span class="review-position" aria-live="polite"></span><button class="review-next" aria-label="Próximas avaliações">${icon('arrow')}</button></div></div></div>
  <div class="reviews-bottom"><span class="reviews-attribution">Google Maps</span><div class="reviews-profile"></div></div>
 </section>
 <section id="localizacao" class="container store-location" aria-labelledby="location-title">
  <div class="community-heading"><p class="section-kicker">NOSSA LOJA</p><h2 id="location-title">Venha conhecer a <span>Motta Multimarcas</span></h2><p>Estamos prontos para receber você e ajudar a encontrar seu próximo veículo.</p></div>
  <div class="location-grid"><div class="location-info">${logo}<h3>Visite nossa loja em Alvorada</h3><dl><div><dt>${icon('pin')} Endereço</dt><dd class="location-address"></dd></div><div><dt>${icon('clock')} Atendimento</dt><dd class="location-hours"></dd></div><div><dt>${icon('phone')} Contato</dt><dd class="location-contact"></dd></div></dl><div class="location-actions"><span class="directions-slot"></span><button class="button secondary" data-contact>${icon('chat')} Falar no WhatsApp</button></div></div><div class="map-panel"></div></div>
 </section>`;
 document.querySelector('main').append(...sections.children);
 const profile = external(business.google?.profileUrl);
 const profileSlot = document.querySelector('.reviews-profile');
 if (profile) profileSlot.append(link('Ver avaliações no Google', profile, 'button secondary'));
 else {const b=el('button','button secondary','Ver avaliações no Google');b.disabled=true;profileSlot.append(b);}
 document.querySelector('.location-address').textContent = business.address || 'Endereço em confirmação.';
 document.querySelector('.location-hours').textContent = business.hours || 'Horários a confirmar.';
 document.querySelector('.location-contact').textContent = business.whatsapp || business.phone || 'Telefone a confirmar.';
 const directions = document.querySelector('.directions-slot');
 if (business.address) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.search = new URLSearchParams({api:'1',destination:business.address}).toString();
  directions.append(link('Como chegar',url.href,'button'));
 } else {const b=el('button','button','Como chegar');b.disabled=true;directions.append(b);}
 mountMap(business, icon);
 mountReviews(business.google || {}, icon);
 setupMotion();
}

function mountMap(business, icon) {
 const panel=document.querySelector('.map-panel');
 let source='';
 const configured=external(business.google?.embedUrl);
 if(configured){const u=new URL(configured);if(u.hostname==='www.google.com' && u.pathname.startsWith('/maps/embed'))source=u.href;}
 if(!source && business.address){
  const u=new URL('https://www.google.com/maps');
  u.search=new URLSearchParams({q:business.address,output:'embed',hl:'pt-BR'}).toString();source=u.href;
 }
 if(!source){panel.innerHTML=`<div class="map-pending">${icon('pin')}<h3>Em breve, sua rota até a Motta</h3><p>Estamos confirmando a localização oficial da loja.</p></div>`;return;}
 const frame=el('iframe');frame.src=source;frame.title='Localização da Motta Multimarcas em Alvorada, RS';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.width='600';frame.height='420';panel.append(frame);
}

async function mountReviews(config, icon) {
 const state=document.querySelector('.reviews-state');
 const content=document.querySelector('.reviews-content');
 const stateMessage=(title,description)=>{
  state.replaceChildren();
  const copy=el('div');copy.append(el('h3','',title),el('p','',description));state.append(copy);state.hidden=false;
 };
 if(!config.reviewsEndpoint){
  content.classList.add('reviews-direct');
  document.querySelector('.google-reviews').classList.add('direct-profile');
  stateMessage('Leia as avaliações no perfil oficial','Os comentários dos clientes estão disponíveis diretamente no Google.');return;
 }
 // Somente endpoint do próprio site: a credencial Google permanece no servidor.
 let endpoint;
 try {endpoint=new URL(config.reviewsEndpoint,location.origin);if(endpoint.origin!==location.origin)throw Error('endpoint');}
 catch {stateMessage('Avaliações indisponíveis no momento','Você pode consultar as experiências dos clientes no perfil oficial do Google.');return;}
 content.setAttribute('aria-busy','true');stateMessage('Carregando avaliações','Buscando as experiências dos clientes no Google.');state.classList.add('is-loading');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try {
  const response=await fetch(endpoint,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('response');
  const data=await response.json();
  // O endpoint deve retornar Place Details (New) do Place ID confirmado.
  if(config.placeId && data.id!==config.placeId)throw Error('place');
  const reviews=Array.isArray(data.reviews)?data.reviews.filter(r=>typeof r.authorAttribution?.displayName==='string'&&Number.isFinite(r.rating)&&r.rating>=1&&r.rating<=5).slice(0,4):[];
  if(Number.isFinite(data.rating)&&data.rating>=1&&data.rating<=5&&Number.isInteger(data.userRatingCount)&&data.userRatingCount>0){
   const summary=document.querySelector('.reviews-summary');summary.hidden=false;
   summary.append(el('strong','review-average',data.rating.toLocaleString('pt-BR',{maximumFractionDigits:1})),stars(data.rating),el('span','review-total',`${data.userRatingCount.toLocaleString('pt-BR')} avaliações no Google`));
  }
  if(!reviews.length){stateMessage('Novas experiências, em breve','Ainda não há comentários disponíveis nesta integração. Confira o perfil oficial no Google.');return;}
  state.hidden=true;
  const track=document.querySelector('.reviews-track');
  for(const review of reviews){
   const card=el('article','review-card');const author=el('div','review-author');
   const name=review.authorAttribution.displayName;
   const photo=external(review.authorAttribution.photoUri);
   if(photo){const img=el('img','review-avatar');img.src=photo;img.alt='';img.loading='lazy';img.width=40;img.height=40;author.append(img);}
   const title=el('h3');const authorUrl=external(review.authorAttribution.uri);title.append(authorUrl?link(name,authorUrl):document.createTextNode(name));author.append(title);
   card.append(author,stars(review.rating));
   const date=review.publishTime?new Date(review.publishTime):null;
   if(date&&!Number.isNaN(date.getTime())){const time=el('time','review-date',date.toLocaleDateString('pt-BR'));time.dateTime=date.toISOString();card.append(time);}
   else if(review.relativePublishTimeDescription)card.append(el('span','review-date',review.relativePublishTimeDescription));
   const text=typeof review.text?.text==='string'?review.text.text:typeof review.originalText?.text==='string'?review.originalText.text:'';
   if(text)card.append(el('p','review-text',text));
   const origin=el('div','review-origin','Google Maps');const url=external(review.googleMapsUri);if(url)origin.append(link('Ver avaliação',url));card.append(origin);track.append(card);
  }
  if(Array.isArray(data.attributions)){
   const providers=el('p','reviews-policy');
   for(const attribution of data.attributions){
    if(typeof attribution.provider!=='string')continue;
    const providerUrl=external(attribution.providerUri);
    providers.append(providerUrl?link(attribution.provider,providerUrl):document.createTextNode(attribution.provider),document.createTextNode(' '));
   }
   document.querySelector('.reviews-bottom').before(providers);
  }
  const policy=el('p','reviews-policy','As avaliações são exibidas por relevância, conforme disponibilizadas pelo Google. ');
  policy.append(link('Sobre as avaliações do Google','https://support.google.com/contributionpolicy/answer/7400114'));document.querySelector('.reviews-bottom').before(policy);
  const carousel=document.querySelector('.reviews-carousel');carousel.hidden=false;
  const prev=document.querySelector('.review-prev'), next=document.querySelector('.review-next');
  const step=()=>track.firstElementChild.getBoundingClientRect().width+24;
  const update=()=>{prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft>=track.scrollWidth-track.clientWidth-2;document.querySelector('.review-position').textContent=`${Math.min(Math.round(track.scrollLeft/step())+1,reviews.length)} de ${reviews.length}`;};
  const move=direction=>track.scrollBy({left:direction*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}});
  track.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(track);update();
  // Conteúdo carregado depois da inicialização também recebe entrada única.
  track.querySelectorAll('.review-card').forEach((card,i)=>{card.style.setProperty('--reveal-delay',`${i%3*60}ms`);card.classList.add('review-arrived');});
 } catch {
  stateMessage('Avaliações indisponíveis no momento','Consulte os comentários reais no perfil oficial do Google.');
 } finally {clearTimeout(timeout);content.setAttribute('aria-busy','false');state.classList.remove('is-loading');}
}

function setupMotion(){
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 if(preference.matches)return;
 document.documentElement.classList.add('motion-ready');
 // A camada repete o mesmo background; nenhuma foto ou proporção é substituída.
 const hero=document.querySelector('.hero');const visual=el('div','hero-visual');visual.setAttribute('aria-hidden','true');hero.prepend(visual);
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08});
 const reveal=(node,index=0)=>{
  const siblingIndex=node.matches('.vehicle-card,.benefits>div')?[...node.parentElement.children].indexOf(node):0;
  node.classList.add('reveal');node.style.setProperty('--reveal-delay',`${siblingIndex%4*60}ms`);
  if(node.getBoundingClientRect().top<innerHeight && node.getBoundingClientRect().bottom>0)node.classList.add('is-visible');else observer.observe(node);
 };
 document.querySelectorAll('.benefits>div,.search-area,.section-heading,.vehicle-card,.financing,.community-heading,.reviews-content,.reviews-bottom,.location-info,.map-panel,.footer-grid>div').forEach((n,i)=>reveal(n,i));
 new MutationObserver(records=>{for(const record of records)record.addedNodes.forEach((n,i)=>{if(n.nodeType===1&&n.matches('.vehicle-card'))reveal(n,i);});}).observe(document.querySelector('.vehicle-track'),{childList:true});
 preference.addEventListener('change',e=>{if(e.matches){document.documentElement.classList.remove('motion-ready');observer.disconnect();document.querySelectorAll('.reveal').forEach(n=>n.classList.add('is-visible'));}},{once:true});
}
