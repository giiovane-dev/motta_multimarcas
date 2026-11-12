import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url().split('?')[0],r.failure()?.errorText));
page.on('response',r=>{if(r.url().startsWith('https://www.google.com/maps?'))console.log('MAP HTTP',r.status());});
await page.goto('http://127.0.0.1:5173/');await page.locator('.map-panel').scrollIntoViewIfNeeded();
await page.waitForTimeout(12000);
console.log('MAP FRAMES',page.frames().map(f=>f.url().slice(0,200)));
console.log('MAP ATTRIBUTION VISIBLE',await page.frameLocator('.map-panel iframe').getByText(/Dados cartográficos/).first().isVisible());
await page.screenshot({path:'artifacts/map-check.png'});
for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:1000});
 await page.locator('.map-panel').scrollIntoViewIfNeeded();
 await page.waitForTimeout(1200);
 await page.locator('.map-panel').screenshot({path:`artifacts/map-${width}.png`});
}
await browser.close();
