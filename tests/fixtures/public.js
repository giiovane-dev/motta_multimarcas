import {test as base,expect} from '@playwright/test';
import {vehicles} from './catalog.js';
export const test=base.extend({page:async({page},use)=>{
 // Public UI fixtures must not be overwritten by the configured production DB.
 await page.route('**/src/lib/supabase.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/const url\s*=.*?;/,"const url = '';").replace(/const key\s*=.*?;/,"const key = '';")});});
 await page.route('**/src/data.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`\nvehicles.push(...${JSON.stringify(vehicles)});`});});
 await use(page);
}});
export {expect};
