import {test,expect} from '@playwright/test';

const vehicle={id:'20000000-0000-4000-8000-000000000001',data:{id:'20000000-0000-4000-8000-000000000001',brand:'Marca do teste',model:'Modelo do teste',version:'Versão',year:2024,price:89900,status:'available',images:[]}};
async function mockPublic(page,{enabled=true,fail=false}={}){
 const submissions=[];
 await page.route('https://viacep.com.br/ws/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({logradouro:'Rua de Teste',bairro:'Centro',localidade:'Alvorada',uf:'RS'})}));
 await page.route('**/src/lib/supabase.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/const url\s*=.*?;/,"const url='https://financing-test.supabase.co';").replace(/const key\s*=.*?;/,"const key='sb_publishable_test';")});});
 await page.route('https://financing-test.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url());const send=(data,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'},contentType:'application/json',body:JSON.stringify(data)});
  if(request.method()==='OPTIONS')return send({});
  if(url.pathname.includes('motta_financing_settings'))return send({id:1,enabled,legal_validated:enabled,notice_version:'test-approved',notice_text:'Aviso exclusivamente de teste automatizado para a finalidade de solicitação de financiamento. Não corresponde a uma política real de produção.',policy_url:'https://example.invalid/privacy',extra_fields:[]});
  if(url.pathname.includes('motta_catalog'))return send([vehicle]);
  if(url.pathname.includes('/functions/v1/motta-financing')){if(request.method()==='GET')return send({nonce:crypto.randomUUID(),signature:'test',issued_at:Date.now()-3000});submissions.push(request.postDataJSON());if(fail)return send({error:'Falha de conexão simulada. Tente novamente.'},503);return send({protocol:'MOT-0123456789ABCDEF0123'},201);}
  return send([]);
 });return submissions;
}
async function fillPersonal(page){
 await page.getByLabel('Nome completo',{exact:true}).fill('Pessoa do Teste');await page.getByLabel('CPF',{exact:true}).fill('52998224725');await page.getByLabel('Data de nascimento',{exact:true}).fill('1990-01-01');await page.getByLabel('WhatsApp com DDD',{exact:true}).fill('51999999999');await page.getByRole('button',{name:'Continuar',exact:true}).click();
}
async function fillApplication(page){
 await fillPersonal(page);
 await page.getByLabel('CEP',{exact:true}).fill('94810000');await expect(page.getByLabel('Cidade',{exact:true})).toHaveValue('Alvorada');await page.getByLabel('Número',{exact:true}).fill('123');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByLabel('Situação profissional',{exact:true}).selectOption('public_servant');await page.getByLabel('Profissão',{exact:true}).fill('Analista');await page.getByLabel('Renda mensal aproximada (R$)',{exact:true}).fill('500000');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByLabel('Entrada pretendida (R$) (opcional)',{exact:true}).fill('1200000');await page.getByLabel('Parcelas desejadas (opcional)',{exact:true}).selectOption('36');
}

test('public application retains steps, links vehicle and confirms only after submission',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));const submissions=await mockPublic(page);await page.goto('/simular-financiamento?veiculo='+vehicle.id);await expect(page.locator('.fp-vehicle')).toContainText(vehicle.data.model);await page.screenshot({path:'artifacts/financing-form-fixture-step1.png',fullPage:true});await fillApplication(page);await expect(page.getByLabel('Veículo de interesse',{exact:true})).toHaveValue(vehicle.id);await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/financing-form-fixture-mobile-review.png',fullPage:true});await page.setViewportSize({width:1280,height:900});
 await page.getByRole('button',{name:'Voltar',exact:true}).click();await page.getByRole('button',{name:'Voltar',exact:true}).click();await page.getByRole('button',{name:'Voltar',exact:true}).click();await expect(page.getByLabel('Nome completo',{exact:true})).toHaveValue('Pessoa do Teste');await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByLabel('CEP',{exact:true})).toHaveValue('94810-000');await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByLabel('Renda mensal aproximada (R$)',{exact:true})).toHaveValue(/5.000,00/);await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.locator('[name=privacy_acknowledged]')).not.toBeChecked();await page.locator('[name=privacy_acknowledged]').check();await page.getByRole('button',{name:'Enviar minha ficha',exact:true}).click();await expect(page.getByRole('heading',{name:'Ficha enviada com sucesso!'})).toBeVisible();await expect(page.locator('.fp-protocol')).toContainText('MOT-0123456789ABCDEF0123');expect(submissions).toHaveLength(1);expect(submissions[0].application.vehicle_id).toBe(vehicle.id);expect(submissions[0].application.full_address).toBe('Rua de Teste, 123, Centro, Alvorada / RS, CEP 94810-000');expect(submissions[0].application).not.toHaveProperty('price');expect(submissions[0].privacy_notice_version).toBe('test-approved');expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toMatch(/52998224725|test@example.invalid|Pessoa do Teste/);await expect(page.locator('#fp-content')).not.toContainText('52998224725');expect(errors).toEqual([]);
});

test('postal lookup failure permits manual address and required fields block progression',async({page})=>{
 await mockPublic(page);await page.route('https://viacep.com.br/ws/**',route=>route.fulfill({contentType:'application/json',body:'{"erro":true}'}));await page.goto('/simular-financiamento');await fillPersonal(page);await expect(page.locator('.fp-progress li')).toHaveCount(4);await page.getByLabel('CEP',{exact:true}).fill('99999999');await expect(page.locator('[data-cep-status]')).toContainText('CEP não encontrado');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:'Seu endereço',exact:true})).toBeVisible();await page.getByLabel('Endereço / rua',{exact:true}).fill('Estrada do Teste');await page.getByLabel('Número',{exact:true}).fill('S/N');await page.getByLabel('Bairro',{exact:true}).fill('Zona Rural');await page.getByLabel('Cidade',{exact:true}).fill('Alvorada');await page.getByLabel('Estado',{exact:true}).selectOption('RS');await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:'Sua profissão',exact:true})).toBeVisible();
});

test('postal lookup ignores stale responses and address step remains responsive',async({page})=>{
 await mockPublic(page);let release;const pending=new Promise(resolve=>release=resolve);await page.route('https://viacep.com.br/ws/**',async route=>{if(route.request().url().includes('94810000')){await pending;await route.fulfill({contentType:'application/json',body:JSON.stringify({logradouro:'Rua antiga',bairro:'Antigo',localidade:'Cidade antiga',uf:'RS'})}).catch(()=>{});}else await route.fulfill({contentType:'application/json',body:JSON.stringify({logradouro:'Rua nova',bairro:'Novo',localidade:'Cidade nova',uf:'SC'})});});await page.goto('/simular-financiamento');await fillPersonal(page);await page.getByLabel('CEP',{exact:true}).fill('94810000');await expect(page.locator('[data-cep-status]')).toContainText('Buscando');await page.getByLabel('CEP',{exact:true}).fill('88010000');await expect(page.getByLabel('Cidade',{exact:true})).toHaveValue('Cidade nova');release();await expect(page.getByLabel('Endereço / rua',{exact:true})).toHaveValue('Rua nova');for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.screenshot({path:'artifacts/financing-address-step.png',fullPage:true});
});

test('disabled public collection displays contact and collects no personal fields',async({page})=>{
 const submissions=await mockPublic(page,{enabled:false});await page.goto('/simular-financiamento');await expect(page.getByText('A simulação pelo site está temporariamente indisponível.',{exact:false})).toBeVisible();await expect(page.locator('input')).toHaveCount(0);expect(submissions).toHaveLength(0);
});

test('failed send preserves the review and retry uses the same idempotency identifier',async({page})=>{
 const submissions=await mockPublic(page,{fail:true});await page.goto('/simular-financiamento');await fillApplication(page);await page.locator('[name=privacy_acknowledged]').check();await page.getByRole('button',{name:'Enviar minha ficha',exact:true}).click();await expect(page.locator('.fp-error')).toContainText('Falha de conexão');await expect(page.getByRole('heading',{name:'Ficha enviada com sucesso!'})).toHaveCount(0);await page.getByRole('button',{name:'Enviar minha ficha',exact:true}).click();await expect.poll(()=>submissions.length).toBe(2);expect(submissions[0].idempotency_key).toBe(submissions[1].idempotency_key);
});

test('invalid CPF is blocked and mobile form has no horizontal overflow',async({page})=>{
 await mockPublic(page);await page.setViewportSize({width:390,height:844});await page.goto('/simular-financiamento');await page.getByLabel('Nome completo',{exact:true}).fill('Pessoa do Teste');await page.getByLabel('CPF',{exact:true}).fill('11111111111');await page.getByLabel('Data de nascimento',{exact:true}).fill('1990-01-01');await page.getByLabel('WhatsApp com DDD',{exact:true}).fill('51999999999');await page.getByLabel('E-mail (opcional)',{exact:true}).fill('test@example.invalid');await page.getByRole('button',{name:'Continuar',exact:true}).click();expect(await page.getByLabel('CPF',{exact:true}).evaluate(input=>input.validity.customError)).toBe(true);for(const width of [390,320,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
