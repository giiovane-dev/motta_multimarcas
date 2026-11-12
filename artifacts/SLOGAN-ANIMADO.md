# Slogan institucional animado

## Implementação

Seção única `#motta-dream-slogan` na homepage, depois da vitrine e do histórico de vendidos (quando exibido), imediatamente antes do financiamento. As demais seções, o carrossel de bancos e os dados do Supabase foram preservados.

Texto HTML: “Lembre-se:”, “TUDO COMEÇA”, “COM UM SONHO”. As duas linhas principais têm letras independentes para animação, ocultas da árvore de acessibilidade; o heading possui o texto completo como nome acessível. Não foi usada a imagem inteira com texto duplicado.

Logo existente: `public/img/07_logotipo_motta_mockup.png`, sem redesenho. Estado final: `opacity: .05`, `blur(1.5px)`, perspectiva e inclinação discretas. O contraste baixo e a separação das camadas compõem a sensação de distância; não é um modelo 3D. Nenhuma animação contínua.

## Sequência

- Luzes: 0–600 ms.
- Logo distante: 150–1350 ms, terminando em 5% de opacidade.
- “Lembre-se:”: 400–900 ms.
- Primeira linha: letras iniciando em 850 ms, intervalo de 35 ms e duração individual de 480 ms.
- Segunda linha: início em 1450 ms, mesmo intervalo e duração.
- Traço: desenho entre 2300–3000 ms; brilho único entre 2550–3300 ms.

Intersection Observer com threshold de 35%, uma execução por carregamento. Texto e camadas são visíveis por padrão; apenas a instalação do observer prepara o estado inicial. Movimento reduzido exibe o estado final imediatamente. Um fallback estático em `noscript` mantém a frase legível quando JavaScript está desativado.

## Comparação com a referência

A imagem anexada à conversa foi inspecionada e usada como direção de arte. O caminho solicitado `img/slogan-motta-referencia.png` não existe neste workspace; não foi inventado um arquivo de referência.

Foram comparadas capturas reais de desktop e mobile com o anexo. A composição mantém preto, painéis diagonais, luzes vermelhas, logo distante, serifas, linhas laterais, duas linhas principais e curva vermelha. As luzes foram refinadas para manter a inclinação também com movimento reduzido; o traço foi ajustado para ter extremidades finas e centro mais largo.

Diferenças restantes: a fonte usa Georgia/Times New Roman do sistema, pois a fonte exata da arte não foi fornecida; a textura foi aproximada com gradientes CSS, não extraída do material raster; a curva é um SVG reconstruído geometricamente. Não se afirma equivalência pixel a pixel. No celular, a seção é mais alta para preservar a leitura.

## Arquivos

- `src/motta-dream-slogan.js`: componente reutilizável `MottaDreamSlogan`, markup, letras e ativação única.
- `src/motta-dream-slogan.css`: estilos isolados, camadas, marca-d'água, animações e responsividade.
- `src/main.js`: montagem e preservação da ordem ao atualizar vendidos.
- `index.html`: fallback sem JavaScript.
- `tests/dream-slogan.spec.js`: testes do slogan.

Não foram adicionadas fontes, vídeos, dependências ou bibliotecas 3D. Banco e autenticação não foram modificados.

## Validação executada

- 8 testes Playwright aprovados: 3 específicos do slogan, homepage/filtros/detalhes/favoritos/contato e 4 de experiências públicas/mapa/avaliações.
- Slogan único, posição, texto, duas linhas, opacidade de 0,05 e blur de 1,5 px confirmados.
- Animação acionada por scroll, finalização, ausência de repetição e brilho final apagado confirmados.
- Fallback com JavaScript desativado aprovado.
- Layout sem overflow em 1920, 1440, 1024, 768, 390 e 320 px; sem cortes no heading.
- Build Vite aprovado e 3 testes da rota de servidor aprovados.
- Capturas locais: `artifacts/dream-slogan-desktop.png` e `artifacts/dream-slogan-mobile.png`.
