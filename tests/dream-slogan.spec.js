import {test,expect} from './fixtures/public.js';

test('dream slogan preserves placement, exact text, distant logo and responsive composition',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('#motta-dream-slogan')).toHaveCount(1);await expect(page.getByRole('heading',{name:'TUDO COMEÇA COM UM SONHO',exact:true})).toBeVisible();
 expect(await page.locator('#motta-dream-slogan').evaluate(el=>el.nextElementSibling.id)).toBe('financiamento');
 await expect(page.locator('.dream-reminder em')).toHaveText('Lembre-se:');await expect(page.locator('.dream-watermark')).toHaveCSS('opacity','0.03');await expect(page.locator('.dream-watermark')).toHaveCSS('filter','blur(1.5px)');
 await expect(page.locator('.dream-line')).toHaveCount(2);await expect(page.locator('.dream-letter')).toHaveCount(23);
 for(const width of [1920,1440,1024,768,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.dream-heading').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
 expect(await page.locator('.dream-letter').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');expect(errors).toEqual([]);
});

test('dream animation starts on scroll, finishes once and retains subtle opacity',async({page})=>{
 await page.setViewportSize({width:1440,height:800});await page.goto('/');const section=page.locator('#motta-dream-slogan');await expect(section).toHaveClass(/dream-awaiting/);await section.scrollIntoViewIfNeeded();await expect(section).toHaveClass(/dream-visible/);
 await expect(page.locator('.dream-watermark')).toHaveCSS('opacity','0.03');
 await page.locator('.dream-letter').last().evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
 await expect(page.locator('.dream-letter').last()).toHaveCSS('opacity','1');
 await page.locator('.dream-swoosh-shine').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
 const time=await page.locator('.dream-letter').last().evaluate(el=>el.getAnimations()[0].startTime);await page.evaluate(()=>scrollTo(0,0));await section.scrollIntoViewIfNeeded();expect(await page.locator('.dream-letter').last().evaluate(el=>el.getAnimations()[0].startTime)).toBe(time);
 await expect(page.locator('.dream-swoosh-shine')).toHaveCSS('opacity','0');
});

test('slogan remains readable with JavaScript disabled',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:5173/');await expect(page.locator('noscript h2')).toBeVisible();await expect(page.locator('noscript img')).toHaveCSS('opacity','0.03');await context.close();
});
