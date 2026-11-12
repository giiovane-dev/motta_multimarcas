import {supabase,configured} from './lib/supabase.js';
import {business} from './data.js';
import {escapeHTML as e,whatsappUrl} from './vehicle-model.js';
import './financing.css';

export const financingMessage='Olá! Tudo bem? Estou olhando os veículos da Motta Multimarcas e gostaria de saber quais são as opções e condições de financiamento disponíveis.';
export function safeInstitutionLogo(value){
 if(!value)return '';
 if(/^\/img\/[a-zA-Z0-9_./-]+$/.test(value)&&!value.includes('..'))return value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function institutionVisual(bank){
 const src=bank.logo_authorized?safeInstitutionLogo(bank.logo_url):'';
 const asset=src.match(/^\/img\/bancos\/([a-z-]+)\.(?:svg|png|webp)$/)?.[1];
 const logoClass=asset?` bank-logo-${asset}`:'';
 return src?`<img class="institution-logo${logoClass}" src="${e(src)}" alt="${e(bank.name)}" width="180" height="84" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="institution-name institution-caption">${e(bank.name)}</span>`:`<span class="institution-name">${e(bank.name)}</span>`;
}
export function bindLogoFallback(root){root.querySelectorAll('img').forEach(img=>{const fallback=()=>{img.hidden=true;img.nextElementSibling.hidden=false;img.nextElementSibling.classList.remove('institution-caption');};img.addEventListener('error',fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();});}

function bindInstitutionsCarousel(section){
 const track=section.querySelector('.institutions-grid'),previous=section.querySelector('[data-bank-prev]'),next=section.querySelector('[data-bank-next]'),position=section.querySelector('.institutions-position');
 const cards=[...track.children];
 const step=()=>cards[0].getBoundingClientRect().width+parseFloat(getComputedStyle(track).columnGap||0);
 const update=()=>{
  const max=track.scrollWidth-track.clientWidth;
  previous.disabled=track.scrollLeft<=2;next.disabled=track.scrollLeft>=max-2;
  const first=Math.min(cards.length,Math.floor((track.scrollLeft+2)/step())+1),last=Math.min(cards.length,Math.ceil((track.scrollLeft+track.clientWidth-2)/step()));
  position.textContent=`${first}–${last} de ${cards.length}`;
 };
 const move=direction=>{const count=Math.max(1,Math.floor((track.clientWidth+10)/step()));track.scrollBy({left:direction*step()*count,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 previous.onclick=()=>move(-1);next.onclick=()=>move(1);
 track.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))event.preventDefault();
  if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1);
  if(event.key==='Home'||event.key==='End')track.scrollTo({left:event.key==='Home'?0:track.scrollWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
 track.addEventListener('scroll',update,{passive:true});
 const resize=new ResizeObserver(update);resize.observe(track);update();
 return ()=>resize.disconnect();
}

export function mountFinancingInstitutions(){
 if(!configured||!document.querySelector('#avaliacoes'))return;
 const section=document.createElement('section');section.id='instituicoes-financeiras';section.className='financing-institutions';section.hidden=true;section.setAttribute('aria-labelledby','institutions-title');
 document.querySelector('#avaliacoes').before(section);
 let snapshot='',running=false,stopped=false,observer,cleanupCarousel;
 const render=rows=>{
  cleanupCarousel?.();section.hidden=!rows.length;if(!rows.length){section.replaceChildren();return;}
  const href=whatsappUrl(business.financingWhatsapp||business.whatsapp,financingMessage);
  section.innerHTML=`<div class="container institutions-inner"><div class="institutions-heading"><p class="section-kicker">MAIS CAMINHOS. NOVAS CONQUISTAS.</p><h2 id="institutions-title">Seu próximo carro com mais<br> <span>opções de financiamento.</span></h2><p>Conheça as instituições financeiras com as quais trabalhamos e consulte as condições disponíveis para o veículo que você procura.</p></div><ul class="institutions-grid">${rows.map((bank,i)=>`<li class="institution-card" style="--institution-delay:${Math.min(i,5)*45}ms">${institutionVisual(bank)}</li>`).join('')}</ul><div class="institutions-consult"><div><span class="institutions-accent" aria-hidden="true"></span><h3>Quer saber as condições para o seu próximo carro?</h3><p>Converse com a nossa equipe e conheça suas opções.</p></div>${href?`<a class="button" href="${e(href)}" target="_blank" rel="noopener noreferrer">Consultar financiamento <span aria-hidden="true">↗</span></a>`:''}</div><p class="institutions-disclaimer">Financiamento sujeito à análise e aprovação de crédito pela instituição financeira. Condições conforme perfil e disponibilidade.</p></div>`;
  const track=section.querySelector('.institutions-grid');track.id='institutions-track';track.tabIndex=0;track.setAttribute('aria-label','Instituições financeiras — use as setas para navegar');
  const carousel=document.createElement('div');carousel.className='institutions-carousel';carousel.setAttribute('role','region');carousel.setAttribute('aria-roledescription','carrossel');carousel.setAttribute('aria-label','Instituições financeiras');track.before(carousel);carousel.append(track);
  const controls=document.createElement('div');controls.className='institutions-controls';controls.innerHTML='<span class="institutions-position" aria-live="polite" aria-atomic="true"></span><button type="button" data-bank-prev aria-label="Instituições anteriores" aria-controls="institutions-track"><span aria-hidden="true">←</span></button><button type="button" data-bank-next aria-label="Próximas instituições" aria-controls="institutions-track"><span aria-hidden="true">→</span></button>';carousel.append(controls);
  cleanupCarousel=bindInstitutionsCarousel(section);
  bindLogoFallback(section);observer?.disconnect();
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.08});section.querySelectorAll('.institutions-heading,.institution-card,.institutions-consult').forEach(node=>{node.classList.add('institution-reveal');observer.observe(node);});}
 };
 async function refresh(){
  if(running||stopped||document.hidden)return;running=true;
  try{const {data,error}=await supabase.from('motta_financing_institutions').select('id,name,logo_url,logo_authorized,sort_order').eq('enabled',true).order('sort_order').order('name').order('id').limit(200).abortSignal(AbortSignal.timeout(10000));
   if(error)return;const next=JSON.stringify(data);if(next!==snapshot){snapshot=next;render(data);}
  }catch{/* A transient failure keeps the last confirmed section. */}finally{running=false;}
 }
 refresh();
 const channel=supabase.channel('motta-financing-institutions').on('postgres_changes',{event:'*',schema:'public',table:'motta_financing_institutions'},refresh).subscribe();
 const timer=setInterval(refresh,15000);document.addEventListener('visibilitychange',refresh);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);
 window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);observer?.disconnect();cleanupCarousel?.();document.removeEventListener('visibilitychange',refresh);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);supabase.removeChannel(channel);},{once:true});
}
