import {test,expect} from './fixtures/public.js';

async function revealPage(page){
 await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}});
 await page.waitForTimeout(900);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);
}

test('seções reais, estados pendentes, mapa e responsividade',async({page})=>{
 test.setTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#localizacao')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const sections=await page.locator('main>section').evaluateAll(items=>items.map(el=>el.id||el.className));
 expect(sections.slice(-3)).toEqual(['financiamento','avaliacoes','localizacao']);
 await expect(page.locator('.reviews-state')).toContainText('diretamente no Google');
 await expect(page.locator('.review-card,.review-average')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Ver avaliações no Google'})).toHaveAttribute('href','https://share.google/lDWCloKYnLug6sWQN');
 await expect(page.getByRole('link',{name:'Como chegar'})).toHaveAttribute('href',/destination=R\./);
 const map=page.locator('.map-panel iframe');await expect(map).toHaveAttribute('loading','lazy');
 const mapUrl=new URL(await map.getAttribute('src'));expect(mapUrl.searchParams.get('q')).toBe('R. Tibúrcio de Azevedo, 493 - Americana, Alvorada - RS, 94820-480');expect(mapUrl.searchParams.get('output')).toBe('embed');
 await page.locator('.hero-actions').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
 const initialCard=await page.locator('.vehicle-card').first().boundingBox();
 await page.locator('.vehicle-card').first().hover();await page.waitForTimeout(400);
 const hoveredCard=await page.locator('.vehicle-card').first().boundingBox();expect(hoveredCard.width).toBeCloseTo(initialCard.width);expect(hoveredCard.height).toBeCloseTo(initialCard.height);
 await page.locator('.map-panel').scrollIntoViewIfNeeded();
 // O endereço é desenhado pelo Google no mapa, não exposto como texto DOM.
 // A atribuição nativa confirma o carregamento; o endereço é conferido na captura.
 await expect(page.frameLocator('.map-panel iframe').getByText(/Dados cartográficos/).first()).toBeVisible({timeout:25000});
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:900});await revealPage(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(map).toBeVisible();await expect(page.locator('.map-panel')).toHaveCSS('overflow','visible');
  await page.screenshot({path:`artifacts/premium-${width}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});

test('redução de movimento mantém todo conteúdo visível e sem animações',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
 const state=await page.locator('.hero h1').evaluate(el=>({animation:getComputedStyle(el).animationName,opacity:getComputedStyle(el).opacity}));
 expect(state).toEqual({animation:'none',opacity:'1'});
 await expect(page.locator('.location-info')).toHaveCSS('opacity','1');
});

// Dados exclusivamente sintéticos e interceptados pelo Playwright; nunca publicados.
async function useTestEndpoint(page){
 await page.route('**/src/data.js*',async route=>{
  const response=await route.fetch();const body=(await response.text()).replace(/reviewsEndpoint:\s*['"]['"]/,"reviewsEndpoint: '/api/test-reviews'");
  await route.fulfill({response,body});
 });
}
test('integração preparada: carregamento, atribuição e carrossel por teclado',async({page})=>{
 await useTestEndpoint(page);let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 await page.route('**/api/test-reviews',async route=>{await pending;await route.fulfill({json:{rating:4,userRatingCount:5,reviews:Array.from({length:5},(_,i)=>({authorAttribution:{displayName:`Fixture de teste ${i+1}`,uri:'https://example.com/test'},rating:4,text:{text:'Conteúdo sintético exclusivo do teste automatizado.'},publishTime:'2026-01-01T00:00:00Z',googleMapsUri:'https://example.com/test-review'}))}});});
 await page.setViewportSize({width:375,height:900});await page.goto('/');
 await expect(page.locator('.reviews-content')).toHaveAttribute('aria-busy','true');await expect(page.locator('.reviews-state')).toContainText('Carregando');finish();
 await expect(page.locator('.review-card')).toHaveCount(5);await expect(page.locator('.review-average')).toHaveText('4');
 await page.locator('.reviews-track').focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>page.locator('.reviews-track').evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
 await page.getByRole('button',{name:'Avaliações anteriores'}).click();await expect.poll(()=>page.locator('.reviews-track').evaluate(el=>el.scrollLeft)).toBe(0);
 await expect(page.locator('.review-origin').first()).toContainText('Google Maps');await expect(page.locator('.reviews-policy')).toContainText('relevância');
 for(const width of [768,1024,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('falha da integração não mostra avaliações inventadas',async({page})=>{
 await useTestEndpoint(page);await page.route('**/api/test-reviews',route=>route.fulfill({status:503,body:'indisponível'}));
 await page.goto('/');await expect(page.locator('.reviews-state')).toContainText('indisponíveis no momento');await expect(page.locator('.review-card,.review-average')).toHaveCount(0);await expect(page.locator('.reviews-content')).toHaveAttribute('aria-busy','false');
});
