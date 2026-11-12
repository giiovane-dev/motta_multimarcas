import './motta-dream-slogan.css';

const letters=(text,start)=>[...text].map((letter,i)=>`<span class="dream-letter" style="--letter-delay:${start+i*35}ms">${letter===' '?'&#160;':letter}</span>`).join('');

export function MottaDreamSlogan(){
 const section=document.createElement('section');section.id='motta-dream-slogan';section.className='motta-dream';section.setAttribute('aria-labelledby','motta-dream-title');
 section.innerHTML=`<div class="dream-texture dream-texture-top" aria-hidden="true"></div><div class="dream-texture dream-texture-bottom" aria-hidden="true"></div><div class="dream-light dream-light-left" aria-hidden="true"></div><div class="dream-light dream-light-right" aria-hidden="true"></div><div class="dream-brand-depth" aria-hidden="true"><img class="dream-watermark" src="/img/07_logotipo_motta_mockup.png" alt="" width="580" height="228" loading="lazy" decoding="async"></div><div class="dream-composition"><p class="dream-reminder"><span class="dream-rule" aria-hidden="true"></span><em>Lembre-se:</em><span class="dream-rule" aria-hidden="true"></span></p><h2 id="motta-dream-title" class="dream-heading" aria-label="TUDO COMEÇA COM UM SONHO"><span class="dream-line" aria-hidden="true">${letters('TUDO COMEÇA',850)}</span><span class="dream-line" aria-hidden="true">${letters('COM UM SONHO',1450)}</span></h2><svg class="dream-swoosh" viewBox="0 0 1000 75" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="dream-red-gradient"><stop stop-color="#8c0008"/><stop offset=".25" stop-color="#ed0716"/><stop offset=".5" stop-color="#ff3440"/><stop offset=".75" stop-color="#ed0716"/><stop offset="1" stop-color="#8c0008"/></linearGradient><linearGradient id="dream-shine-gradient"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff5e9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path class="dream-swoosh-glow" d="M20 61 Q500 -19 980 61" pathLength="1000"/><path class="dream-swoosh-fill" d="M20 61 Q500 -19 980 61 Q500 5 20 61 Z" fill="url(#dream-red-gradient)"/><path class="dream-swoosh-stroke" d="M20 61 Q500 -19 980 61" pathLength="1000"/><path class="dream-swoosh-shine" d="M20 61 Q500 -19 980 61" pathLength="1000"/></svg></div>`;
 return section;
}

export function mountMottaDreamSlogan(){
 if(location.pathname!=='/'||document.querySelector('#motta-dream-slogan'))return;
 const financing=document.querySelector('#financiamento');if(!financing)return;
 const section=MottaDreamSlogan();financing.before(section);
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 if(preference.matches||!('IntersectionObserver' in window))return;
 let complete=false;
 const finish=()=>{complete=true;section.classList.remove('dream-awaiting');section.classList.add('dream-visible');observer.disconnect();preference.removeEventListener('change',onPreference);};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.35))finish();},{threshold:.35});
 const onPreference=event=>{if(event.matches&&!complete)finish();};
 section.classList.add('dream-awaiting');observer.observe(section);preference.addEventListener('change',onPreference);
 window.addEventListener('pagehide',()=>{observer.disconnect();preference.removeEventListener('change',onPreference);},{once:true});
}
