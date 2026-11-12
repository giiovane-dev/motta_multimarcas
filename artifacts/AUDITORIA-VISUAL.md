# Auditoria visual — Motta Multimarcas

Comparação real no Microsoft Edge, viewport de 1199 px, escala 1, com `img/Homepage da Motta Multimarcas.png` (1199 × 1312). Capturas completas: `audit-before.png` e `audit-after.png`. Geometria do DOM registrada nos JSON correspondentes. Imagens e fontes aguardadas antes da captura final.

| Elemento | Antes | Depois | Referência visual |
|---|---:|---:|---:|
| Altura do cabeçalho | 75 | 70 | 70 |
| Altura do hero | 435 | 407 | 407 |
| Topo da barra de busca | 510 | 477 | 477 |
| Altura da barra de busca | 79 | 73 | 73 |
| Topo dos cards | 674 | 630 | 630 |
| Largura dos cards | 236 | 242 | aproximadamente 242 |
| Altura dos cards | 303 | 292 | aproximadamente 290 |
| Topo do financiamento | 1043 | 966 | aproximadamente 964 |
| Início do rodapé | 1175 | 1089 | aproximadamente 1087 |
| Altura total | 1439 | 1312 | 1312 |

Medidas em pixels. As medidas da referência foram lidas visualmente; as da implementação foram obtidas pelo navegador. A igualdade de altura total não significa igualdade pixel a pixel.

## Correções

- Tipografia Roboto servida localmente, pesos 400/500/700; ajuste de tamanho, entrelinha e espaçamento dos títulos.
- Cabeçalho, logotipo, menu e botões com proporções e espaçamentos revistos.
- Hero e fachada reduzidos, letreiro reposicionado à direita e overlays refinados sem distorcer a foto.
- Benefícios reposicionados, com textos em duas linhas no desktop.
- Busca: larguras, rótulos, campos, altura e alinhamentos corrigidos.
- Estoque: posição, largura e altura dos cards, alinhamento de informações, preços e botões.
- Financiamento: proporção, recorte inclinado, cores, divisória e botão.
- Rodapé: colunas, logotipo, margens e linha inferior.
- Nenhuma funcionalidade nova.

## Diferenças remanescentes

- A imagem preparada da fachada é um recorte diferente da composição completa do mockup. O letreiro se aproxima em escala e posição, mas a fachada não preenche toda a área inferior e esquerda da mesma forma. Preservadas as proporções e os pixels do material fornecido; nenhum trecho foi inventado.
- As fotos dos carros já contêm corações e são recortes ampliados de baixa definição. Os controles reais cobrem esses elementos; a região pode apresentar pequenas diferenças. Os enquadramentos dos carros não são idênticos ao mockup.
- Fonte escolhida por semelhança visual; o arquivo tipográfico original do design não foi fornecido. Persistem diferenças pequenas de desenho, peso e rasterização.
- Ícones SVG de benefícios e financiamento aproximam o tema, mas não reproduzem exatamente os desenhos do mockup. O banner foi reconstruído em HTML/CSS para preservar legibilidade e interação.
- Contatos, redes e horários ilustrativos não foram copiados. Textos pendentes e aviso de estoque demonstrativo permanecem. O financiamento mantém o aviso de análise de crédito.
- No desktop, quatro veículos cabem: as setas permanecem desabilitadas e há um indicador real de posição, em vez dos três pontos decorativos do mockup. Esse comportamento não foi alterado nesta auditoria.
- Pequenas diferenças de bordas, gradientes e posições de poucos pixels permanecem. Não há alegação de fidelidade de 100%.

## Verificação

`node scripts/visual-audit.mjs after`: captura e medição na largura oficial.

`npm.cmd test`: teste existente de filtros, resultados vazios, favoritos, detalhes, interesse local, menu mobile, carrossel, carregamento de imagens, erros JavaScript e overflow em 768/390 px.

`npm.cmd run build`: compilação de produção.

Servidor local mantido em http://127.0.0.1:5173/.
