import {test,expect} from './fixtures/public.js';
test('homepage, filtros, detalhes, favoritos e interesse',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.open=(url)=>{window.__openedUrl=url;return null;};});
 await page.setViewportSize({width:1280,height:900});await page.goto('/');
 await expect(page.locator('.vehicle-card')).toHaveCount(4);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
 await page.locator('[name=brand]').selectOption('Jeep');await expect(page.locator('[name=model] option')).toHaveCount(2);
 await page.getByRole('button',{name:'Buscar Veículos'}).click();await expect(page.locator('.vehicle-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Favoritar Jeep Compass'}).click();await expect(page.getByRole('button',{name:'Favoritar Jeep Compass'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('link',{name:'Ver Detalhes',exact:true}).click();await expect(page.locator('.vehicle-heading h1')).toHaveText('Jeep Compass');await page.getByRole('button',{name:'Tenho interesse neste veículo'}).click();
 await page.locator('[name=customerName]').fill('Teste');await page.getByRole('button',{name:'Enviar pelo WhatsApp',exact:true}).click();
 expect(await page.evaluate(()=>window.__openedUrl)).toContain('https://wa.me/555192192120?text=');await page.keyboard.press('Escape');await page.goto('/');
 await expect(page.getByRole('link',{name:'Ver todo o estoque'})).not.toHaveAttribute('target','_blank');await page.locator('[name=brand]').selectOption('Jeep');await page.locator('[name=price]').selectOption('80000-100000');await page.getByRole('button',{name:'Buscar Veículos'}).click();await expect(page.locator('.empty')).toBeVisible();await page.getByRole('button',{name:'Limpar filtros'}).click();
 for(const width of [768,390]){await page.setViewportSize({width,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'Abrir menu'}).click();await expect(page.locator('#mobile-nav')).toBeVisible();await page.locator('#mobile-nav a[href="#estoque"]').click();await expect(page.locator('#mobile-nav')).toBeHidden();
 await page.locator('.vehicle-track').evaluate(el=>el.scrollTop=el.scrollHeight);await expect.poll(()=>page.locator('.vehicle-track').evaluate(el=>el.scrollTop)).toBeGreaterThan(100);
 await page.locator('.catalog-top').click();await expect.poll(()=>page.locator('.vehicle-track').evaluate(el=>el.scrollTop)).toBe(0);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'artifacts/mobile.png',fullPage:true});expect(errors).toEqual([]);
});
