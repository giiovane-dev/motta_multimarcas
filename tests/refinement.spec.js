import {test,expect} from './fixtures/public.js';

test('menu, navegação e indicadores refletem o estado real',async({page})=>{
 await page.setViewportSize({width:375,height:850});await page.goto('/');
 await page.getByRole('button',{name:'Abrir menu'}).click();
 await expect(page.getByRole('button',{name:'Fechar menu'})).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');await expect(page.locator('#mobile-nav')).toBeHidden();
 await expect(page.getByRole('button',{name:'Abrir menu'})).toBeFocused();
 await page.setViewportSize({width:1024,height:850});
 await page.locator('#estoque').scrollIntoViewIfNeeded();
 await expect(page.locator('.vehicle-track')).toHaveCSS('display','grid');
 await expect(page.locator('.carousel-arrow,.carousel-dots')).toHaveCount(0);
 await expect(page.locator('.catalog-top')).toBeVisible();
});

test('movimento curto e redução de movimento preservam o banner',async({page})=>{
 await page.goto('/');
 const duration=await page.locator('.hero h1').evaluate(el=>getComputedStyle(el).animationDuration);
 expect(parseFloat(duration)).toBeLessThanOrEqual(.6);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('.hero h1')).toHaveCSS('animation-name','none');
 await expect(page.locator('.financing')).toHaveCSS('opacity','1');
 const transform=await page.locator('.financing').evaluate(el=>getComputedStyle(el).transform);
 expect(transform).not.toBe('none');
});
