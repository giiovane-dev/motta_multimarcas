import assert from 'node:assert/strict';
import handler from '../api/vehicle-page.js';
const originalFetch=globalThis.fetch;const oldUrl=process.env.VITE_SUPABASE_URL,oldKey=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
process.env.VITE_SUPABASE_URL='https://test.invalid';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
function response(){return {statusCode:200,headers:{},setHeader(name,value){this.headers[name]=value;},end(body){this.body=body;return this;}};}
let data=[{data:{id:'test',slug:'test-car',brand:'Marca <teste>',model:'Modelo',version:'Versão',year:2025,km:200,price:90000,description:'Descrição',status:'available',specifications:{},features:[],images:[{id:'image',vehicleId:'test',path:'test/photo.webp',category:'exterior',alt:'Capa',isCover:true,sortOrder:0}]}}];
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
try{
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers.apikey,'sb_publishable_test');assert.equal('Authorization' in options.headers,false);assert.match(String(url),/motta_catalog/);return Response.json(data);};
 await test('live vehicle metadata renders server-side without private queries',async()=>{const res=response();await handler({query:{slug:'test-car'}},res);assert.equal(res.statusCode,200);assert.match(res.body,/<title>Marca &lt;teste&gt;/);assert.match(res.body,/og:image/);assert.match(res.body,/vehicle-schema/);assert.equal(res.headers['Cache-Control'],'no-store');assert.doesNotMatch(res.body,/<teste>/);});
 await test('unpublished or removed vehicles return HTTP 404',async()=>{data=[];const res=response();await handler({query:{slug:'test-car'}},res);assert.equal(res.statusCode,404);assert.match(res.body,/noindex,follow/);});
 await test('invalid route and unavailable upstream fail closed',async()=>{let res=response();await handler({query:{slug:'../invalid'}},res);assert.equal(res.statusCode,404);globalThis.fetch=async()=>new Response('',{status:500});res=response();await handler({query:{slug:'test-car'}},res);assert.equal(res.statusCode,503);});
}finally{globalThis.fetch=originalFetch;if(oldUrl===undefined)delete process.env.VITE_SUPABASE_URL;else process.env.VITE_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;else process.env.VITE_SUPABASE_PUBLISHABLE_KEY=oldKey;}
console.log(`\n${count} server route checks passed (isolated upstream).`);
