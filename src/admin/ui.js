import {escapeHTML} from '../vehicle-model.js';
import {icon} from './icons.js';
import {formatBRL} from '../lib/currency.js';
export const e=escapeHTML;
export const money=n=>formatBRL(n??0);
export const date=value=>value?new Date(value.length===10?`${value}T12:00:00`:value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const labels={available:'Disponível',negotiating:'Em negociação',reserved:'Reservado',sold:'Vendido',withdrawn:'Retirado',received:'Recebido',preparing:'Em preparação',ready:'Pronto para venda',pending:'Pendente',draft:'Rascunho',published:'Publicado',unpublished:'Despublicado',new:'Novo interesse',contacting:'Em atendimento',proposal:'Proposta enviada',won:'Concluído',lost:'Perdido',entry:'Entrada',sale:'Venda',return:'Devolução',transfer:'Transferência',other:'Outra saída',paid:'Pago',partial:'Parcial',delivered:'Entregue',done:'Concluída',admin:'Administrador',manager:'Gerente',seller:'Vendedor',operational:'Operacional'};
export const badge=s=>`<span class="badge ${e(s)}">${e(labels[s]||s)}</span>`;
export function toast(message,error=false){const node=document.querySelector('#admin-toast');node.textContent=message;node.classList.toggle('error',error);node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.hidden=true,6500);}
export const empty=(text='Nenhum registro encontrado.')=>`<div class="empty-state">${icon('file')}<p>${e(text)}</p></div>`;
export const button=(label,action,ico='plus',cls='')=>`<button type="button" class="abutton ${cls}" data-action="${e(action)}">${icon(ico)}${e(label)}</button>`;
export function field(label,name,value='',type='text',options){
 const attrs=`name="${e(name)}" id="f-${e(name)}"`;
 let control;
 if(type==='select')control=`<select ${attrs}>${Object.entries(options||{}).map(([v,t])=>`<option value="${e(v)}" ${String(value??'')===v?'selected':''}>${e(t)}</option>`).join('')}</select>`;
 else if(type==='textarea')control=`<textarea ${attrs} rows="4" maxlength="10000">${e(value)}</textarea>`;
 else if(type==='checkbox')control=`<input ${attrs} type="checkbox" ${value?'checked':''}>`;
 else control=`<input ${attrs} type="${type==='money'?'number':type}" value="${e(value)}" ${type==='money'?'step="0.01" min="0"':type==='number'?'min="0" step="1"':''} ${name==='email'?'autocomplete="email"':''} maxlength="500">`;
 return `<div class="afield ${type==='textarea'?'wide':''}"><label for="f-${e(name)}">${e(label)}</label>${control}</div>`;
}
export function formValues(form){const values=Object.fromEntries(new FormData(form));form.querySelectorAll('input[type=checkbox][name]').forEach(i=>values[i.name]=i.checked);return values;}
export function modal(title,body,{submit='Salvar',onSubmit,wide=false}={}){
 const old=document.querySelector('#admin-dialog');if(old){old.close();old.remove();}
 const d=document.createElement('dialog');d.id='admin-dialog';d.className=wide?'wide-dialog':'';
 d.innerHTML=`<div class="dialog-heading"><div><p class="overline">MOTTA MULTIMARCAS</p><h2>${e(title)}</h2></div><button type="button" class="icon-button" data-close aria-label="Fechar">${icon('close')}</button></div><form class="admin-form">${body}<p class="form-error" role="alert"></p><div class="dialog-footer"><button type="button" class="abutton" data-close>Cancelar</button>${onSubmit?`<button class="abutton primary" type="submit">${e(submit)}</button>`:''}</div></form>`;
 document.body.append(d);d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}});
 d.querySelector('form').onsubmit=async ev=>{ev.preventDefault();const b=d.querySelector('[type=submit]');b.disabled=true;const error=d.querySelector('.form-error');error.textContent='';try{await onSubmit(formValues(ev.target),ev.target,d);}catch(err){error.textContent=err.message||'Não foi possível salvar. Tente novamente.';}finally{b.disabled=false;}};
 d.showModal();return d;
}
export async function confirmAction(title,text,callback){return modal(title,`<p class="dialog-copy">${e(text)}</p>`,{submit:'Confirmar',onSubmit:async(_,__,d)=>{await callback();d.close();}});}
export function csvDownload(name,rows){
 const escape=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@\-\t\r]/,"'$&")+'"';
 const keys=Object.keys(rows[0]||{});const content='\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(escape).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
