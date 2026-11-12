# Auditoria e refinamento — Motta Multimarcas / GVN DIGITAL

## Inspeção

Projeto existente preservado: HTML, CSS, JavaScript modular, Vite e Roboto local. Animações em CSS e Intersection Observer, sem biblioteca adicional. Inspecionados código, estilos, configurações, arquivos locais e mockup oficial de 1199 × 1312. Fotografias e dados de veículos não foram substituídos.

Capturas reais antes/depois nas larguras 375, 768, 1024, 1199 e 1440 px, no Microsoft Edge. As capturas estáticas usam movimento reduzido para comparar estados finais. As animações foram verificadas separadamente nos testes.

## Problemas encontrados e correções

| Área | Problema | Correção |
|---|---|---|
| Hero | Transição abrupta entre foto e fundo em telas largas | Overlay passa a acompanhar a borda real da imagem; enquadramento e letreiro preservados |
| Tipografia | Informações de 12 px nos veículos e títulos de seções novas maiores que os anteriores | Versão e especificações com 13 px no desktop; títulos de seção de 27 px e 24 px no mobile, mantendo Roboto |
| Cards | Cantos e botões pouco consistentes; fotos com corações incorporados | Raio de 12 px, bordas sóbrias, botões entre 32–40 px; favorito com cobertura proporcional ao recorte, sem editar os arquivos |
| Notebook/tablet | Quatro cards estreitos e título da busca espremido | Dois cards nas larguras intermediárias; busca com título próprio e campos alinhados abaixo |
| Avaliações | Grande quadro vazio, ícone de WhatsApp sem relação com reputação e atribuição isolada sem dados | Apresentação compacta com texto direto e acesso ao perfil oficial; cards e atribuições continuam preparados para integração real |
| Localização | Painel alto, marca repetida em grandes dimensões e informações excessivamente espaçadas | Logotipo menor, título específico de Alvorada, endereço em largura integral e dados de atendimento lado a lado |
| Rodapé | Endereço quebrava sob o ícone; linha inferior podia conflitar com crédito absoluto | Ícones e textos em flex, crédito no fluxo e reorganização mobile |
| Movimento | Hero de até 900 ms e escalonamento aplicado a blocos sem relação | Hero de 480 ms, foto de 600 ms com escala 1.015, entradas de 420 ms/10 px e escalonamento de 60 ms somente entre itens relacionados |
| Hover | Zoom e elevação maiores que o necessário | Elevação de 3 px e zoom 1.015, somente em dispositivos com hover |
| CSS | Regras repetidas e sobrescritas acumuladas | Consolidação por seletor e breakpoint, remoção de regras vazias/inativas e espaçamentos redundantes; formatação legível |
| Menu | Símbolo tipográfico, rótulo de abertura fixo e ausência de fechamento por Escape | Ícone SVG, rótulo de estado, Escape com retorno de foco e fechamento ao clicar fora |
| Carrossel | Passo fixo de 26 px não correspondia a todos os gaps; indicadores recriados durante rolagem | Medida real do card/gap, indicadores apenas para posições alcançáveis e foco preservado |

Preservados título e textos comerciais aprovados, identidade preta/vermelha, todas as seções, imagens locais, filtros, favoritos, detalhes, formulários, links oficiais e mapa. Os textos de avaliações sem fonte foram refinados sem inventar notas ou depoimentos. Nenhuma família tipográfica, biblioteca de animação ou dependência foi adicionada.

## Comparação medida

Em 1199 px, cabeçalho (70 px), hero (407 px), início da busca (y=477) e início dos cards (y=630) mantêm as referências anteriores. Os cards ficaram cerca de 6 px mais altos para melhorar leitura e botões.

| Área | Antes | Depois |
|---|---:|---:|
| Avaliações — 1199 px | 420 px | 223 px |
| Localização — 1199 px | 663 px | 563 px |
| Página completa — 1199 px | 2414 px | 2122 px |
| Avaliações — 375 px | 509 px | 339 px |
| Localização — 375 px | 1066 px | 941 px |
| Página completa — 375 px | 3917 px | 3626 px |

Medidas completas: `refinement-before.json` e `refinement-after.json`. A redução de altura não é um índice de qualidade ou de fidelidade pixel a pixel; reflete a remoção de espaços e enquadramentos sem conteúdo.

## Validação

- `npm.cmd test`: **7 testes passaram**. Filtros dependentes, busca e estado vazio, detalhes, favoritos, interesse local, menu, carrosséis, redução de movimento, estados da integração de avaliações e iframe real.
- `npm.cmd run build`: **passou**.
- `node scripts/refinement-audit.mjs after`: sem overflow e sem erros JavaScript nas cinco larguras.
- `node scripts/check-map.mjs`: mapa real e atribuição Google verificados; capturas visíveis em quatro larguras, incluindo 375 px.
- A captura completa pode deixar o iframe lazy sem pintura quando ele está fora da viewport. A detecção de atribuição em DOM não foi conclusiva em duas capturas responsivas. As capturas dedicadas `map-375.png`, `map-768.png`, `map-1024.png` e `map-1440.png` mostram a verificação visual independente do mapa carregado; não foram usadas imagens falsas para preencher os espaços.
- Dados sintéticos de avaliações existem somente em respostas interceptadas pelo Playwright e não entram na publicação.

## Limitações e pendências

- Confirmar WhatsApp, telefone e horários. Não foram usados os contatos ilustrativos do mockup.
- Avaliações dentro do site dependem de fonte autorizada/servidor Google Places. O perfil oficial fornecido permanece acessível. Não há média, contagem ou comentário inventado.
- Estoque e preços continuam demonstrativos, com aviso explícito. Confirmar ofertas e imagens reais antes de tratá-los como estoque comercial.
- Fotografias fornecidas são recortes ampliados, com definição limitada e elementos incorporados. Pequenas diferenças de enquadramento e da área coberta pelo favorito permanecem.
- O arquivo tipográfico e os ícones originais do mockup não foram fornecidos. Roboto e SVGs locais aproximam a referência; não há alegação de reprodução de 100%.

## Arquivos e publicação

Alterados: `src/styles.css`, `src/experience.css`, `src/experience.js`, `src/main.js` e expectativa do estado sem avaliações em `tests/premium.spec.js`. Adicionados: `tests/refinement.spec.js`, `scripts/refinement-audit.mjs` e este relatório/capturas.

Atualizado o mesmo projeto Vercel `gn-digital/motta-multimarcas`, com resultado READY: https://motta-multimarcas.vercel.app.
