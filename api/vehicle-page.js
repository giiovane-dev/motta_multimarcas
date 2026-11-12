import {readFile} from 'node:fs/promises';
import {vehicleView} from '../src/vehicle-view.js';
import {vehicleSEO,escapeHTML as e} from '../src/vehicle-model.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');
 try{
 const slug=String(req.query.slug||'');if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)){res.statusCode=404;return res.end('Veículo não encontrado.');}
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key){res.statusCode=503;return res.end('Catálogo temporariamente indisponível.');}
 const endpoint=new URL('/rest/v1/motta_catalog',url);endpoint.search=new URLSearchParams({select:'data',slug:`eq.${slug}`,limit:'1'}).toString();
 const response=await fetch(endpoint,{headers:{apikey:key},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Catálogo indisponível');const [row]=await response.json();
 let html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 if(!row){res.statusCode=404;return res.end(html.replace('</head>','<meta name="robots" content="noindex,follow"></head>'));}
 const vehicle={...row.data,images:row.data.images.map(i=>({...i,url:`${url}/storage/v1/object/public/vehicle-public-images/${i.path}`}))};
 const origin=process.env.PUBLIC_SITE_URL||'https://motta-multimarcas.vercel.app';const seo=vehicleSEO(vehicle,origin);
 const head=`<link rel="canonical" href="${e(seo.url)}"><meta property="og:title" content="${e(seo.title)}"><meta property="og:description" content="${e(seo.description)}"><meta property="og:url" content="${e(seo.url)}"><meta property="og:image" content="${e(seo.image)}"><meta property="og:type" content="website"><script id="vehicle-schema" type="application/ld+json">${JSON.stringify(seo.structured).replace(/</g,'\\u003c')}</script>`;
 html=html.replace(/<title>.*?<\/title>/,`<title>${e(seo.title)}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${e(seo.description)}">`).replace('</head>',head+'</head>').replace('<div id="app"></div>',`<div id="app"><main>${vehicleView(vehicle,[])}</main></div>`);
 return res.end(html);
 }catch{res.statusCode=503;return res.end('Catálogo temporariamente indisponível. Tente novamente em instantes.');}
}
