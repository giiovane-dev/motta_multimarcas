export const employmentOptions={employed:'CLT',self_employed:'Autônomo',business_owner:'Empresário',retired:'Aposentado',public_servant:'Servidor público',unemployed:'Sem atividade no momento',other:'Outro'};
export const bondOptions={clt:'CLT',public_servant:'Servidor público',self_employed:'Autônomo',company:'Sócio/proprietário',retired:'Benefício/aposentadoria',other:'Outro'};
export const durationOptions={under_6:'Menos de 6 meses',months_6_12:'De 6 a 12 meses',years_1_2:'De 1 a 2 anos',over_2:'Mais de 2 anos',not_applicable:'Não se aplica'};
export const incomeOptions={under_2000:'Até R$ 2.000',from_2000_4000:'R$ 2.001 a R$ 4.000',from_4000_7000:'R$ 4.001 a R$ 7.000',from_7000_10000:'R$ 7.001 a R$ 10.000',over_10000:'Acima de R$ 10.000'};
export const states='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
export function validCPF(value){const cpf=String(value||'').replace(/\D/g,'');if(!/^\d{11}$/.test(cpf)||/^(\d)\1{10}$/.test(cpf))return false;for(let size=9;size<=10;size++){let sum=0;for(let i=0;i<size;i++)sum+=Number(cpf[i])*(size+1-i);const digit=(sum*10)%11%10;if(digit!==Number(cpf[size]))return false;}return true;}
export function validateApplication(input,extraFields=[]){
 const errors={},out={};const text=(key,min,max)=>{const value=String(input[key]??'').trim();if(value.length<min||value.length>max)errors[key]='Confira este campo.';out[key]=value;};
 text('applicant_name',5,120);if(out.applicant_name.split(/\s+/).length<2)errors.applicant_name='Informe seu nome completo.';
 out.cpf=String(input.cpf||'').replace(/\D/g,'');if(!validCPF(out.cpf))errors.cpf='Informe um CPF válido.';
 out.birth_date=String(input.birth_date||'');const birth=new Date(out.birth_date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(out.birth_date)||!Number.isFinite(+birth)||birth.toISOString().slice(0,10)!==out.birth_date||out.birth_date<'1900-01-01'||out.birth_date>new Date().toISOString().slice(0,10))errors.birth_date='Informe uma data de nascimento válida.';
 let phone=String(input.phone||'').replace(/\D/g,'');if(phone.length>11&&phone.startsWith('55'))phone=phone.slice(2);if(!/^[1-9]{2}[2-9]\d{7,8}$/.test(phone))errors.phone='Informe DDD e telefone válidos.';out.phone='55'+phone;
 text('email',0,254);out.email=out.email.toLowerCase();if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))errors.email='Informe um e-mail válido ou deixe em branco.';
 text('city',2,100);out.state=String(input.state||'').toUpperCase();if(!states.includes(out.state))errors.state='Selecione um estado.';
 text('full_address',0,500);if(errors.full_address)errors.full_address='Informe um endereço com até 500 caracteres.';
 if(input.address_version===2){
  out.address_version=2;out.postal_code=String(input.postal_code||'').replace(/\D/g,'');if(!/^\d{8}$/.test(out.postal_code))errors.postal_code='Informe um CEP com 8 dígitos.';
  text('street',2,150);text('address_number',1,20);text('neighborhood',2,100);text('address_complement',0,100);
  out.full_address=[out.street,out.address_number,out.address_complement,out.neighborhood,`${out.city} / ${out.state}`,`CEP ${out.postal_code.replace(/^(\d{5})(\d{3})$/,'$1-$2')}`].filter(Boolean).join(', ');
 }
 for(const [key,options] of [['employment_type',employmentOptions],['employment_bond',bondOptions],['employment_duration',durationOptions],['income_range',incomeOptions]]){out[key]=String(input[key]||'');if((key==='employment_type'||out[key])&&!Object.hasOwn(options,out[key]))errors[key]='Selecione uma opção.';}
 if(input.monthly_income!==undefined){out.monthly_income=Number(input.monthly_income);if(!Number.isFinite(out.monthly_income)||out.monthly_income<=0||out.monthly_income>999999999)errors.monthly_income='Informe sua renda mensal aproximada.';}else if(!out.income_range)errors.monthly_income='Informe sua renda mensal aproximada.';
 text('occupation',2,100);text('notes',0,1500);
 out.vehicle_id=input.vehicle_id||null;if(out.vehicle_id&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(out.vehicle_id))errors.vehicle_id='Selecione um veículo válido.';
 out.down_payment=Number(input.down_payment??0);if(!Number.isFinite(out.down_payment)||out.down_payment<0||out.down_payment>999999999)errors.down_payment='Informe uma entrada válida.';
 out.desired_term=Number(input.desired_term||0);if(![0,12,24,36,48,60,72].includes(out.desired_term))errors.desired_term='Selecione um prazo.';
 for(const key of ['additional_income','has_trade_in']){out[key]=input[key]===true||input[key]==='true';if(input[key]!==undefined&&![true,false,'true','false'].includes(input[key]))errors[key]='Selecione sim ou não.';}
 out.extra_answers={};for(const field of extraFields){const value=String(input.extra_answers?.[field.id]||'').trim();if(value.length>500||(field.required&&!value))errors['extra_'+field.id]='Confira este campo.';out.extra_answers[field.id]=value;}
 return {data:out,errors,valid:!Object.keys(errors).length};
}
