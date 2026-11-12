import {mkdir,writeFile} from 'node:fs/promises';
const paths={bradesco:'Bradesco S.A/bradesco com nome.svg',itau:'Itaú Unibanco S.A/logo-nova-letras-brancas.svg',safra:'Banco Safra S.A/logo-safra-nome.svg',daycoval:'Banco Daycoval/logo-Daycoval- maior.svg','c6-bank':'Banco C6 S.A/c6 bank- nome- branco.svg','banco-pan':'Banco Pan/bancoPan-nome.svg',bv:'Banco Votorantim/banco-bv-logo.svg',omni:'Omni/logo-omni.svg'};
const meta=await(await fetch('https://api.github.com/repos/Tgentil/Bancos-em-SVG')).json();console.log(JSON.stringify({license:meta.license,branch:meta.default_branch}));
await mkdir('public/img/bancos',{recursive:true});
for(const [name,path] of Object.entries(paths)){const r=await fetch('https://raw.githubusercontent.com/Tgentil/Bancos-em-SVG/main/'+path.split('/').map(encodeURIComponent).join('/'));if(!r.ok)throw Error(name+': '+r.status);let svg=await r.text();if(!svg.includes('<svg'))throw Error('Invalid SVG');
const findings=[...svg.matchAll(/<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)[^)]*\)/gi)].map(m=>m[0]);console.log(JSON.stringify({name,bytes:svg.length,viewBox:svg.match(/viewBox="([^"]*)"/)?.[1],findings,colors:[...new Set([...svg.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(m=>m[0]))].slice(0,15)}));
await writeFile('public/img/bancos/'+name+'.svg',svg);
}
