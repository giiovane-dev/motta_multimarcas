// Test-only inventory. Never imported by src or included in production bundles.
export const vehicles=[
 {id:'polo',slug:'volkswagen-polo-2023',brand:'Volkswagen',model:'Polo',version:'1.0 TSI Comfortline',year:2023,km:28000,price:89900,image:'02_veiculo_volkswagen_polo.png'},
 {id:'compass',slug:'jeep-compass-longitude-2024',brand:'Jeep',model:'Compass',version:'1.3 T270 Longitude',year:2024,km:16000,price:159900,image:'03_veiculo_jeep_compass.png'},
 {id:'onix',slug:'chevrolet-onix-ltz-2023',brand:'Chevrolet',model:'Onix',version:'1.0 LTZ',year:2023,km:32000,price:79900,image:'04_veiculo_chevrolet_onix.png'},
 {id:'corolla',slug:'toyota-corolla-xei-2022',brand:'Toyota',model:'Corolla',version:'2.0 XEi Automático',year:2022,km:45000,price:149900,image:'05_veiculo_toyota_corolla.png'}
].map(v=>({status:'demonstration',description:'',specifications:{},features:[],...v,images:[{id:`${v.id}-exterior-1`,vehicleId:v.id,url:`/img/${v.image}`,category:'exterior',alt:`${v.brand} ${v.model} — teste`,sortOrder:0,isCover:true}]}));
