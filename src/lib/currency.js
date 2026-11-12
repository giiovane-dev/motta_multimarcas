const reais=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});

// Supabase numeric columns may arrive as numbers or decimal strings.
export function formatBRL(value){
 if(value===null||value===undefined||value===''||typeof value==='boolean')return '';
 const amount=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
 return Number.isFinite(amount)?reais.format(amount):'';
}
