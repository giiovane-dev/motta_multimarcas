import {test,expect} from '@playwright/test';
import {vehicles as catalog} from './fixtures/catalog.js';
import {readFile} from 'node:fs/promises';

const user={id:'10000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'test@example.invalid',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
const profile={id:user.id,full_name:'Administrador · teste isolado',role:'admin',active:true};
const stock=catalog.map((v,i)=>({id:`20000000-0000-4000-8000-00000000000${i+1}`,internal_code:`TEST-${i+1}`,brand:v.brand,model:v.model,version:v.version,model_year:v.year,manufacture_year:v.year,mileage:v.km,asking_price:v.price,slug:v.slug,entry_date:'2026-11-01',commercial_status:i===1?'negotiating':'available',operational_status:'ready',publication_status:'draft',features:[],description:'',created_at:'2026-11-01T12:00:00Z',updated_at:'2026-11-01T12:00:00Z',responsible_id:user.id,archived_at:null}));
async function mockBackend(page,{role='admin',denied=false,session=true}={}){
 const records={vehicles:structuredClone(stock),profiles:[{...profile,role}],customers:[],negotiations:[],vehicle_tasks:[],vehicle_movements:[],vehicle_documents:[],vehicle_images:[],vehicle_costs:[],sales:[],sale_payments:[],expenses:[],notifications:[],audit_logs:[],dealership_settings:[{id:1,business_name:'Motta Multimarcas',whatsapp:'',phone:'',address:'',opening_hours:'',logo_url:'/img/07_logotipo_motta_mockup.png',socials:{},preferences:{},show_sold:false}]};
 records.training_videos=[];
 const commands=[];
 records.catalog=[];records.public_settings=[];
 records.vehicles.forEach((v,i)=>{const img={id:`photo-${i}`,vehicle_id:v.id,storage_path:`${v.id}/${catalog[i].image}`,is_cover:true,sort_order:0,category:'exterior',alt_text:v.model,deleted_at:null,created_at:v.created_at};records.vehicle_images.push(img);v.images=[img];});
 const token=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:'30000000-0000-4000-8000-000000000001',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})).toString('base64url')}.test-signature`;
 const authSession={access_token:token,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'test-refresh',user};
 if(session)await page.addInitScript(value=>localStorage.setItem('sb-motta-test-auth-token',JSON.stringify(value)),authSession);
 await page.route('**/src/lib/supabase.js*',async route=>{const r=await route.fetch();let s=await r.text();s=s.replace('const url = import.meta.env?.VITE_SUPABASE_URL;',`const url = 'https://motta-test.supabase.co';`).replace('const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;',`const key = 'sb_publishable_test';`);
 // Vite preserves compact source on some versions.
 s=s.replace('const url=import.meta.env?.VITE_SUPABASE_URL;',`const url='https://motta-test.supabase.co';`).replace('const key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;',`const key='sb_publishable_test';`);
 await route.fulfill({response:r,body:s});});
 await page.route('https://motta-test.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());const send=(data,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range',...headers},body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return send({});
 if(url.pathname.includes('/auth/v1/user'))return send(user);
 if(url.pathname.includes('/auth/v1/token'))return send(authSession);
 if(url.pathname.includes('/auth/v1/logout')||url.pathname.includes('/auth/v1/recover'))return send({});
 if(url.pathname.includes('/functions/v1/motta-upload')){const form=await new Request(req.url(),{method:'POST',headers:{'content-type':req.headers()['content-type']},body:req.postDataBuffer()}).formData();return send({path:`${form.get('vehicle_id')||form.get('customer_id')}/${crypto.randomUUID()}.${form.get('kind')==='document'?'pdf':'webp'}`});}
 if(url.pathname.includes('/storage/v1/object/public/')){const name=url.pathname.split('/').at(-1);try{return route.fulfill({contentType:'image/png',body:await readFile(new URL(`../public/img/${name}`,import.meta.url))});}catch{return route.fulfill({contentType:'image/png',body:await readFile(new URL('../public/img/02_veiculo_volkswagen_polo.png',import.meta.url))});}}
 if(url.pathname.includes('/storage/v1/object/sign/'))return send({signedURL:'/object/sign/vehicle-private-documents/test.pdf?token=test-only'});
 if(url.pathname.includes('/rpc/motta_dashboard'))return send({available:records.vehicles.filter(v=>v.commercial_status==='available').length,negotiating:1,sold:0,entries:records.vehicles.length,history:Array.from({length:6},(_,i)=>({month:`2026-${String(i+6).padStart(2,'0')}-01`,entries:i===5?records.vehicles.length:0,sales:0,stock:i===5?records.vehicles.length:0})),events:[],tasks:records.vehicle_tasks});
 if(url.pathname.includes('/rpc/motta_report'))return send({registered:records.vehicles.length,available:3,sold:records.sales.length,entries:4,exits:0,asking_total:479600,sales_total:0,recorded_costs:0,estimated_margin:0,received:0,avg_days:null,sales_without_cost:0,negotiations:[]});
 if(url.pathname.includes('/rpc/motta_command')){const {action,payload}=req.postDataJSON();commands.push({action,payload});
 if(action==='vehicle_save'){const old=records.vehicles.find(v=>v.id===payload.id);const result={...payload,id:old?.id||crypto.randomUUID(),updated_at:new Date().toISOString(),created_at:old?.created_at||new Date().toISOString(),commercial_status:'available',publication_status:'draft'};if(old)Object.assign(old,result);else records.vehicles.push(result);return send(result);}
 if(action==='customer_save'){const row={...payload,id:payload.id||crypto.randomUUID(),created_at:new Date().toISOString()};const old=records.customers.find(c=>c.id===row.id);if(old)Object.assign(old,row);else records.customers.push(row);return send(row);}
 if(action==='vehicle_publish'){records.vehicles.find(v=>v.id===payload.id).publication_status='published';return send({id:payload.id});}
 if(action==='sale_register'){const row={...payload,id:crypto.randomUUID(),payment_status:'pending',delivery_status:'pending',created_at:new Date().toISOString()};records.sales.push(row);records.vehicles.find(v=>v.id===payload.vehicle_id).commercial_status='sold';return send(row);}
 if(action==='task_toggle'){const row=records.vehicle_tasks.find(t=>t.id===payload.id);if(row)row.status='done';return send(row||{});}
 if(action==='image_save'){const old=records.vehicle_images.find(i=>i.id===payload.id);if(payload.is_cover)records.vehicle_images.filter(i=>i.vehicle_id===payload.vehicle_id).forEach(i=>i.is_cover=false);const row={...payload,id:old?.id||crypto.randomUUID(),created_at:old?.created_at||new Date().toISOString(),deleted_at:null};if(old)Object.assign(old,row);else records.vehicle_images.push(row);return send(row);}
 if(action==='image_delete'){records.vehicle_images.find(i=>i.id===payload.id).deleted_at=new Date().toISOString();return send({});}
 if(action==='document_save'){const row={...payload,id:crypto.randomUUID(),created_at:new Date().toISOString(),deleted_at:null};records.vehicle_documents.push(row);return send(row);}
 if(action==='document_access')return send(records.vehicle_documents.find(i=>i.id===payload.id));
 return send({});}
 const table=url.pathname.split('/').at(-1).replace('motta_','');let rows=records[table]||[];
 if(table==='training_videos'&&['POST','PATCH','DELETE'].includes(req.method())){
  const id=url.searchParams.get('id')?.slice(3);
  if(req.method()==='POST')records.training_videos.push({...req.postDataJSON(),id:crypto.randomUUID(),created_at:new Date().toISOString()});
  if(req.method()==='PATCH')Object.assign(records.training_videos.find(row=>row.id===id),req.postDataJSON());
  if(req.method()==='DELETE')records.training_videos=records.training_videos.filter(row=>row.id!==id);
  return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}});
 }
 if(table==='profiles'&&denied)rows=[];
 for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))rows=rows.filter(row=>String(key==='data->>status'?row.data?.status:row[key])===value.slice(3));if(value.startsWith('ilike.')){const term=value.slice(6).replaceAll('%','').toLowerCase();rows=rows.filter(row=>String(key==='search_text'?`${row.brand} ${row.model} ${row.internal_code}`:row[key]).toLowerCase().includes(term));}}
 const accept=req.headers().accept||'';return send(accept.includes('vnd.pgrst.object+json')?rows[0]||null:rows,200,{'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`});
 });return {records,commands};
}

test('admin without Supabase is closed; public catalog contains no demo stock',async({page})=>{
 await page.route('**/src/lib/supabase.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/const url\s*=.*?;/,"const url = '';").replace(/const key\s*=.*?;/,"const key = '';")});});
 await page.goto('/admin');await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();await expect(page.getByRole('button',{name:'Entrar no painel'})).toBeDisabled();await expect(page.locator('.admin-sidebar')).toHaveCount(0);
 await page.screenshot({path:'artifacts/admin-login-local.png',fullPage:true});await page.goto('/');await expect(page.locator('#estoque')).toBeVisible();await expect(page.locator('.vehicle-card')).toHaveCount(0);
});
test('login, authorization, logout and recovery flow use Auth',async({page})=>{
 await mockBackend(page,{session:false});await page.goto('/admin');await page.getByLabel('E-mail',{exact:true}).fill('test@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('Password-only-for-test');await page.getByRole('button',{name:'Entrar no painel'}).click();await expect(page.locator('.admin-sidebar')).toBeVisible();await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.locator('#login-form')).toBeVisible();
 await page.getByLabel('E-mail',{exact:true}).fill('test@example.invalid');await page.getByRole('button',{name:'Esqueceu sua senha?'}).click();await expect(page.locator('#admin-toast')).toContainText('link de recuperação');
});
test('authenticated account without authorized profile cannot access dashboard',async({page})=>{await mockBackend(page,{denied:true});await page.goto('/admin');await expect(page.getByText('Sua conta não tem acesso autorizado',{exact:false})).toBeVisible();await expect(page.locator('.admin-sidebar')).toHaveCount(0);});
test('dashboard, all permitted routes, global search and responsive layout',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));await mockBackend(page);await page.setViewportSize({width:1672,height:941});await page.goto('/admin');await expect(page.locator('.dashboard-stats')).toBeVisible();await expect(page.locator('.stat-card').first()).toContainText('3');
 await page.screenshot({path:'artifacts/admin-dashboard-fixture-desktop.png',fullPage:true});
 for(const route of ['vehicles','movements','sold','documents','customers','negotiations','tasks','settings']){await page.locator(`[data-route=${route}]`).click();await expect(page.locator('#admin-content')).toHaveAttribute('aria-busy','false');await expect(page.locator('.error-state')).toHaveCount(0);}
 await page.locator('#global-search').fill('Polo');await expect(page.locator('.global-results')).toContainText('Volkswagen Polo');await page.locator('[data-result]').first().click();await expect(page.locator('#admin-dialog')).toContainText('TEST-1');await page.keyboard.press('Escape');
 await page.locator('[data-route=vehicles]').click();await page.getByRole('button',{name:'Ver em cards'}).click();await expect(page.locator('.inventory-cards article')).toHaveCount(4);await page.locator('[data-route=dashboard]').click();
 for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/admin-dashboard-fixture-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Abrir navegação'}).click();await expect(page.locator('.admin-sidebar')).toHaveClass(/open/);expect(errors).toEqual([]);
});
test('customer edit and simplified vehicle save with finance disabled',async({page})=>{
 const backend=await mockBackend(page);await page.goto('/admin/customers');await page.getByRole('button',{name:'Cadastrar cliente'}).click();await page.getByLabel('Nome',{exact:true}).fill('Cliente do teste de interface');await page.getByLabel('Telefone',{exact:true}).fill('5100000000');await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('.atable')).toContainText('Cliente do teste de interface');
 await page.locator('[data-edit]').first().click();await page.getByLabel('Nome',{exact:true}).fill('Cliente editado');await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('.atable')).toContainText('Cliente editado');
 await page.locator('[data-route=add]').click();await page.getByLabel('Marca',{exact:true}).fill('Marca real informada');await page.getByLabel('Modelo',{exact:true}).fill('Modelo de teste');await page.getByRole('button',{name:'Continuar →'}).click();await page.getByLabel('Preço anunciado (R$)',{exact:true}).fill('90000');await expect(page.locator('[name=acquisition_price],[name=entry_date]')).toHaveCount(0);await page.getByRole('button',{name:'Salvar rascunho'}).click();await expect(page.locator('.wizard-status')).toContainText('Rascunho persistido');await page.keyboard.press('Escape');expect(backend.commands.some(c=>c.action==='vehicle_save')).toBe(true);
 await expect(page.locator('[data-route=finance],[data-route=reports]')).toHaveCount(0);
 await expect(page.locator('[data-route=applications]')).toHaveCount(1);
 const saved=backend.commands.find(c=>c.action==='vehicle_save').payload;
 expect(saved).not.toHaveProperty('acquisition_price');expect(saved.entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 await page.goto('/admin/finance');await expect(page.locator('.dashboard-stats')).toBeVisible();
});
test('training library supports Drive lessons, inline playback and removal',async({page})=>{
 const backend=await mockBackend(page);await page.goto('/admin/training');
 await expect(page.locator('[data-route=training]')).toBeVisible();
 await expect(page.locator('.empty-state')).toContainText('As aulas');
 await page.locator('[data-add-training]').click();
 await page.locator('[name=title]').fill('Como cadastrar um carro');
 await page.locator('[name=drive_url]').fill('https://drive.google.com/drive/folders/invalidFolder');
 await page.locator('#admin-dialog [type=submit]').click();
 await expect(page.locator('#admin-dialog .form-error')).toContainText('não um link de pasta');
 await page.locator('[name=drive_url]').fill('https://drive.google.com/file/d/testDriveVideo12345/view?usp=sharing');
 await page.locator('textarea[name=description]').fill('Aula sobre o cadastro.');
 await page.locator('#admin-dialog [type=submit]').click();
 await expect(page.locator('.training-card')).toHaveCount(1);
 expect(backend.records.training_videos[0].drive_file_id).toBe('testDriveVideo12345');
 await page.route('https://drive.google.com/file/d/*/preview',r=>r.fulfill({contentType:'text/html',body:'<p>Player de teste</p>'}));
 await page.locator('[data-play-training]').click();
 await expect(page.locator('.training-frame iframe')).toHaveAttribute('src','https://drive.google.com/file/d/testDriveVideo12345/preview');
 await expect(page.locator('#training-now')).toHaveText('Como cadastrar um carro');
 await page.locator('[data-close-training]').click();await expect(page.locator('.training-frame iframe')).toHaveCount(0);
 await page.locator('[data-edit-training]').click();await page.locator('[name=title]').fill('Cadastro de veículos');
 await page.locator('#admin-dialog [type=submit]').click();await expect(page.locator('.training-card h3')).toHaveText('Cadastro de veículos');
 for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.screenshot({path:'artifacts/training-mobile.png',fullPage:true});
 await page.locator('[data-remove-training]').click();await page.locator('#admin-dialog [type=submit]').click();
 await expect(page.locator('.training-card')).toHaveCount(0);expect(backend.records.training_videos).toHaveLength(0);
});

test('seller can play training but cannot manage lessons',async({page})=>{
 const backend=await mockBackend(page,{role:'seller'});
 backend.records.training_videos.push({id:crypto.randomUUID(),title:'Aprenda a usar o painel',description:'',drive_file_id:'testDriveVideo12345',sort_order:0});
 await page.goto('/admin/training');await expect(page.locator('[data-play-training]')).toBeVisible();
 await expect(page.locator('[data-add-training],[data-edit-training],[data-remove-training]')).toHaveCount(0);
});

test('administrator can update store opening hours',async({page})=>{
 const backend=await mockBackend(page);await page.goto('/admin/settings');
 const hours=page.locator('textarea[name=opening_hours]');
 await expect(hours).toBeVisible();
 const updated='Segunda a sexta: 8h - 12h / 13h30 - 19h. Sabados: 8h - 16h.';
 await hours.fill(updated);await page.locator('#settings-form button[type=submit],#settings-form button.primary').click();
 await expect.poll(()=>backend.commands.find(c=>c.action==='settings_save')?.payload.opening_hours).toBe(updated);
});

test('seller navigation restricts financial and settings access',async({page})=>{await mockBackend(page,{role:'seller'});await page.goto('/admin/finance');await expect(page.locator('.dashboard-stats')).toBeVisible();await expect(page.locator('[data-route=finance]')).toHaveCount(0);await expect(page.locator('[data-route=settings]')).toHaveCount(0);});

test('photo uploads, cover selection, category, ordering and invalid files',async({page})=>{
 const backend=await mockBackend(page);await page.goto('/admin/vehicles');await page.getByRole('button',{name:'Mais ações para Polo'}).click();await page.getByRole('button',{name:'Gerenciar fotografias',exact:true}).click();await expect(page.locator('.photo-item')).toHaveCount(1);
 await page.locator('input[name=photoFiles]').setInputFiles('public/img/02_veiculo_volkswagen_polo.png');await expect(page.locator('.photo-item')).toHaveCount(2);await expect(page.locator('.image-manager')).toHaveAttribute('aria-busy','false');await page.locator('.photo-item').last().getByRole('button',{name:'Definir capa'}).click();await expect(page.locator('.image-manager')).toHaveAttribute('aria-busy','false');await expect.poll(()=>backend.records.vehicle_images.find(i=>i.vehicle_id===stock[0].id&&i.is_cover)?.id).not.toBe('photo-0');expect(backend.records.vehicle_images.filter(i=>i.vehicle_id===stock[0].id&&i.is_cover)).toHaveLength(1);
 await page.locator('.photo-item').first().getByRole('combobox').selectOption('interior');await page.locator('.photo-item').first().getByRole('button',{name:'Salvar texto'}).click();await expect(page.locator('.image-manager')).toHaveAttribute('aria-busy','false');await expect.poll(()=>backend.commands.some(c=>c.action==='image_save'&&c.payload.category==='interior')).toBe(true);
 await page.locator('.photo-item').last().getByRole('button',{name:'Mover foto para cima'}).click();await expect.poll(()=>backend.commands.filter(c=>c.action==='image_save').length).toBeGreaterThan(4);
 await page.locator('input[name=photoFiles]').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('This is not a PNG')});await expect(page.locator('.upload-error')).toContainText('Conteúdo inválido');
});
test('private document upload uses function and authorized signed URL',async({page})=>{
 const backend=await mockBackend(page);await page.goto('/admin/documents');await page.getByRole('button',{name:'Adicionar documento',exact:true}).click();await page.getByLabel('Veículo (ou selecione um cliente)',{exact:true}).selectOption(stock[0].id);await page.getByLabel('Título',{exact:true}).fill('Documento de teste');await page.locator('input[name=documentFile]').setInputFiles({name:'contract.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n1 0 obj << >> endobj\n%%EOF')});await page.getByRole('button',{name:'Enviar documento'}).click();await expect(page.locator('.atable')).toContainText('Documento de teste');expect(backend.commands.some(c=>c.action==='document_save')).toBe(true);await page.getByRole('button',{name:'Abrir / baixar'}).click();await expect(page.locator('#admin-dialog a')).toHaveAttribute('href',/token=test-only/);expect(backend.commands.some(c=>c.action==='document_access')).toBe(true);
});
test('live catalog uses backend, updates price and removes sold cars automatically',async({page})=>{
 const backend=await mockBackend(page,{session:false});const v={...catalog[0],status:'available',images:[{id:'live-image',vehicleId:stock[0].id,path:`${stock[0].id}/${catalog[0].image}`,category:'exterior',alt:'Polo',isCover:true,sortOrder:0}],id:stock[0].id};backend.records.catalog.push({id:v.id,slug:v.slug,data:v,updated_at:new Date().toISOString()});
 await page.clock.install();await page.goto('/');await expect(page.locator('.vehicle-card')).toHaveCount(1);await expect(page.locator('.card-body strong')).toContainText('89.900');backend.records.catalog[0].data.price='95000.50';await page.clock.runFor(16000);await expect(page.locator('.card-body strong')).toContainText('95.000,50');backend.records.catalog.splice(0);await page.clock.runFor(16000);await expect(page.locator('.vehicle-card')).toHaveCount(0);
});

test('premium login validates fields, hides password and prevents duplicate authentication',async({page})=>{
 await mockBackend(page,{session:false});let attempts=0,release;
 await page.route('https://motta-test.supabase.co/auth/v1/token**',async route=>{attempts++;await new Promise(resolve=>{release=resolve;});await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',msg:'Invalid login credentials'})});});
 await page.goto('/admin');await page.getByLabel('E-mail',{exact:true}).fill('email-invalido');await page.getByLabel('Senha',{exact:true}).fill('incorrect-test-password');await page.getByRole('button',{name:'Entrar no painel'}).click();expect(attempts).toBe(0);expect(await page.locator('#login-email').evaluate(el=>el.validity.typeMismatch)).toBe(true);
 await page.getByLabel('E-mail',{exact:true}).fill('test@example.invalid');await page.getByRole('button',{name:'Mostrar senha',exact:true}).click();await expect(page.getByLabel('Senha',{exact:true})).toHaveAttribute('type','text');await page.getByRole('button',{name:'Ocultar senha',exact:true}).click();await expect(page.getByLabel('Senha',{exact:true})).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'Entrar no painel'}).click();await expect(page.getByRole('button',{name:'Entrando…',exact:true})).toBeDisabled();await expect.poll(()=>attempts).toBe(1);await page.locator('#login-form').evaluate(f=>{f.requestSubmit();f.requestSubmit();});expect(attempts).toBe(1);release();await expect(page.getByRole('alert')).toContainText('Confira suas credenciais');await expect(page.locator('.login-submit')).toBeEnabled();await expect(page.locator('.admin-sidebar')).toHaveCount(0);
});

test('remember email persists only opted-in email and password is never saved',async({page})=>{
 await mockBackend(page,{session:false});await page.goto('/admin');await page.getByLabel('E-mail',{exact:true}).fill('test@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('Password-only-for-test');await page.getByLabel('Lembrar e-mail',{exact:true}).check();await page.locator('.login-submit').click();await expect(page.locator('.admin-sidebar')).toBeVisible();await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.locator('#login-form')).toBeVisible();await page.reload();await expect(page.getByLabel('E-mail',{exact:true})).toHaveValue('test@example.invalid');await expect(page.getByLabel('Senha',{exact:true})).toHaveValue('');
 const saved=await page.evaluate(()=>JSON.stringify(localStorage));expect(saved).not.toContain('Password-only-for-test');expect(saved).toContain('motta-remembered-email');await page.getByLabel('Lembrar e-mail',{exact:true}).uncheck();expect(await page.evaluate(()=>localStorage.getItem('motta-remembered-email'))).toBeNull();
});

test('premium login image, responsive layout, keyboard and reduced motion',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await mockBackend(page,{session:false});await page.goto('/admin');await expect(page.locator('.login-studio')).toHaveClass(/is-loaded/);
 for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.login-submit')).toBeVisible();}
 await page.setViewportSize({width:1440,height:900});await page.getByLabel('E-mail',{exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByLabel('Senha',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Mostrar senha',exact:true})).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.login-studio picture').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');expect(await page.locator('.login-studio picture').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');expect(errors).toEqual([]);
});

test('recovery resets password through Auth and returns to protected login',async({page})=>{
 await mockBackend(page);let request;
 await page.addInitScript(()=>{if(location.pathname==='/admin')localStorage.removeItem('sb-motta-test-auth-token');});
 await page.route('https://motta-test.supabase.co/auth/v1/user',async route=>{if(route.request().method()==='PUT')request=route.request().postDataJSON();await route.fulfill({contentType:'application/json',body:JSON.stringify(user)});});
 await page.goto('/admin/redefinir-senha');await expect(page.getByRole('heading',{name:'Defina sua nova senha.'})).toBeVisible();await page.getByLabel('Nova senha',{exact:true}).fill('Long-recovery-password-test');await page.getByRole('button',{name:'Salvar nova senha'}).click();await expect(page).toHaveURL('/admin');expect(request.password).toBe('Long-recovery-password-test');await expect(page.locator('#login-form')).toBeVisible();
});

test('expired session without refresh cannot access protected administration',async({page})=>{
 await mockBackend(page,{session:false});await page.addInitScript(()=>localStorage.setItem('sb-motta-test-auth-token',JSON.stringify({access_token:'expired-token',refresh_token:'expired-refresh',expires_at:1,expires_in:0,token_type:'bearer',user:{id:'10000000-0000-4000-8000-000000000001'}})));
 await page.route('https://motta-test.supabase.co/auth/v1/token**',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'refresh_token_not_found',msg:'Invalid Refresh Token'})}));
 await page.goto('/admin/vehicles');await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('.admin-sidebar')).toHaveCount(0);
});

async function mockInstitutions(page){
 const rows=['Bradesco','Itaú','Safra','Daycoval','C6 Bank','Banco PAN','BV','Car Bank','Omni'].map((name,i)=>({id:`60000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name,sort_order:(i+1)*10,enabled:true,logo_url:'',logo_authorized:false}));
 await page.route('https://motta-test.supabase.co/rest/v1/motta_financing_institutions**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();let output=rows;
  if(method==='OPTIONS')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'*'}});
  const id=url.searchParams.get('id')?.replace('eq.','');
  if(method==='POST'){const row={id:crypto.randomUUID(),...req.postDataJSON()};rows.push(row);output=[row];}
  else if(method==='PATCH'){const row=rows.find(row=>row.id===id);Object.assign(row,req.postDataJSON());output=[row];}
  else if(method==='DELETE'){const index=rows.findIndex(row=>row.id===id);output=index<0?[]:rows.splice(index,1);}
  else{output=rows.filter(row=>url.searchParams.get('enabled')!=='eq.true'||row.enabled).slice().sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name));}
  return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(req.headers().accept?.includes('vnd.pgrst.object+json')?output[0]:output)});
 });return rows;
}

test('financial institutions appear after financing, before reviews, with correct WhatsApp and responsive layout',async({page})=>{
 await mockBackend(page,{session:false});await mockInstitutions(page);await page.goto('/');await expect(page.locator('.institution-card')).toHaveCount(9);
 expect(await page.locator('#financiamento').evaluate(node=>node.nextElementSibling.id)).toBe('instituicoes-financeiras');expect(await page.locator('#instituicoes-financeiras').evaluate(node=>node.nextElementSibling.id)).toBe('avaliacoes');
 const link=new URL(await page.getByRole('link',{name:'Consultar financiamento',exact:false}).getAttribute('href'));expect(link.pathname).toBe('/5551974006062');expect(link.searchParams.get('text')).toBe('Olá! Tudo bem? Estou olhando os veículos da Motta Multimarcas e gostaria de saber quais são as opções e condições de financiamento disponíveis.');
 for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:900});await page.locator('#instituicoes-financeiras').scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.institution-card').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
});

test('bank carousel advances automatically, loops and can be paused',async({page})=>{
 await mockBackend(page,{session:false});await mockInstitutions(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:900});await page.goto('/');
 const track=page.locator('#institutions-track');await expect(track).toBeVisible();await track.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await expect.poll(()=>track.evaluate(el=>el.scrollLeft),{timeout:7000}).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Pausar carrossel automático',exact:true}).click();await page.mouse.move(0,0);await page.locator('h1').click();
 await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.waitForTimeout(700);const paused=await track.evaluate(el=>el.scrollLeft);await page.waitForTimeout(3300);expect(await track.evaluate(el=>el.scrollLeft)).toBe(paused);
 await track.evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'}));await page.getByRole('button',{name:'Iniciar carrossel automático',exact:true}).click();await page.locator('h1').click();await page.mouse.move(0,0);
 await expect.poll(()=>track.evaluate(el=>el.scrollLeft),{timeout:7000}).toBeLessThan(2);
});

test('administrator manages institution visibility, order, logo, creation and removal',async({page})=>{
 await mockBackend(page);const rows=await mockInstitutions(page);await page.goto('/admin/settings');await expect(page.locator('.financing-admin-row')).toHaveCount(9);
 await page.getByRole('button',{name:'Adicionar instituição',exact:true}).click();await page.getByLabel('Nome da instituição',{exact:true}).fill('Instituição do teste');await page.getByLabel('Ordem de exibição',{exact:true}).fill('1');await page.getByLabel('URL do logotipo oficial (HTTPS ou /img/)',{exact:true}).fill('/img/07_logotipo_motta_mockup.png');await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('#admin-dialog .form-error')).toContainText('Confirme a identidade');await page.getByLabel('Identidade e autorização',{exact:false}).check();await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('#admin-dialog')).not.toBeVisible();await expect(page.locator('.financing-admin-row').first()).toContainText('Instituição do teste');
 await page.getByRole('button',{name:'Editar Instituição do teste',exact:true}).click();await page.getByLabel('Exibir instituição na homepage',{exact:true}).uncheck();await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('.financing-admin-row').first()).toContainText('Oculta da homepage');
 await page.goto('/');await expect(page.locator('.institution-card')).toHaveCount(9);await expect(page.locator('#instituicoes-financeiras')).not.toContainText('Instituição do teste');
 await page.goto('/admin/settings');await page.getByRole('button',{name:'Remover Instituição do teste',exact:true}).click();await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('.financing-admin-row')).toHaveCount(9);expect(rows.some(row=>row.name==='Instituição do teste')).toBe(false);
});

test('institution changes reconcile automatically and failed logos fall back to readable names',async({page})=>{
 await mockBackend(page,{session:false});const rows=await mockInstitutions(page);rows[0].logo_url='/img/unavailable-test-logo.png';rows[0].logo_authorized=true;await page.clock.install();await page.goto('/');await expect(page.locator('.institution-card').first().locator('.institution-name')).toBeVisible();await expect(page.locator('.institution-card').first().locator('img')).toBeHidden();
 rows[0].enabled=false;rows[8].sort_order=1;await page.clock.runFor(16000);await expect(page.locator('.institution-card')).toHaveCount(8);await expect(page.locator('.institution-card').first()).toContainText('Omni');
 rows.forEach(row=>row.enabled=false);await page.clock.runFor(16000);await expect(page.locator('#instituicoes-financeiras')).toBeHidden();
});

test('bank carousel navigates with buttons and keyboard and remains compact on mobile',async({page})=>{
 await mockBackend(page,{session:false});await mockInstitutions(page);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:900});await page.goto('/');const track=page.locator('#institutions-track');await expect(track).toBeVisible();await expect(page.getByRole('button',{name:'Instituições anteriores',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Próximas instituições',exact:true}).click();await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await expect(page.getByRole('button',{name:'Próximas instituições',exact:true})).toBeDisabled();
 await track.focus();await page.keyboard.press('Home');await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBe(0);await page.keyboard.press('End');await expect(page.getByRole('button',{name:'Próximas instituições',exact:true})).toBeDisabled();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('button',{name:'Próximas instituições',exact:true})).toBeEnabled();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await track.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);expect(await page.locator('.institution-card').first().evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(90);
});

async function mockApplicationAdmin(page,backend,{empty=false}={}){
 const application={id:'70000000-0000-4000-8000-000000000001',protocol:'MOT-0123456789ABCDEF0123',applicant_label:'P••• T•••',vehicle_id:stock[0].id,vehicle_snapshot:{brand:'Volkswagen',model:'Polo',year:2024,price:89900},status:'new',assigned_to:null,created_at:new Date().toISOString(),expires_at:'2027-01-01T12:00:00Z',privacy_notice_version:'test',privacy_acknowledged_at:new Date().toISOString()};
 backend.records.financing_applications=empty?[]:[application];const calls=[],events=[],disclosures=[],tasks=[];
 await page.route('https://motta-test.supabase.co/rest/v1/rpc/motta_financing_admin',async route=>{const {action,payload}=route.request().postDataJSON();calls.push({action,payload});let data={};
 if(action==='list'){const rows=backend.records.financing_applications.filter(row=>!payload.status||row.status===payload.status);data={rows,total:rows.length,counts:Object.fromEntries(['new','in_service','completed'].map(status=>[status,rows.filter(r=>r.status===status).length]))};}
 else if(['detail','reveal','export'].includes(action)){data={application,applicant:action==='detail'?{applicant_name:application.applicant_label,cpf:'***.***.***-25',phone:'********9999',email:'t***',city:'Alvorada',state:'RS'}:{applicant_name:'Pessoa do Teste',full_address:'Rua de Teste, 123, Centro',address_version:2,postal_code:'94810000',street:'Rua de Teste',address_number:'123',neighborhood:'Centro',cpf:'52998224725',phone:'5551999999999',email:'test@example.invalid',city:'Alvorada',state:'RS',birth_date:'1990-01-01',employment_type:'employed',occupation:'Teste',employment_bond:'clt',employment_duration:'over_2',income_range:'under_2000',down_payment:12000,desired_term:36,extra_answers:{}},privacy:{version:'test',notice_text:'Aviso de teste',acknowledged_at:application.privacy_acknowledged_at,legal_basis:'Teste transacional',extra_fields:[]},events,disclosures,tasks};}
 else if(action==='update'){Object.assign(application,{status:payload.status,assigned_to:payload.assigned_to});events.push({event_type:'updated',notes:payload.notes,new_status:payload.status,created_at:new Date().toISOString(),actor_id:user.id});}
 else if(action==='task_save')tasks.push({id:crypto.randomUUID(),title:payload.title,assigned_to:payload.assigned_to,due_at:payload.due_at});
 else if(action==='task_complete')tasks.find(t=>t.id===payload.task_id).completed_at=new Date().toISOString();
 else if(action==='disclose')disclosures.push({institution_name:'Instituição do teste',purpose:payload.notes,disclosed_fields:payload.disclosed_fields,disclosed_at:new Date().toISOString()});
 else if(action==='config_get')data={enabled:false,legal_validated:false,notice_text:'',notice_version:'',policy_url:'',legal_basis:'',extra_fields:[]};
 return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
 });return {application,calls,events,tasks};
}

test('financing admin starts masked and audits reveal, status, assignment, tasks and controlled export',async({page})=>{
 const backend=await mockBackend(page),app=await mockApplicationAdmin(page,backend);await page.goto('/admin/applications');await expect(page.locator('.application-rows')).toContainText(app.application.protocol);await page.getByRole('button',{name:'Visualizar ficha',exact:true}).click();await expect(page.locator('#admin-dialog')).toContainText('***.***.***-25');await expect(page.locator('#admin-dialog')).not.toContainText('52998224725');await page.getByRole('button',{name:'Acessar ficha completa',exact:true}).click();await expect(page.locator('#admin-dialog')).toContainText('52998224725');await expect(page.locator('#admin-dialog')).toContainText('Rua de Teste, 123, Centro');await expect(page.locator('#admin-dialog')).toContainText('94810-000');
 const link=page.getByRole('link',{name:'Chamar no WhatsApp',exact:true});const url=new URL(await link.getAttribute('href'));expect(url.searchParams.get('text')).not.toMatch(/529982|renda|12000/);await page.getByRole('button',{name:'Atualizar atendimento',exact:true}).click();await page.getByLabel('Status',{exact:true}).selectOption('in_service');await page.getByLabel('Responsável',{exact:true}).selectOption(user.id);await page.getByLabel('Motivo / observação interna',{exact:true}).fill('Primeiro atendimento do teste');await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('#admin-dialog')).toContainText('Primeiro atendimento do teste');expect(app.application.assigned_to).toBe(user.id);expect(app.application.status).toBe('in_service');
 await page.getByRole('button',{name:'Adicionar tarefa',exact:true}).click();await page.getByLabel('Título',{exact:true}).fill('Retornar ao cliente');await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('#admin-dialog')).toContainText('Retornar ao cliente');await page.getByRole('button',{name:'Concluir tarefa',exact:true}).click();await expect(page.locator('#admin-dialog')).toContainText('Concluída');
 await page.getByRole('button',{name:'Exportar ficha',exact:true}).click();const download=page.waitForEvent('download');await page.locator('#admin-dialog button[type=submit]').click();expect((await download).suggestedFilename()).toBe(app.application.protocol+'.json');expect(app.calls.some(c=>c.action==='export')).toBe(true);
});

test('financing list recovers on focus and polling; notification contains protocol without personal data',async({page})=>{
 const backend=await mockBackend(page),app=await mockApplicationAdmin(page,backend,{empty:true});await page.clock.install();await page.goto('/admin/applications');await expect(page.locator('.application-empty')).toContainText('Nenhuma ficha');await page.waitForTimeout(100);backend.records.financing_applications.push({...app.application,created_at:new Date(Date.now()+60000).toISOString()});await page.clock.runFor(16000);await expect(page.locator('.application-rows')).toContainText(app.application.protocol);await expect(page.locator('.application-live-notice')).toContainText(app.application.protocol);await expect(page.locator('.application-live-notice')).not.toContainText('529982');await expect(page.locator('.application-live-notice')).not.toContainText('Pessoa do Teste');await page.getByRole('button',{name:'Abrir ficha',exact:true}).click();await expect(page.locator('#admin-dialog')).toContainText('***.***.***-25');
});

test('seller cannot navigate to financing applications or export personal data',async({page})=>{
 await mockBackend(page,{role:'seller'});await page.goto('/admin/applications');await expect(page.locator('[data-route=applications]')).toHaveCount(0);await expect(page.locator('.dashboard-stats')).toBeVisible();await expect(page.getByRole('button',{name:'Exportar ficha',exact:true})).toHaveCount(0);
});

test('financing filters send name and period and archival persists through the update command',async({page})=>{
 const backend=await mockBackend(page),app=await mockApplicationAdmin(page,backend);await page.goto('/admin/applications');await expect(page.locator('.application-stats article')).toHaveCount(4);
 await page.getByRole('searchbox',{name:'Pesquisar fichas'}).fill('Pessoa');await page.getByLabel('Envio a partir de',{exact:true}).fill('2026-11-01');await page.getByLabel('Envio até',{exact:true}).fill('2026-11-30');await expect.poll(()=>app.calls.filter(c=>c.action==='list').at(-1)?.payload).toMatchObject({search:'Pessoa',from:'2026-11-01',to:'2026-11-30'});
 await page.getByRole('button',{name:'Visualizar ficha',exact:true}).click();await page.getByRole('button',{name:'Arquivar',exact:true}).click();await expect(page.getByLabel('Status',{exact:true})).toHaveValue('archived');await page.getByLabel('Motivo / observação interna',{exact:true}).fill('Cliente decidiu aguardar');await page.locator('#admin-dialog button[type=submit]').click();await expect(page.locator('#admin-dialog')).toContainText('Cliente decidiu aguardar');expect(app.application.status).toBe('archived');
});
