import {writeFile} from 'node:fs/promises';
const base='https://raw.githubusercontent.com/Tgentil/Bancos-em-SVG/main/';
for(const [name,path] of [['bradesco-alt','Bradesco S.A/bradesco.svg'],['daycoval-alt','Banco Daycoval/logo-Daycoval.svg'],['pan-alt','Banco Pan/bancoPan.svg']]){const r=await fetch(base+path.split('/').map(encodeURIComponent).join('/'));await writeFile('artifacts/'+name+'.svg',await r.text());}
const official='https://www.bv.com.br/documents/20121/2904434/logo-bv-2026.svg/4c1d553e-ecac-093c-6f09-3a017551dab5?version=1.0&t=1783962382727';const r=await fetch(official);if(!r.ok)throw Error('BV download failed');await writeFile('public/img/bancos/bv.svg',await r.text());console.log('BV official current source saved');
