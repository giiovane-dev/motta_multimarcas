import {business, vehicles} from './data.js';
import './styles.css';
import {loadCatalog,watchCatalog} from './catalog.js';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import {mountExperience} from './experience.js';
import {mountFinancingInstitutions} from './financing.js';
import {mountMottaDreamSlogan} from './motta-dream-slogan.js';
import {mountVehiclePage,setupVehicleRequests} from './vehicle-details.js';
import {vehiclePath,escapeHTML,whatsappUrl,formatPrice} from './vehicle-model.js';
const stockPage=location.pathname.replace(/\/$/,'')==='/estoque';
await loadCatalog();
business.siteUrl=location.origin;
business.phone='(51) 99219-2120';
const stock=()=>vehicles.filter(v=>!['sold','unavailable'].includes(v.status));
const safeCard=v=>({...v,...Object.fromEntries(['id','slug','brand','model','version'].map(key=>[key,escapeHTML(v[key])]))});
const icons={car:'<path d="m5 7 2-4h10l2 4M3 11l2-4h14l2 4v8h-3v-3H6v3H3zM3 12h18M6 10h2m8 0h2"/>', search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 9 8 15 8-6 12-11 8-15Z"/>',shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m7 11 3 3 7-7"/>',coins:'<ellipse cx="14" cy="5" rx="7" ry="3"/><path d="M7 5v10c0 4 14 4 14 0V5M7 10c0 4 14 4 14 0M7 15c0 4 14 4 14 0M3 10v9c0 3 11 4 15 1"/>',hand:'<path d="m2 10 4-5 5 1 3-1 8 6-5 8-5 2-9-8Zm4-5 8 9m-3-8-4 5 3 2 4-4m-7 7 3 3m0-6 4 5"/>',award:'<circle cx="12" cy="9" r="6"/><path d="m7 14-3 8 6-2 2-4 2 4 6 2-3-8"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2"/>',gauge:'<path d="M3 18a10 10 0 1 1 18 0M12 13l5-6M5 11l2 1m10 0 2-1M11 4v3"/><circle cx="12" cy="15" r="2"/>',chat:'<path d="M21 11a9 9 0 0 1-13 8L2 21l2-6A9 9 0 1 1 21 11Z"/><path d="M8 6c-3 4 4 11 8 8l-3-3-2 1-2-2 1-2Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',pin:'<path d="M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>'};
icons.instagram='<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>';
icons.facebook='<path d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v8"/>';
icons.menu='<path d="M4 6h16M4 12h16M4 18h16"/>';
icons.phone='<path d="m8 3 2 5-3 2a14 14 0 0 0 7 7l2-3 5 2v4c0 1-1 2-2 2A19 19 0 0 1 2 5c0-1 1-2 2-2z"/>';
icons.hand='<path d="m2 9 4-5 4 2 4-1 8 5-3 6-5 5-4-2-5-5zM10 6l-4 5 3 2 4-4 6 5M8 15l4 4m-1-7 5 5M2 9l3 5m17-4-3 6"/>';
const icon=(name)=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.chat}</svg>`;
const socialEntries=Object.entries({...business.socials,facebook:business.socials?.facebook||'https://www.facebook.com/p/Motta-multimarcas-100063717726135/?locale=pt_BR'}).filter(([,url])=>{try{return new URL(url).protocol==='https:';}catch{return false;}});
const logo=`<img class="logo" src="${escapeHTML(business.logo&&(/^(https:\/\/|\/img\/)/.test(business.logo))?business.logo:'/img/07_logotipo_motta_mockup.png')}" alt="${escapeHTML(business.name||'Motta Multimarcas')}" width="580" height="228">`;
const nav=()=>'<a href="#inicio" class="active" aria-current="location">Início</a><a href="#estoque">Estoque</a><a href="/simular-financiamento">Financiamento</a><a href="#sobre">Sobre nós</a><a href="#contato">Contato</a>';
const scrollBehavior=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
const money=formatPrice;
const financingWhatsApp=whatsappUrl(business.financingWhatsapp||business.whatsapp,'Olá! Gostaria de mais informações sobre o financiamento dos carros da Motta Multimarcas. Quais são as condições e os documentos necessários?');
let favorites; try{favorites=new Set(JSON.parse(localStorage.getItem('motta-favorites')||'[]'));}catch{favorites=new Set();}
document.querySelector('#app').innerHTML=`
<header><div class="header-inner"><a href="#inicio" aria-label="Motta Multimarcas — início">${logo}</a><nav aria-label="Navegação principal">${nav()}</nav><button class="header-contact" data-contact>${icon('chat')}<span>${escapeHTML(business.whatsapp||'Fale com a Motta')}</span></button><button class="button proposal" data-interest="Proposta online">${icon('car')} Proposta Online</button><button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-nav">${icon('menu')}</button></div><nav id="mobile-nav" aria-label="Navegação mobile" hidden>${nav()}</nav></header>
<main><section class="hero" id="inicio"><div class="container"><div class="hero-copy"><p class="eyebrow">MOTTA MULTIMARCAS</p><h1>Encontre o carro<br>ideal <span>para você</span></h1><p class="hero-description">Qualidade, procedência e as melhores<br class="desktop-break"> condições para você sair de carro novo.</p><div class="hero-actions"><a class="button" href="#estoque">${icon('car')} Ver Estoque</a><button class="button secondary" data-contact>${icon('chat')} Falar no WhatsApp</button></div></div><div class="benefits">${[['shield','Veículos revisados','e com procedência'],['coins','As melhores','condições de pagamento'],['hand','Atendimento','personalizado'],['award','Tradição e','confiança']].map(([i,a,b])=>`<div>${icon(i)}<p>${a}<br>${b}</p></div>`).join('')}</div></div></section>
<section class="container search-area" aria-label="Pesquisa de veículos"><form id="search"><h2>${icon('search')} Encontre o veículo ideal</h2><label>Marca<select name="brand"><option value="">Todas</option>${stock().map(v=>`<option>${escapeHTML(v.brand)}</option>`).join('')}</select></label><label>Modelo<select name="model"><option value="">Todos</option></select></label><label>Ano<select name="year"><option value="">Todos</option>${[...new Set(stock().map(v=>v.year))].sort((a,b)=>b-a).map(y=>`<option>${y}</option>`).join('')}</select></label><label>Faixa de preço<select name="price"><option value="">Todos os valores</option><option value="0-50000">Até R$ 50 mil</option><option value="50000-80000">De R$ 50 mil a R$ 80 mil</option><option value="80000-100000">De R$ 80 mil a R$ 100 mil</option><option value="100000-150000">De R$ 100 mil a R$ 150 mil</option><option value="150000-200000">De R$ 150 mil a R$ 200 mil</option><option value="200000-">Acima de R$ 200 mil</option></select></label><button class="button" type="submit">Buscar Veículos</button></form></section>
<section id="estoque" class="container stock"><div class="section-heading"><h2>Destaques do <span>nosso estoque</span></h2><a class="all-stock" href="/estoque">Ver todo o estoque ${icon('arrow')}</a></div><div class="catalog-scroll"><div class="vehicle-track" tabindex="0" role="region" aria-label="Catálogo de carros: role para baixo ou para cima"></div></div><div class="catalog-navigation"><span>Role para ver mais carros</span><button type="button" class="catalog-top">Voltar ao início do catálogo ↑</button></div><p class="stock-note" role="status">Consulte disponibilidade e valores com a loja.</p></section>
<section id="financiamento" class="financing"><div class="finance-title">${icon('car')}<h2>Simule o seu<br><span>financiamento</span></h2></div><p>Conheça as condições de financiamento.<br>Crédito sujeito à análise da instituição financeira.<br><a href="${escapeHTML(financingWhatsApp)}" target="_blank" rel="noopener noreferrer">WhatsApp: (51) 97400-6062</a></p><a class="button light" href="${escapeHTML(financingWhatsApp)}" target="_blank" rel="noopener noreferrer">Simular Agora ${icon('arrow')}</a></section></main>
<footer><div class="container footer-grid"><div id="sobre">${logo}<p>Revenda de veículos com qualidade,<br>procedência e atendimento de confiança.</p><small class="business-socials">${socialEntries.map(([name,url])=>`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${['instagram','facebook'].includes(name.toLowerCase())?icon(name.toLowerCase()):''}${escapeHTML(name)}</a>`).join(' · ')||'Redes sociais: em breve.'}</small></div><div><h3>Navegação</h3><nav aria-label="Navegação do rodapé">${nav()}</nav></div><div id="contato"><h3>Contato</h3><p>${icon('chat')} ${escapeHTML(business.whatsapp||'WhatsApp a confirmar')}</p><p>${icon('phone')} <a href="tel:+5551992192120">${escapeHTML(business.phone)}</a></p><p>${icon('pin')} ${escapeHTML(business.address||'Endereço a confirmar')}</p></div><div><h3>Horário de Atendimento</h3><p>${icon('clock')} ${escapeHTML(business.hours||'Horários a confirmar')}</p></div></div><div class="container copyright">© 2026 Motta Multimarcas. Todos os direitos reservados.<span>Desenvolvido por <a class="developer-credit" href="https://www.instagram.com/giovane_nunesads/" target="_blank" rel="noopener noreferrer">GVN DIGITAL</a></span></div></footer>
<dialog id="interest"><button class="close" aria-label="Fechar formulário">×</button><h2>Fale com a Motta</h2><p class="contact-pending"></p><form id="interest-form"><label>Seu nome<input name="name" autocomplete="name" required maxlength="100"></label><label>Telefone ou e-mail<input name="contact" required maxlength="150"></label><label>Seu interesse<textarea name="message" required maxlength="1500"></textarea></label><button class="button" type="submit">${business.whatsapp?'Continuar no WhatsApp':'Contato indisponível'}</button><p class="form-note">${business.whatsapp?'Você será direcionado ao WhatsApp.':'Confirme um canal de atendimento com a loja. Nenhum dado será salvo neste dispositivo.'}</p></form><p id="saved" role="status"></p></dialog>`;
const financingAction=document.querySelector('#financiamento .button');
const financingActions=document.createElement('div');financingActions.className='financing-form-actions';
const applicationLink=document.createElement('a');applicationLink.className='button light';applicationLink.href='/simular-financiamento';applicationLink.textContent='Simular Financiamento';
financingAction.before(financingActions);financingActions.append(applicationLink,financingAction);
const track=document.querySelector('.vehicle-track'); let filtered=stock();
function render(list){filtered=list;track.innerHTML=list.length?list.map(raw=>{const v=safeCard(raw);return `<article class="vehicle-card"><div class="vehicle-photo"><a href="${vehiclePath(v)}" aria-label="Ver detalhes de ${v.brand} ${v.model}"><img src="${escapeHTML(v.imageUrl||'/img/'+v.image)}" alt="${v.brand} ${v.model}" width="936" height="520" loading="lazy"></a><button class="favorite ${favorites.has(v.id)?'selected':''}" data-favorite="${v.id}" aria-label="Favoritar ${v.brand} ${v.model}" aria-pressed="${favorites.has(v.id)}">${icon('heart')}</button></div><div class="card-body"><h3><a href="${vehiclePath(v)}">${v.brand} ${v.model}</a></h3><p>${v.version}</p><div class="specs"><span>${icon('calendar')} ${v.year}</span><span>${icon('gauge')} ${v.km.toLocaleString('pt-BR')} km</span></div><strong>${money(v.price)}</strong><a class="detail-button" href="${vehiclePath(v)}">Ver Detalhes ${icon('arrow')}</a><button class="card-consult" data-vehicle-consult="${v.id}">Consultar no WhatsApp</button></div></article>`;}).join(''):'<div class="empty"><h3>Nenhum veículo encontrado</h3><p>Experimente outras opções de busca.</p><button class="button all-stock">Limpar filtros</button></div>';track.scrollTop=0;}
function inPriceRange(price,range){if(!range)return true;const [min,max]=range.split('-');return Number.isFinite(price)&&price>=Number(min)&&(!max||price<=Number(max));}
function models(){const brand=document.querySelector('[name=brand]').value;document.querySelector('[name=model]').innerHTML='<option value="">Todos</option>'+[...new Set(stock().filter(v=>!brand||v.brand===brand).map(v=>v.model))].sort().map(model=>`<option>${escapeHTML(model)}</option>`).join('');}
document.querySelector('[name=brand]').innerHTML='<option value="">Todas</option>'+[...new Set(stock().map(v=>v.brand))].sort().map(brand=>`<option>${escapeHTML(brand)}</option>`).join('');
models();render(stock());
document.querySelector('[name=brand]').addEventListener('change',models);
document.querySelector('#search').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);render(stock().filter(v=>(!f.get('brand')||v.brand===f.get('brand'))&&(!f.get('model')||v.model===f.get('model'))&&(!f.get('year')||v.year===Number(f.get('year')))&&inPriceRange(v.price,f.get('price'))));document.querySelector('.stock-note').textContent=`${filtered.length} veículo(s) encontrado(s). Veículos e valores sujeitos a confirmação.`;document.querySelector('#estoque').scrollIntoView({behavior:scrollBehavior()});});
function interest(message){const d=document.querySelector('#interest');document.querySelector('[name=message]').value=message;document.querySelector('.contact-pending').textContent=business.whatsapp?'Conte o que você procura.':'O WhatsApp comercial ainda não foi confirmado. Confirme um canal de atendimento com a loja.';document.querySelector('#saved').textContent='';document.querySelector('#interest-form [type=submit]').disabled=!whatsappUrl(business.whatsapp,'');d.showModal();}
function setMobileMenu(open){
 const button=document.querySelector('.menu-toggle');
 button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
 document.querySelector('#mobile-nav').hidden=!open;
}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true'){setMobileMenu(false);document.querySelector('.menu-toggle').focus();}});
 document.addEventListener('click',e=>{if(!e.target.closest('header'))setMobileMenu(false);});
 document.addEventListener('click',e=>{const target=e.target.closest('button,a');if(!target)return;if(target.matches('.menu-toggle'))setMobileMenu(target.getAttribute('aria-expanded')!=='true');if(target.closest('#mobile-nav')&&target.tagName==='A')setMobileMenu(false);if(target.matches('.close'))target.closest('dialog').close();if(target.hasAttribute('data-contact')||target.hasAttribute('data-interest'))interest(target.dataset.interest||'Gostaria de conversar sobre os veículos.');if(target.hasAttribute('data-favorite')){const id=target.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);try{localStorage.setItem('motta-favorites',JSON.stringify([...favorites]));}catch{}target.classList.toggle('selected',favorites.has(id));target.setAttribute('aria-pressed',String(favorites.has(id)));}if(target.matches('button.all-stock')){document.querySelector('#search').reset();models();render(stock());document.querySelector('.stock-note').textContent='Consulte disponibilidade e valores com a loja.';document.querySelector('#estoque').scrollIntoView({behavior:scrollBehavior()});}if(target.matches('.catalog-top')){track.scrollTo({top:0,behavior:scrollBehavior()});track.focus({preventScroll:true});}});
document.querySelector('#interest-form').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const url=whatsappUrl(business.whatsapp,data.name+' ('+data.contact+'): '+data.message);if(url)window.open(url,'_blank','noopener,noreferrer');else document.querySelector('#saved').textContent='O WhatsApp comercial ainda não está configurado. Nenhuma mensagem foi enviada.';});


document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)document.querySelectorAll('nav a').forEach(a=>{const active=a.hash===`#${entry.target.id}`;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});});},{rootMargin:'-10% 0px -65% 0px'});document.querySelectorAll('#inicio,#estoque,#financiamento,#sobre,#contato').forEach(s=>observer.observe(s));
setupVehicleRequests();
if(location.pathname.startsWith('/veiculos/'))mountVehiclePage();
else if(!stockPage)mountExperience({business,logo,icon});
if(!stockPage)mountFinancingInstitutions();

function renderSold(){
 document.querySelector('#vendidos')?.remove();if(stockPage||location.pathname.startsWith('/veiculos/'))return;
 const sold=vehicles.filter(v=>v.status==='sold');if(!sold.length)return;
 const section=document.createElement('section');section.id='vendidos';section.className='container sold-vehicles';
 section.innerHTML=`<div class="section-heading"><h2>Veículos <span>vendidos</span></h2></div><p class="stock-note">Histórico público de veículos vendidos. Consulte a equipe para conhecer as opções disponíveis.</p><div class="sold-grid">${sold.map(v=>`<a href="${vehiclePath(v)}"><img src="${escapeHTML(v.images[0]?.url||'')}" alt="${escapeHTML(v.brand)} ${escapeHTML(v.model)}" loading="lazy"><strong>${escapeHTML(v.brand)} ${escapeHTML(v.model)}</strong><span>Vendido · ${v.year}</span></a>`).join('')}</div>`;
 (document.querySelector('#motta-dream-slogan')||document.querySelector('#financiamento')).before(section);
}renderSold();
if(!stockPage)mountMottaDreamSlogan();

watchCatalog(()=>{
 if(location.pathname.startsWith('/veiculos/')){location.reload();return;}
 const brand=document.querySelector('[name=brand]'),year=document.querySelector('[name=year]');
 const currentBrand=brand.value,currentYear=year.value,currentModel=document.querySelector('[name=model]').value;
 brand.innerHTML='<option value="">Todas</option>'+[...new Set(stock().map(v=>v.brand))].sort().map(b=>`<option>${escapeHTML(b)}</option>`).join('');
 year.innerHTML='<option value="">Todos</option>'+[...new Set(stock().map(v=>v.year))].sort((a,b)=>b-a).map(y=>`<option>${y}</option>`).join('');
 brand.value=currentBrand;year.value=currentYear;models();document.querySelector('[name=model]').value=currentModel;renderSold();
 const f=new FormData(document.querySelector('#search'));render(stock().filter(v=>(!f.get('brand')||v.brand===f.get('brand'))&&(!f.get('model')||v.model===f.get('model'))&&(!f.get('year')||v.year===Number(f.get('year')))&&inPriceRange(v.price,f.get('price'))));
});

if(stockPage){
 document.body.classList.add('stock-page');document.title='Estoque de veículos | Motta Multimarcas';
 document.querySelector('meta[name=description]').content='Confira os carros disponíveis na Motta Multimarcas e filtre por marca, modelo, ano e faixa de preço.';
 document.querySelector('#inicio').remove();document.querySelector('#financiamento').remove();
 document.querySelector('.stock .section-heading h2').outerHTML='<h1>Nosso <span>estoque</span></h1>';
 document.querySelector('.stock .section-heading .all-stock').remove();
 document.querySelectorAll('a[href^="#"]').forEach(a=>{if(a.hash!=='#estoque')a.href='/'+a.hash;});
 document.querySelectorAll('nav a').forEach(a=>{const active=a.hash==='#estoque';a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.querySelector('.stock-note').textContent=filtered.length+' veículo(s) disponível(is). Consulte disponibilidade e valores com a loja.';
}
