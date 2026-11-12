# Motta Multimarcas — animações, avaliações e localização

## Configuração confirmada pelo cliente

- Perfil Google: https://share.google/lDWCloKYnLug6sWQN
- Endereço: R. Tibúrcio de Azevedo, 493 - Americana, Alvorada - RS, 94820-480.

O WhatsApp informado, +55 51 9219-2120, já está preenchido. Telefone fixo e horários continuam pendentes. Os dados comerciais passam a ser gerenciados pelo Supabase quando a integração descrita em `ADMINISTRACAO.md` for ativada; `src/data.js` mantém a configuração comercial inicial e os links Google. O endereço também alimenta o rodapé.

## Mapa

O iframe oficial do Google Maps recebe o endereço confirmado como busca, com `output=embed` e idioma português. O Google redireciona para `/maps/embed`. Não há chave secreta, coordenada inventada ou imagem de mapa. O destino do botão Como chegar usa Maps URLs, `api=1` e o mesmo endereço.

O mapa tem carregamento lazy, título acessível, referrer policy, atribuição nativa, zoom e navegação nativos. Não foram aplicados filtros de cor ou overlays sobre os controles/atribuições. Uma URL oficial de incorporação confirmada pode ser colocada em `business.google.embedUrl`; apenas URLs HTTPS de `www.google.com/maps/embed` são aceitas. Não é necessário preencher enquanto o mapa por endereço atender à loja.

Verificação real no Edge: o iframe carregou e exibiu o número 493 da Rua Tibúrcio de Azevedo, Americana, Alvorada, RS. O mapa está centrado no endereço; ainda não usa um Place ID que identifique o perfil comercial da Motta.

## Avaliações

O link de perfil não fornece acesso à API de comentários. Nenhuma avaliação, média ou contagem foi copiada, inventada ou obtida por scraping. Sem endpoint, o estado vazio convida a consultar o perfil oficial. O estado de carregamento só aparece durante uma consulta real configurada.

O componente está preparado para `business.google.reviewsEndpoint`, endpoint HTTPS/mesma origem do site, a implementar no servidor depois de obter autorização e credenciais Places. Não existe um backend neste projeto. Não colocar chaves Google no arquivo de configuração nem em variáveis públicas do Vite.

Contrato esperado: os campos de Place Details (New) `id`, `rating`, `userRatingCount`, `reviews`, `attributions`. Em `reviews`: `authorAttribution.displayName`, `authorAttribution.uri`, `authorAttribution.photoUri`, `rating`, `text.text`/`originalText.text`, `publishTime`/`relativePublishTimeDescription`, `googleMapsUri`. Somente notas válidas e autores retornados pela integração são apresentados. Se `placeId` estiver configurado, a resposta deve corresponder a ele. Saída textual usa DOM/textContent, sem injetar HTML de avaliações.

Ao configurar uma fonte real, o carrossel mostra até três comentários no desktop, dois no tablet e um no celular. Setas, rolagem e teclas direcionais navegam sem duplicar comentários. Autores, links, datas, atribuições e indicação da ordem por relevância acompanham o conteúdo. Consultas têm timeout, tratamento de falhas e `cache: no-store`; o frontend não persiste comentários.

Antes de ativar a API em produção, o responsável pelo servidor deve confirmar o Place ID, permissões, políticas de armazenamento e páginas públicas de termos/privacidade exigidas pelo Google. Referências consultadas: [Places API — políticas e atribuições](https://developers.google.com/maps/documentation/places/web-service/policies) e [incorporação oficial de mapas](https://developers.google.com/maps/documentation/embed/embedding-map).

## Movimento

CSS nativo e Intersection Observer, sem dependência de animação. Hero com entrada em sequência de 700 ms e foto de 1.03 a 1 em 900 ms; scroll com 18 px e 550 ms; escalonamento de 80 ms; hover com elevação de 4 px, zoom 1.025 e transições de 300/320 ms. O contorno de foco permanece visível. `prefers-reduced-motion` desativa animações, deslocamentos e transições não essenciais; o conteúdo permanece disponível.

Estrutura, fotografias, dados dos carros e filtros existentes preservados. O banner inclinado conserva sua transformação durante a entrada. Não há movimento automático contínuo nem autoplay de carrossel.

## Arquivos e testes

- `src/experience.js` e `src/experience.css`: seções e movimento.
- `src/main.js`: inicialização do módulo adicional.
- `src/data.js`: endereço e configuração Google.
- `tests/premium.spec.js`: seções/estado sem dados, mapa real, quatro larguras, ausência de overflow, movimento reduzido, estados de carregamento e erro, atribuição e carrossel de avaliações com dados sintéticos **somente no teste interceptado**. Esses dados nunca entram no site ou build.
- `scripts/check-map.mjs`: verificação visual do iframe real.
- `artifacts/premium-{375,768,1024,1440}.png`: capturas reais das quatro larguras.

Executar `npm.cmd test` e `npm.cmd run build`. O teste do mapa depende de acesso à internet. Servidor local: `npm.cmd run dev`, http://127.0.0.1:5173/.
