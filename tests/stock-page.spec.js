import {test,expect} from './fixtures/public.js';

test('stock page lists all cars and combines price ranges with brand',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 const link=page.locator('a.all-stock');
 await expect(link).toHaveAttribute('href','/estoque');
 await expect(link).not.toHaveAttribute('target','_blank');
 await page.goto('/estoque');
 await expect(page.locator('h1')).toHaveText('Nosso estoque');
 await expect(page.locator('#inicio,#financiamento,#vendidos')).toHaveCount(0);
 await expect(page.locator('.vehicle-card')).toHaveCount(4);
 await page.locator('[name=price]').selectOption('50000-80000');
 await page.locator('#search button').click();
 await expect(page.locator('.vehicle-card')).toHaveCount(1);
 await expect(page.locator('.vehicle-card')).toContainText('Onix');
 await page.locator('[name=price]').selectOption('100000-150000');
 await page.locator('#search button').click();
 await expect(page.locator('.vehicle-card')).toHaveCount(1);
 await expect(page.locator('.vehicle-card')).toContainText('Corolla');
 await page.locator('[name=brand]').selectOption('Jeep');
 await page.locator('#search button').click();
 await expect(page.locator('.empty')).toBeVisible();
 await page.locator('button.all-stock').click();
 await expect(page.locator('.vehicle-card')).toHaveCount(4);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.vehicle-track').evaluate(el=>getComputedStyle(el).display)).toBe('grid');
 }
 await page.screenshot({path:'artifacts/stock-page-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
});
