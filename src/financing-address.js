// Only the postal code is sent to ViaCEP; personal application data stays local.
export function bindPostalCode(form){
 const input=form.elements.postal_code;if(!input)return;
 const status=form.querySelector('[data-cep-status]'),button=form.querySelector('[data-lookup-cep]');
 let timer,controller,last='',autofilled={};
 const digits=()=>input.value.replace(/\D/g,'');
 async function lookup(force=false){
  const cep=digits();if(!/^\d{8}$/.test(cep)){status.textContent='Informe os 8 dígitos do CEP.';return;}
  if(cep===last&&!force)return;last=cep;controller?.abort();controller=new AbortController();const current=controller;
  status.textContent='Buscando endereço…';button.disabled=true;
  const before=Object.fromEntries(['street','neighborhood','city','state'].map(key=>[key,form.elements[key].value]));
  const timeout=setTimeout(()=>current.abort(),8000);
  try{
   const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:current.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw Error();const result=await response.json();if(result.erro)throw Error('not_found');
   if(!form.isConnected||digits()!==cep)return;
   for(const [key,value] of Object.entries({street:result.logradouro,neighborhood:result.bairro,city:result.localidade,state:result.uf})){
    const field=form.elements[key];if(typeof value==='string'&&value&&field.value===before[key]){field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));autofilled[key]=value;}
   }
   status.textContent='Endereço localizado. Confira os dados e informe o número e o complemento, se houver.';
  }catch(error){if(form.isConnected&&digits()===cep&&controller===current){last='';status.textContent=error.message==='not_found'?'CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.':'Não foi possível consultar o CEP. Preencha o endereço manualmente ou tente novamente.';}}
  finally{clearTimeout(timeout);if(controller===current)button.disabled=false;}
 }
 input.inputMode='numeric';input.autocomplete='postal-code';input.maxLength=9;
 input.addEventListener('input',()=>{controller?.abort();last='';clearTimeout(timer);const cep=digits().slice(0,8);input.value=cep.replace(/^(\d{5})(\d)/,'$1-$2');status.textContent='';for(const [key,value] of Object.entries(autofilled)){if(form.elements[key].value===value){form.elements[key].value='';form.elements[key].setCustomValidity('');}}autofilled={};if(cep.length===8)timer=setTimeout(()=>lookup(),300);});
 input.addEventListener('blur',()=>{clearTimeout(timer);if(digits().length===8)lookup();});button.onclick=()=>{clearTimeout(timer);lookup(true);};
 for(const [key,autocomplete] of Object.entries({street:'address-line1',address_number:'off',address_complement:'address-line2',neighborhood:'address-level3',city:'address-level2',state:'address-level1'}))form.elements[key].autocomplete=autocomplete;
}
