import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const phase=process.argv[2]||'after';
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const measurements=[];
await page.goto('http://127.0.0.1:5173/');
for(const width of [1199,375,768,1024,1440]){
 await page.setViewportSize({width,height:900});
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 if(phase==='after'){
  await page.locator('.map-panel').scrollIntoViewIfNeeded();
  try{
   await page.frameLocator('.map-panel iframe').getByText(/Dados cartográficos/).first().waitFor({timeout:20000});
   await page.waitForTimeout(1500);
   await page.locator('.location-grid').screenshot({path:`artifacts/refinement-map-${width}.png`});
  }catch{console.log(`Mapa ${width}px: carregamento externo não concluído na captura.`);}
 }
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`artifacts/refinement-${phase}-${width}.png`,fullPage:true});
 measurements.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),sections:await page.locator('header,main>section,footer').evaluateAll(els=>els.map(el=>({section:el.id||el.className||el.tagName,top:Math.round(el.getBoundingClientRect().top),height:Math.round(el.getBoundingClientRect().height)})))});
}
await fs.writeFile(`artifacts/refinement-${phase}.json`,JSON.stringify({measurements,errors},null,2));
console.log(JSON.stringify({phase,viewports:measurements.map(m=>({width:m.width,overflow:m.overflow})),errors}));
await browser.close();
