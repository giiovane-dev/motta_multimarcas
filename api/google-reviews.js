// Google credentials stay in Vercel server environment variables.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Método não permitido.'});}
 const key=process.env.GOOGLE_PLACES_API_KEY,placeId=process.env.GOOGLE_PLACE_ID;
 if(!key||!placeId)return res.status(503).json({error:'Avaliações do Google ainda não configuradas.'});
 try{
  const url=new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set('languageCode','pt-BR');
  const response=await fetch(url,{headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'id,rating,userRatingCount,reviews,attributions'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Google indisponível');
  const data=await response.json();
  if(data.id!==placeId)throw Error('Local diferente do configurado');
  return res.status(200).json({id:data.id,rating:data.rating,userRatingCount:data.userRatingCount,attributions:data.attributions||[],reviews:(Array.isArray(data.reviews)?data.reviews:[]).slice(0,4)});
 }catch{return res.status(502).json({error:'Não foi possível consultar as avaliações do Google.'});}
}
