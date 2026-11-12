import {formatBRL} from './lib/currency.js';
export const categories={all:'Todas as fotos',exterior:'Exterior',interior:'Interior',details:'Detalhes'};
export const interestOptions=['Disponibilidade do veículo','Condições de financiamento','Valor da entrada e parcelas','Possibilidade de troca','Agendar uma visita','Solicitar mais fotografias','Outras informações'];
export const vehiclePath=v=>`/veiculos/${v.slug}`;
export const vehicleName=v=>`${v.brand} ${v.model} ${v.version}`;
export const formatPrice=formatBRL;
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function orderedImages(vehicle){return (vehicle.images||[]).filter(i=>i.vehicleId===vehicle.id&&i.url&&['exterior','interior','details'].includes(i.category)).slice().sort((a,b)=>Number(Boolean(b.isCover))-Number(Boolean(a.isCover))||(a.sortOrder||0)-(b.sortOrder||0));}
export function buildInterestMessage(vehicle,{name='',topics=[],question=''}={},origin){
 const lines=['Olá! Tudo bem?'];
 if(name.trim())lines.push(`Meu nome é ${name.trim()}.`);
 lines.push(`Tenho interesse no veículo:\n${vehicleName(vehicle)}\nAno: ${vehicle.year}`);
 if(formatPrice(vehicle.price))lines.push(`Valor ${vehicle.status==='demonstration'?'demonstrativo':'anunciado'}: ${formatPrice(vehicle.price)}`);
 if(vehicle.status==='demonstration')lines.push('Vi que este veículo é demonstrativo. Gostaria de confirmar as informações e a disponibilidade com a loja.');
 else if(vehicle.status!=='available')lines.push('Gostaria de confirmar o status deste veículo e conhecer as opções disponíveis.');
 const selected=topics.filter(t=>interestOptions.includes(t));
 if(selected.length)lines.push(`Gostaria de receber informações sobre:\n${selected.map(t=>`- ${t}`).join('\n')}`);
 if(question.trim())lines.push(`Minha dúvida: ${question.trim()}`);
 lines.push(`Link do veículo: ${new URL(vehiclePath(vehicle),origin).href}`,'Aguardo o retorno de vocês. Obrigado!');
 return lines.join('\n\n');
}
export function whatsappUrl(number,message){const digits=String(number||'').replace(/\D/g,'');return /^\d{10,15}$/.test(digits)?`https://wa.me/${digits}?text=${encodeURIComponent(message)}`:'';}
export function vehicleSEO(v,siteUrl){
 const title=`${v.brand} ${v.model} ${v.version} ${v.year} | Motta Multimarcas`;
 const demo=v.status==='demonstration';
 const description=`${demo?'Veículo demonstrativo: ':''}${vehicleName(v)}, ${v.year}, ${v.km.toLocaleString('pt-BR')} km.${demo?' Dados e disponibilidade a confirmar com a loja.':' Consulte o status e as informações cadastradas na Motta Multimarcas.'}`;
 const url=new URL(vehiclePath(v),siteUrl).href;
 const image=orderedImages(v)[0]?.url;
 const structured={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Início',item:siteUrl},{'@type':'ListItem',position:2,name:'Estoque',item:new URL('/#estoque',siteUrl).href},{'@type':'ListItem',position:3,name:`${v.brand} ${v.model}`,item:url}]};
 return {title,description,url,image:image?new URL(image,siteUrl).href:'',structured};
}
