# Sistema de detalhes dos veículos — Motta Multimarcas / GVN DIGITAL

> Registro histórico da primeira versão estática. O catálogo fixo descrito abaixo foi substituído pela integração Supabase; as rotas agora têm metadados dinâmicos no Vercel. Consulte `ADMINISTRACAO.md` para a arquitetura, a ativação e o estado atual. A integração remota ainda aguarda acesso autorizado ao projeto da Motta.

## Entrega

O modal antigo de detalhes foi substituído por páginas individuais. Header, rodapé, identidade visual e homepage existentes foram preservados. Os cards agora contêm links navegáveis, inclusive com abertura em outra aba, e um atalho discreto de consulta pelo WhatsApp.

Rotas publicadas no mesmo domínio:

- `/veiculos/volkswagen-polo-2023`
- `/veiculos/jeep-compass-longitude-2024`
- `/veiculos/chevrolet-onix-ltz-2023`
- `/veiculos/toyota-corolla-xei-2022`

O Vite gera HTML específico para cada rota, com título, meta description, canonical, Open Graph, imagem de capa e BreadcrumbList. Não depende de uma primeira visita à homepage para abrir um veículo. Os registros demonstrativos usam `noindex,follow`; não foram adicionadas ofertas ou avaliações estruturadas fictícias.

## Galeria

Cada veículo tem sua coleção própria com `vehicleId`, `id`, `url`, `alt`, `category`, `sortOrder` e `isCover`. A capa aparece primeiro, seguida da ordenação cadastrada. Imagens com `vehicleId` divergente são descartadas da galeria.

São suportadas categorias `exterior`, `interior` e `details`. Há fotografia principal, miniaturas, contador, navegação, lightbox, fechamento por Escape, setas de teclado e gesto horizontal de toque. A proporção das imagens é preservada com `object-fit: contain`. As setas ficam desabilitadas quando há somente uma fotografia.

**Material disponível:** uma fotografia externa por veículo. Não foram criadas fotos internas, traseiras, de motor ou de outros ângulos. Interior e Detalhes exibem estado vazio. As fotos atuais são recortes ampliados do mockup e contêm corações incorporados; a resolução efetiva limita a qualidade da ampliação. Não há mistura de imagens entre veículos.

## Interesse e WhatsApp

Configurado exatamente o número informado pelo cliente: **+55 51 9219-2120**, normalizado para `555192192120` em `wa.me`. Não foi acrescentado outro dígito ao número.

O botão “Tenho interesse neste veículo” abre um formulário com nome opcional, sete assuntos selecionáveis e dúvida opcional. A identificação do veículo é automática. É possível conferir a mensagem antes de abrir o WhatsApp. Nenhuma mensagem é enviada automaticamente e nenhum dado do formulário é transmitido a um backend.

“Consultar no WhatsApp”, nos cards da homepage e dos relacionados, abre diretamente uma mensagem de disponibilidade do veículo correspondente. Se o número estiver vazio ou inválido, o fluxo mostra a pendência e não gera um link inválido.

Exemplo de mensagem gerada sem nome ou dúvida, selecionando financiamento e troca:

```text
Olá! Tudo bem?

Tenho interesse no veículo:
Chevrolet Onix 1.0 LTZ
Ano: 2023

Valor demonstrativo: R$ 79.900

Vi que este veículo é demonstrativo. Gostaria de confirmar as informações e a disponibilidade com a loja.

Gostaria de receber informações sobre:
- Condições de financiamento
- Possibilidade de troca

Link do veículo: https://motta-multimarcas.vercel.app/veiculos/chevrolet-onix-ltz-2023

Aguardo o retorno de vocês. Obrigado!
```

O nome e a dúvida só aparecem quando preenchidos. O URL usa a origem real da página visitada, inclusive em um futuro domínio próprio. O texto é codificado com `encodeURIComponent`.

## Cadastro e futura administração

Não existe painel, banco de dados, serviço de upload ou autenticação neste projeto. Nenhum deles foi simulado.

A fonte única continua em `src/data.js`, agora com slugs, status, especificações, descrição, equipamentos e coleção de imagens. O cadastro local pode ser alterado pelo responsável técnico e publicado em novo build. Um futuro painel deverá persistir e entregar esse mesmo contrato, sem criar um catálogo paralelo.

Campos do veículo:

| Campo | Uso |
|---|---|
| `id`, `slug` | Identidade e URL únicas |
| `brand`, `model`, `version`, `year`, `km`, `price` | Dados básicos existentes |
| `status` | `demonstration`, `available`, `reserved`, `sold`, `unavailable` |
| `description` | Descrição real, omitida quando vazia |
| `specifications` | `transmission`, `fuel`, `color`, `engine`, `doors` — somente dados confirmados |
| `features` | Lista de equipamentos confirmados |
| `images` | Coleção exclusiva do veículo |

Para cadastrar fotos: colocar os arquivos reais em `public/`, associar os URLs ao veículo correto, definir categoria, ordem e capa no registro. Excluir uma entrada remove a foto da galeria no próximo build; não exclui automaticamente o arquivo físico. Persistência por painel e armazenamento de uploads dependem de infraestrutura futura, com acesso administrativo protegido.

O build rejeita slugs inválidos ou duplicados. Descrição, opcionais e especificações ausentes são omitidos ou identificados como não confirmados. Valores e veículos atuais continuam explicitamente demonstrativos.

## Arquivos

Criados:

- `src/vehicle-model.js`: contrato compartilhado, imagens, mensagens e metadados.
- `src/vehicle-view.js`: página e formulário reutilizáveis, sem dependência de DOM para gerar HTML.
- `src/vehicle-details.js`: comportamento da página, galeria, lightbox e contato.
- `src/vehicle-details.css`: estilos responsivos seguindo os tokens existentes.
- `vite.config.js`: geração dos HTMLs por slug.
- `tests/vehicles.spec.js`: testes do sistema.

Modificados: `src/data.js`, `src/main.js` e `tests/homepage.spec.js`, que agora valida navegação real em vez do modal removido.

## Validação executada

- `npm.cmd test`: **12 testes passaram**.
- `npm.cmd run build`: **passou**, com os quatro HTMLs individuais.
- Cada card abriu o veículo e a foto corretos; reload direto funcionou.
- Categorias Exterior/Interior, estado vazio, lightbox e Escape testados.
- Galeria com múltiplas imagens, teclado e toque testados com fixtures SVG isoladas no Playwright. Essas fixtures não entram no catálogo, nos arquivos públicos ou no build.
- Mensagem com nome, assuntos, dúvida, ano, valor e URL verificada; abertura de WhatsApp interceptada para não abrir conversas reais durante os testes.
- Atalho direto verificado sem reutilizar a identificação do veículo anterior.
- Telefone ausente testado com envio desabilitado.
- 375, 768, 1024 e 1440 px sem overflow. Capturas em `artifacts/vehicle-*.png` correspondem ao teste do telefone ausente; não representam a configuração comercial atual.
- HTML gerado inspecionado: título, capa, metadados e JSON-LD válidos; arquivos de imagens confirmados.
- Fluxos anteriores de filtros, favoritos, avaliações, mapa e movimento reduzido continuam passando.

## Pendências reais

Fotografias adicionais de cada veículo; especificações e equipamentos confirmados; descrição comercial; estoque e disponibilidade reais; condições de negociação. O estado demonstrativo só deve ser alterado após confirmação pela loja. Horários e telefone fixo permanecem pendentes. Avaliações do Google dentro da homepage continuam dependendo de integração autorizada, conforme documentação anterior.
