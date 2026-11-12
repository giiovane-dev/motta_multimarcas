# Logotipos bancários — entrega

## Arquivos locais e origem

| Instituição | Arquivo público | Origem utilizada |
|---|---|---|
| Bradesco | `/img/bancos/bradesco.svg` | `Bradesco S.A/bradesco com nome.svg` |
| Itaú | `/img/bancos/itau.svg` | `Itaú Unibanco S.A/logo-nova-letras-brancas.svg` |
| Safra | `/img/bancos/safra.svg` | `Banco Safra S.A/logo-safra-nome.svg` |
| Daycoval | `/img/bancos/daycoval.svg` | `Banco Daycoval/logo-Daycoval- maior.svg` |
| C6 Bank | `/img/bancos/c6-bank.svg` | `Banco C6 S.A/c6 bank- nome- branco.svg` |
| Banco PAN | `/img/bancos/banco-pan.svg` | `Banco Pan/bancoPan-nome.svg` |
| BV | `/img/bancos/bv.svg` | SVG atual do site oficial do BV, descrito abaixo |
| Omni | `/img/bancos/omni.svg` | `Omni/logo-omni.svg` |

Os arquivos estão em `public/img/bancos/`. Sete são do [repositório indicado pelo cliente](https://github.com/Tgentil/Bancos-em-SVG), cuja estrutura foi consultada pela API do GitHub antes do download. Não há hotlink para o GitHub nos componentes.

O arquivo `Banco Votorantim/banco-bv-logo.svg` também foi baixado para inspeção, mas foi descartado da versão final por mostrar a identidade antiga em duas cores. O [site oficial do BV apresenta a evolução e a marca atual](https://www.bv.com.br/institucional/o-banco). Foi utilizado o [SVG atual servido pelo próprio banco](https://www.bv.com.br/documents/20121/2904434/logo-bv-2026.svg/4c1d553e-ecac-093c-6f09-3a017551dab5?version=1.0&t=1783962382727), salvo localmente como `bv.svg`, sem redesenho nem mudança de cor.

Car Bank permanece em texto e na mesma posição. Omni já estava corrigida e foi preservada.

## Licença e marcas

O [README do repositório](https://github.com/Tgentil/Bancos-em-SVG#licen%C3%A7a) informa que os logotipos pertencem aos bancos e que a coleção não constitui afiliação ou endosso. A API não declara uma licença geral de software. A utilização nesta seção foi solicitada pelo proprietário do site; isso não é uma comprovação independente de licença ou autorização concedida pelos bancos. As marcas não foram recriadas, recoloridas ou apresentadas como comprovação de parceria formal.

## Inspeção e apresentação

Todos os oito SVGs finais foram analisados como XML. Não há scripts, foreignObject, manipuladores de evento, imports de CSS ou referências externas nos arquivos finais. Metadados de editor foram removidos. O viewBox foi ajustado à área gráfica com margem, retirando o espaço vazio dos arquivos quadrados sem modificar os caminhos, cores ou proporções. A renderização ocorre por `<img>`, não por SVG injetado na homepage.

Cards escuros preservados. Bradesco, Safra, BV e Omni recebem uma superfície neutra clara dentro do card para contraste; C6 e PAN usam as variantes claras existentes no repositório. Tamanhos individuais foram ajustados com `object-fit: contain`. Desktop com três colunas e mobile com duas, mantendo fade-in, hover discreto e movimento reduzido.

## Componentes e dados

- `src/financing.js`: identificação dos assets locais para ajuste visual; fallback textual mantido.
- `src/financing.css`: grid de três colunas, dimensões individuais e contraste.
- `src/admin/financing.css`: contraste das miniaturas administrativas.
- `public/img/bancos/*.svg`: oito arquivos locais.

No Supabase foram atualizados somente `logo_url` e `logo_authorized` dos oito registros existentes. UUIDs, nomes, ordem, ativação e o cadastro Car Bank foram preservados. Não houve duplicação, remoção, alteração de schema, RLS ou mudanças na autenticação. O administrador continua podendo gerenciar todas as instituições.

## Validação executada

- Oito arquivos aprovados na inspeção de segurança e carregamento SVG.
- Três testes Playwright específicos da seção e do gerenciamento administrativo aprovados.
- Build Vite aprovado.
- Publicação Vercel concluída e verificada no domínio de produção.
- Produção: nove cards, oito imagens decodificadas com sucesso, Car Bank em texto, três colunas em desktop, nenhuma exceção JavaScript.
- Sem overflow horizontal em 1024, 768, 390 e 320 px.
- Capturas de produção: `artifacts/bank-logos-production-desktop.png` e `artifacts/bank-logos-production-mobile.png`.
