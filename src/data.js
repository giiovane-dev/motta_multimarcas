// Preencher somente com informações comerciais verificadas antes da publicação.
export const business = {
 financingWhatsapp: '+55 51 97400-6062',
 whatsapp: '+55 51 9219-2120', phone: '',
 siteUrl: 'https://motta-multimarcas.vercel.app',
 address: 'R. Tibúrcio de Azevedo, 493 - Americana, Alvorada - RS, 94820-480',
 hours: '', socials: {},
 google: {
  profileUrl: 'https://maps.app.goo.gl/Y4f57f3LDFjzN5AX7',
  // URL de iframe confirmada pode substituir o mapa baseado no endereço acima.
  embedUrl: '',
  // Endpoint do próprio servidor, com Place Details (New). Nunca colocar chaves aqui.
  reviewsEndpoint: '',
  placeId: ''
 }
};
// Populated exclusively from the sanitized Supabase projection by catalog.js.
// An unavailable/unconfigured backend never falls back to sample inventory.
export const vehicles = [];
