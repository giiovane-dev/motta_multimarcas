import {test,expect} from './fixtures/public.js';
import {vehicles} from './fixtures/catalog.js';
import {buildInterestMessage,whatsappUrl,vehiclePath} from '../src/vehicle-model.js';

test('cada card abre a rota, foto e SEO do veículo correto',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const v of vehicles){
  await page.goto('/');await page.locator(`.vehicle-card a[href="${vehiclePath(v)}"]`).first().click();
  await expect(page.locator('.vehicle-heading h1')).toHaveText(`${v.brand} ${v.model}`);
  await expect(page.locator('.gallery-main-image')).toHaveAttribute('src',`/img/${v.image}`);
  await expect(page).toHaveTitle(new RegExp(`${v.brand} ${v.model}`));
  await expect(page.locator('.gallery-thumbnails button')).toHaveCount(1);
  await expect(page.locator('.gallery-prev')).toBeDisabled();await expect(page.locator('.gallery-next')).toBeDisabled();
  await page.getByRole('button',{name:'Interior',exact:true}).click();await expect(page.locator('.gallery-empty')).toContainText('Interior');await expect(page.locator('.gallery-open')).toBeHidden();
  await page.getByRole('button',{name:'Exterior',exact:true}).click();await expect(page.locator('.gallery-open')).toBeVisible();
  await page.locator('.gallery-open').click();await expect(page.locator('.vehicle-lightbox')).toBeVisible();await expect(page.locator('.vehicle-lightbox img')).toHaveAttribute('src',`/img/${v.image}`);await page.keyboard.press('Escape');await expect(page.locator('.vehicle-lightbox')).toBeHidden();
  await page.reload();await expect(page.locator('.vehicle-heading h1')).toHaveText(`${v.brand} ${v.model}`);
 }
 expect(errors).toEqual([]);
});

test('formulário gera mensagem contextual e abre somente após confirmar',async({page})=>{
 await page.addInitScript(()=>{window.__openedUrls=[];window.open=url=>{window.__openedUrls.push(url);return null;};});
 await page.goto(vehiclePath(vehicles[2]));await page.getByRole('button',{name:'Tenho interesse neste veículo'}).click();
 expect(await page.evaluate(()=>window.__openedUrls)).toEqual([]);
 await page.locator('[name=customerName]').fill('Ana & João');await page.getByLabel('Disponibilidade do veículo',{exact:true}).uncheck();await page.getByLabel('Condições de financiamento',{exact:true}).check();await page.getByLabel('Possibilidade de troca',{exact:true}).check();await page.locator('[name=question]').fill('Aceitam meu usado?');
 await page.getByRole('button',{name:'Enviar pelo WhatsApp',exact:true}).click();
 const opened=await page.evaluate(()=>window.__openedUrls);expect(opened).toHaveLength(1);const url=new URL(opened[0]);expect(url.origin+url.pathname).toBe('https://wa.me/555192192120');
 const message=url.searchParams.get('text');expect(message).toContain('Ana & João');expect(message).toContain('Chevrolet Onix 1.0 LTZ');expect(message).toContain('2023');expect(message).toContain('79.900');expect(message).toContain('Condições de financiamento');expect(message).toContain('Possibilidade de troca');expect(message).toContain('Aceitam meu usado?');expect(message).toContain(`http://127.0.0.1:5173${vehiclePath(vehicles[2])}`);expect(message).not.toContain('Jeep');
 await page.keyboard.press('Escape');await expect(page.locator('#vehicle-request')).toBeHidden();await expect(page.getByRole('button',{name:'Tenho interesse neste veículo'})).toBeFocused();
 await page.goto('/');await page.locator('[data-vehicle-consult="polo"]').click();const direct=await page.evaluate(()=>window.__openedUrls[0]);expect(new URL(direct).searchParams.get('text')).toContain('Volkswagen Polo');expect(new URL(direct).searchParams.get('text')).not.toContain('Chevrolet Onix');
});

test('galeria com várias fotos suporta categorias, teclado e toque sem misturar veículos',async({page})=>{
 // Fixtures SVG isoladas do teste, nunca cadastradas/publicadas no estoque.
 const fixture=['exterior','interior','details'].map((category,i)=>({id:`fixture-${i}`,vehicleId:'polo',category,sortOrder:i,isCover:i===0,alt:`Imagem sintética de teste ${category}`,url:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="${['#243030','#302430','#303024'][i]}"/></svg>`)}`}));
 await page.route('**/src/data.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`\nvehicles.push(...${JSON.stringify(vehicles)});`+`\nvehicles[0].images=${JSON.stringify(fixture)};`});});
 await page.goto(vehiclePath(vehicles[0]));await expect(page.locator('.gallery-thumbnails button')).toHaveCount(3);await page.locator('.gallery-next').click();await expect(page.locator('.gallery-count')).toHaveText('2 / 3');
 await page.locator('.gallery-open').click();await page.keyboard.press('ArrowRight');await expect(page.locator('.lightbox-count')).toContainText('3 / 3');await page.keyboard.press('ArrowLeft');await expect(page.locator('.lightbox-count')).toContainText('2 / 3');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Interior',exact:true}).click();await expect(page.locator('.gallery-count')).toHaveText('1 / 1');await expect(page.locator('[data-image="fixture-1"]')).toBeVisible();await expect(page.locator('[data-image="fixture-0"]')).toBeHidden();
 await page.getByRole('button',{name:'Todas as fotos'}).click();
 await page.locator('.gallery-stage').dispatchEvent('pointerdown',{pointerType:'touch',clientX:250,clientY:100});await page.locator('.gallery-stage').dispatchEvent('pointerup',{pointerType:'touch',clientX:100,clientY:110});await expect(page.locator('.gallery-count')).toHaveText('2 / 3');
});

test('página responsiva e telefone ausente não gera link inválido',async({page})=>{
 await page.route('**/src/data.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`\nvehicles.push(...${JSON.stringify(vehicles)});`+'\nbusiness.whatsapp="";'});});
 await page.goto(vehiclePath(vehicles[0]));
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/vehicle-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Tenho interesse neste veículo'}).click();await expect(page.locator('.whatsapp-pending')).toContainText('não foi configurado');await expect(page.getByRole('button',{name:'Enviar pelo WhatsApp',exact:true})).toBeDisabled();
});

test('mensagens sem nome ou dúvida omitem campos vazios',()=>{
 const message=buildInterestMessage(vehicles[0],{},'https://motta-multimarcas.vercel.app');expect(message).not.toContain('Meu nome');expect(message).not.toContain('Minha dúvida');expect(message).toContain('volkswagen-polo-2023');expect(whatsappUrl('',message)).toBe('');
});
