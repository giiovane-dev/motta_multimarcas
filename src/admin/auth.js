import {supabase,configured} from '../lib/supabase.js';
import {e,toast} from './ui.js';
import {icon} from './icons.js';
import './login.css';

const shieldIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg>';
const emailKey='motta-remembered-email';
const mailIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
function rememberedEmail(){try{return localStorage.getItem(emailKey)||'';}catch{return '';}}
function rememberEmail(value){try{if(value)localStorage.setItem(emailKey,value);else localStorage.removeItem(emailKey);}catch{/* Restricted storage must not prevent login. */}}
export async function authorizedProfile(){
 const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return null;
 const {data,error:profileError}=await supabase.from('motta_profiles').select('id,full_name,role,active').eq('id',user.id).maybeSingle();
 if(profileError)throw profileError;if(!data?.active)return {denied:true};return data;
}
export function login({denied=false,recovery=false}={}){
 const savedEmail=rememberedEmail();
 document.querySelector('#app').innerHTML=`<main class="login-page premium-login">
 <section class="login-brand" aria-labelledby="login-brand-title">
  <div class="login-studio" aria-hidden="true"><picture><source media="(max-width:760px)" srcset="/img/motta-login-studio-mobile.webp"><img src="/img/motta-login-studio.webp" alt="" width="1536" height="1024" decoding="async" fetchpriority="low"></picture><div class="login-light"></div></div>
  <div class="login-brand-top"><a href="/" aria-label="Motta Multimarcas — página inicial"><img src="/img/07_logotipo_motta_mockup.png" alt="Motta Multimarcas" width="188" height="84"></a><span>EXCELÊNCIA EM CADA DETALHE</span></div>
  <div class="login-story"><p class="overline"><span></span> SEU NEGÓCIO. SUA DIREÇÃO.</p><h1 id="login-brand-title">O controle do seu<br>negócio <em>começa aqui.</em></h1><p>Gestão inteligente de veículos,<br>estoque e negociações.</p></div>
  <div class="login-brand-bottom"><span><i></i> MOTTA MULTIMARCAS</span><span>PAIXÃO POR VEÍCULOS. VISÃO DE NEGÓCIO.</span></div>
 </section>
 <section class="login-side" aria-labelledby="login-title">
  <a href="/" class="back-link"><span aria-hidden="true">←</span> Voltar ao site</a>
  <div class="login-card">
   <img class="login-form-logo" src="/img/07_logotipo_motta_mockup.png" alt="Motta Multimarcas" width="166" height="74">
   <p class="overline">ÁREA ADMINISTRATIVA</p><h2 id="login-title">${recovery?'Defina sua nova senha.':'Bem-vindo de volta.'}</h2><p class="login-intro">${recovery?'Escolha uma senha com pelo menos 12 caracteres.':'Acesse seu painel administrativo.'}</p>
   ${!configured?'<div class="connection-notice" role="status">Conexão Supabase pendente. O acesso será habilitado após configurar o projeto da Motta.</div>':''}
   ${denied?'<div class="connection-notice" role="alert">Sua conta não tem acesso autorizado ao painel. Solicite a liberação ao administrador.</div>':''}
   <form id="login-form">
    ${!recovery?`<div class="login-field"><label for="login-email">E-mail</label><div class="login-input">${mailIcon}<input id="login-email" name="email" type="email" value="${e(savedEmail)}" placeholder="seuemail@exemplo.com" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" required></div></div>`:''}
    <div class="login-field"><label for="login-password">${recovery?'Nova senha':'Senha'}</label><div class="login-input">${icon('lock')}<input id="login-password" name="password" type="password" placeholder="${recovery?'Crie uma senha segura':'Digite sua senha'}" autocomplete="${recovery?'new-password':'current-password'}" minlength="${recovery?12:1}" required><button class="login-reveal" type="button" aria-label="Mostrar senha" aria-controls="login-password" aria-pressed="false">${icon('eye')}</button></div></div>
    ${!recovery?`<div class="login-options"><label class="login-remember"><input type="checkbox" name="remember" ${savedEmail?'checked':''}>Lembrar e-mail</label><button type="button" id="forgot" ${!configured?'disabled':''}>Esqueceu sua senha?</button></div>`:''}
    <p id="login-error" class="form-error" role="alert" aria-live="polite"></p>
    <button type="submit" class="abutton primary login-submit" ${!configured?'disabled':''}><span>${recovery?'Salvar nova senha':'Entrar no painel'}</span>${icon('arrow')}</button>
    <p class="login-form-status" role="status" aria-live="polite"></p>
   </form>
   ${denied?'<button class="text-button" id="switch-account">Sair e usar outra conta</button>':''}
   <div class="login-security">${shieldIcon}<span>Ambiente seguro. Acesso exclusivo à equipe.</span></div>
  </div>
  <footer class="login-footer"><span>© ${new Date().getFullYear()} Motta Multimarcas</span><span>Desenvolvido por <strong>GVN DIGITAL</strong></span></footer>
 </section></main>`;
 const form=document.querySelector('#login-form'),submit=form.querySelector('[type=submit]'),password=form.elements.password,errorMessage=form.querySelector('.form-error'),status=form.querySelector('.login-form-status');
 let submitting=false,awaitingAuthorization=false;
 const reveal=form.querySelector('.login-reveal');
 reveal.onclick=()=>{const visible=password.type==='password';password.type=visible?'text':'password';reveal.setAttribute('aria-pressed',String(visible));reveal.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');};
 form.elements.remember?.addEventListener('change',()=>{if(!form.elements.remember.checked)rememberEmail('');});
 form.onsubmit=async ev=>{
  ev.preventDefault();if(submitting||!configured||!form.reportValidity())return;
  submitting=true;submit.disabled=true;form.setAttribute('aria-busy','true');errorMessage.textContent='';status.textContent='';
  submit.innerHTML=`<span class="login-spinner" aria-hidden="true"></span><span>${recovery?'Salvando senha…':'Entrando…'}</span>`;
  try{
   const email=form.elements.email?.value.trim();
   const response=recovery?await supabase.auth.updateUser({password:password.value}):await supabase.auth.signInWithPassword({email,password:password.value});
   if(response.error)throw response.error;
   if(recovery){await supabase.auth.signOut();location.replace('/admin');}
   else{rememberEmail(form.elements.remember.checked?email:'');status.textContent='Validando seu acesso…';window.dispatchEvent(new Event('admin-authenticated'));}
  }catch{
   errorMessage.textContent=recovery?'Não foi possível alterar a senha. Solicite um novo link.':'Não foi possível entrar. Confira suas credenciais e tente novamente.';
   password.setAttribute('aria-describedby','login-error');
  }finally{
   if(!awaitingAuthorization){submitting=false;submit.disabled=!configured;form.setAttribute('aria-busy','false');submit.innerHTML=`<span>${recovery?'Salvar nova senha':'Entrar no painel'}</span>${icon('arrow')}`;}
  }
 };
 document.querySelector('#switch-account')?.addEventListener('click',async()=>{await supabase.auth.signOut();login();});
 document.querySelector('#forgot')?.addEventListener('click',async()=>{
  const input=form.elements.email,b=document.querySelector('#forgot');if(b.disabled||!input.reportValidity()||!input.value)return;
  b.disabled=true;b.textContent='Solicitando…';
  try{
   const {error}=await supabase.auth.resetPasswordForEmail(input.value.trim(),{redirectTo:`${location.origin}/admin/redefinir-senha`});
   if(error)throw error;
   toast('Se houver uma conta para esse e-mail, você receberá um link de recuperação.');
  }catch{toast('Não foi possível solicitar a recuperação. Tente novamente.',true);}
  finally{b.disabled=!configured;b.textContent='Esqueceu sua senha?';}
 });
 const studio=document.querySelector('.login-studio'),media=studio.querySelector('img');
 if(media.complete&&media.naturalWidth)studio.classList.add('is-loaded');
 else media.addEventListener('load',()=>studio.classList.add('is-loaded'),{once:true});
}
