# Administração Motta Multimarcas — GVN DIGITAL

## Estado da entrega local

Implementação local do painel em `/admin`, migrations, função de upload e integração da vitrine com Supabase. **A integração remota ainda não está ativada.** O projeto informado pelo cliente é `uujzysypvefhzozogpjz`. As ferramentas conectadas retornaram `You do not have permission to perform this action` ao consultar esse projeto. O único projeto acessível nesta sessão pertence a outro sistema e não foi modificado.

Sem a configuração real, `/admin` mostra o login com acesso desabilitado e aviso de conexão pendente. Não existe modo demonstrativo, conta padrão, senha de teste, atalho sem autenticação ou cadastro administrativo em localStorage. O catálogo público fica vazio, preservando o restante da homepage. Os quatro registros antigos foram movidos para fixtures exclusivas dos testes.

Não foram aplicadas migrations remotas, criados usuários reais, enviados arquivos reais ao Storage nem feita publicação. A aplicação não deve ser apresentada como produção ativa antes da configuração e dos testes remotos abaixo.

## Arquitetura

- `src/entry.js`: separa a aplicação pública da administrativa.
- `src/admin/`: login, autorização, painel, estoque, cadastro em seis etapas, fotos, tarefas, movimentações, documentos, clientes, negociações, vendas, financeiro, relatórios e configurações.
- `src/lib/supabase.js`: cliente público, consultas paginadas, comandos transacionais e chamada de upload.
- `src/catalog.js`: lê apenas as projeções públicas, assina Realtime e reconcilia a cada 15 segundos e ao recuperar foco/conexão.
- `api/vehicle-page.js`: HTML e metadados atuais das páginas de veículos no Vercel, consultando somente a projeção pública. Retorna 404 para anúncios ausentes e 503 quando o catálogo está indisponível. Sem cache de anúncios desatualizados.
- `supabase/migrations/20261111214611_motta_administration.sql`: esquema, constraints, índices, RLS, auditoria, buckets, projeções públicas e RPCs.
- `supabase/functions/motta-upload/`: endpoint autenticado para validar e armazenar arquivos.

A homepage, os filtros, os favoritos, o WhatsApp, o mapa, as avaliações, as galerias e o layout público existentes foram preservados. Os favoritos continuam sendo uma preferência do navegador. O antigo salvamento local de interesses foi retirado: sem WhatsApp configurado, não há envio nem armazenamento de dados de contato.

## Ativação no projeto correto

1. Conectar o plugin Supabase à conta que possui acesso ao projeto informado. Antes de aplicar a migration, consultar tabelas, migrations, extensões, políticas de Storage e configuração do Data API desse projeto. Não usar o banco de outro sistema como substituto.
2. Revisar/aplicar a migration versionada. Ela não inclui estoque, clientes ou vendas de exemplo. Os dados de WhatsApp e endereço são os já cadastrados no site existente. Verificar o cadastro comercial com o responsável.
3. Publicar a função `motta-upload`, mantendo a verificação de JWT habilitada. O handler também consulta `auth.getUser()` e o perfil ativo antes de qualquer operação privilegiada. As variáveis de servidor `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` devem existir exclusivamente no ambiente confiável da função; o Supabase fornece essas variáveis às funções hospedadas. Nunca colocá-las com prefixo `VITE_`.
4. Copiar os nomes de `.env.example` para `.env.local` e preencher somente a URL e a chave **publishable** do projeto. A URL será `https://uujzysypvefhzozogpjz.supabase.co`. O build rejeita uma chave `sb_secret_` ou `service_role` na variável pública.
5. Criar/convidar o administrador pelo Supabase Auth. Não há cadastro aberto no painel. Com um usuário real confirmado, inserir seu UUID explicitamente em `motta_profiles`, com `role='admin'` e `active=true`. Não promover contas automaticamente com base em e-mail ou `user_metadata`.
6. Em Supabase Auth, configurar Site URL e autorizar os redirects `http://127.0.0.1:5173/admin/redefinir-senha` e o equivalente HTTPS do domínio de produção. Configurar o envio de e-mails e confirmar login e recuperação reais. Desabilitar cadastro público se não for necessário.
7. Configurar as variáveis públicas também no ambiente de hospedagem. `PUBLIC_SITE_URL` deve corresponder ao domínio final para os metadados gerados pelo servidor. Rewrites e função de páginas individuais estão em `vercel.json`.
8. Executar advisors de segurança/performance e validar os fluxos reais com contas dos quatro papéis, incluindo tentativas anônimas e de usuários bloqueados. Confirmar Storage, URLs assinadas, publicação, venda simultânea e Realtime no projeto remoto antes da liberação.

Comandos conferidos com **Supabase CLI 3.1.0** nesta implementação (reconferir `--help` ao mudar de versão):

```powershell
npx.cmd supabase db push --remote=uujzysypvefhzozogpjz --dry-run
npx.cmd supabase db push --remote=uujzysypvefhzozogpjz
npx.cmd supabase functions deploy motta-upload --remote=uujzysypvefhzozogpjz --use-api
npx.cmd supabase db advisors --remote=uujzysypvefhzozogpjz --type all
```

Esses comandos exigem autenticação e acesso ao projeto; não foram executados remotamente. Não usar `--prune`, reset ou comandos destrutivos para ativar este sistema. `supabase/config.toml` descreve o ambiente local; ele não altera automaticamente as configurações do Auth hospedado. A CLI local completa requer Docker; os testes PostgreSQL descritos abaixo usam PGlite sem Docker.

## Permissões

| Área | Administrador | Gerente | Vendedor | Operacional |
|---|---|---|---|---|
| Consultar estoque | Sim | Sim | Sim | Sim |
| Criar/editar cadastro comercial | Sim | Sim | Sim | Não |
| Publicar, reservar, arquivar/restaurar | Sim | Sim | Não | Não |
| Fotografias | Sim | Sim | Consulta | Sim |
| Preparação e tarefas | Sim | Sim | Sim | Sim |
| Clientes e negociações | Sim | Sim | Sim | Não |
| Movimentações manuais | Sim | Sim | Não | Não |
| Documentos privados | Sim | Sim | Não | Não |
| Vendas, custos, financeiro e relatórios | Sim | Sim | Não | Não |
| Configurações e papéis | Sim | Não | Não | Não |
| Recuperar arquivos removidos | Sim | Não | Não | Não |

Papéis vêm de `motta_profiles` e são verificados em cada comando/consulta no banco. Contas autenticadas sem perfil ativo não ganham acesso. Bloqueio de perfil tem efeito nas políticas sem esperar a expiração do JWT. O frontend esconde as ações que o papel não pode executar, mas a proteção efetiva é no banco e na função de upload.

## Integridade e privacidade

As tabelas administrativas não têm leitura anônima nem DML direto para o navegador. As duas tabelas públicas são `motta_catalog` e `motta_public_settings`, com campos explicitamente permitidos. Custos ficam em `motta_vehicle_costs`/`motta_expenses`; documentos, clientes, negociações e vendas nunca entram no catálogo público.

As RPCs públicas são `SECURITY INVOKER`, com execução restrita a autenticados. Os comandos privilegiados e triggers estão no esquema não exposto `motta_private`, com `search_path` fixo e autorização explícita. Não existe uma função de SQL arbitrário nem escolha de tabela enviada pelo cliente. Histórico de operações não pode ser editado/apagado pelo navegador.

A venda bloqueia a linha do veículo, valida disponibilidade e comprador, cria venda e parcelas, atualiza negociações, registra saída e retira o carro do estoque público dentro da mesma transação. Há unicidade de venda por veículo e chave de idempotência. Capa, publicação e projeção também são serializadas pela linha do veículo para evitar ressurgimento de anúncios em concorrência com vendas. Edições com `updated_at` antigo são recusadas.

Nenhum cadastro financeiro ou de venda é excluído definitivamente pela interface. Arquivamento e remoção de arquivos são recuperáveis. Fotos removidas ficam fora da galeria; documentos removidos deixam de receber novas URLs assinadas. Administradores podem recuperar esses registros. Arquivos físicos são retidos, inclusive quando uma falha posterior ao upload deixa um objeto sem metadados. A limpeza física requer uma política de retenção definida pelo responsável e ferramenta de servidor; não há exclusão automática destrutiva.

`vehicle-public-images` contém apenas fotografias comerciais, públicas por natureza. Não enviar documentos a esse bucket. `vehicle-private-documents` é privado, com leitura vinculada a metadados ativos e papel autorizado. URLs de documentos expiram em 60 segundos; uma URL já emitida pode continuar válida até expirar. A criação da URL pela interface registra o acesso, mas não representa confirmação de que o usuário baixou/leu o arquivo.

Os clientes não podem gravar diretamente nos buckets: a função de upload verifica identidade, perfil, vínculo, limite de bytes, MIME e estrutura do arquivo. As imagens são decodificadas no navegador, limitadas a 2200 px, regravadas em WebP com qualidade 90% e novamente inspecionadas no servidor. PDFs precisam de cabeçalho e fechamento válidos. Isso não é um serviço de antivírus. Limites: 10 MB por imagem original e 20 MB por documento. O progresso exibido representa os arquivos concluídos do lote.

## Operação

- Um novo cadastro gera entrada inicial e oito tarefas de preparação. O responsável revisa as tarefas e define a situação operacional; concluí-las não aprova automaticamente o anúncio.
- Publicação exige dados básicos válidos, veículo pronto, ativo e capa cadastrada. Veículos vendidos/retirados não aparecem no estoque disponível. A preferência de vendidos pode exibir anúncios antes aprovados em uma seção pública separada.
- A duplicação cria novo ID, código, slug, entrada e checklist. Não reutiliza fotos, custos, documentos ou vendas.
- Aquisição é privada. Preparação e despesas adicionais são lançadas no Financeiro; a consulta do veículo e os relatórios mostram margem **estimada**, calculada com custos cadastrados. Não confundir valor vendido com recebimento nem margem com lucro líquido.
- Recebimentos e pagamentos de despesas exigem confirmação própria. Entrada no formulário de venda é um recebível, não dinheiro automaticamente recebido.
- O interesse/atendimento de um cliente pode ser registrado manualmente e vinculado a um veículo. Um clique público no WhatsApp não cria atendimento concluído, venda ou lead confirmado.
- Relatórios têm período, CSV com tratamento de fórmulas e versão de impressão/PDF pelo navegador. A busca administrativa é paginada e executada no banco, com debounce; índices de trigramas atendem buscas parciais.
- Avaliações Google continuam dependendo de integração autorizada, conforme `GOOGLE-INTEGRATION.md`.

## Verificação local e limites

```powershell
npm.cmd install
npm.cmd run dev
# Site: http://127.0.0.1:5173/
# Painel: http://127.0.0.1:5173/admin

npm.cmd run test:db
npm.cmd run test:uploads
npm.cmd test
npm.cmd run build
npm.cmd run test:server
```

`test:db` aplica a migration real em PostgreSQL embarcado PGlite, com schemas Auth/Storage e papéis preparados exclusivamente para o teste. Verifica RLS, autorização, projeção pública, constraints, venda, rollback, idempotência, pagamentos, preferências de vendidos e recuperação. Não é uma instância remota completa do Supabase e não substitui o teste remoto de concorrência entre conexões.

`test:uploads` executa o handler real com dependências isoladas e verifica autorização, conteúdo e destino. Não envia arquivos reais para o Supabase.

Os testes Playwright usam Microsoft Edge e fixtures de rede isoladas para exercitar login, permissões de tela, cadastros, uploads, documentos, navegação, exportação e atualização automática do catálogo. Os testes antigos da vitrine continuam usando fixtures exclusivas dos testes. As fixtures não entram no bundle de produção nem são uma fonte alternativa do catálogo. Capturas `artifacts/admin-dashboard-fixture-*.png` representam esse cenário de teste; `artifacts/admin-login-local.png` representa o estado local sem conexão.

`test:server` valida metadados e respostas 404/503 com upstream isolado e exige o build existente. `test:all` executa as verificações em sequência. Os testes de navegador precisam do servidor local ativo; um teste do mapa também depende da rede.

Os resultados locais não comprovam login, e-mail, bucket, função, RLS existente ou publicação no projeto remoto inacessível. Essas verificações permanecem pendentes da conexão autorizada.

## Referência visual

O arquivo `Mockup Painel Administrativo Motta.png` não estava em `img`. Foi usada a referência anexada na conversa. A implementação recria sidebar, header, indicadores, gráfico, atividades, tarefas, ações rápidas e tabela com HTML/CSS funcionais. Mantém o logotipo disponível no projeto, que difere da versão branca da referência. Os números e a disponibilidade das ações dependem dos dados e do papel; não foram copiados os indicadores fictícios da imagem.

Documentação oficial consultada: [Auth](https://supabase.com/docs/guides/auth/passwords), [segurança de Storage](https://supabase.com/docs/guides/storage/security/access-control), [Realtime](https://supabase.com/docs/guides/realtime/postgres-changes), [autenticação de funções](https://supabase.com/docs/guides/functions/auth).Banco remoto ativado em 11/11/2026 no projeto correto `uujzysypvefhzozogpjz`, pela conex?o `motta_multimarcas`. O bloqueio de permiss?o anterior foi resolvido. O projeto estava saud?vel, sem tabelas p?blicas, migrations, buckets, fun??es ou usu?rios antes da ativa??o.

A migration versionada foi aplicada pelo MCP como `motta_administration`. Foram verificadas 18 tabelas com RLS, buckets `vehicle-public-images` p?blico e `vehicle-private-documents` privado, e publica??o Realtime de `motta_catalog` e `motta_public_settings`. A fun??o `motta-upload` est? ACTIVE, vers?o 1, com `verify_jwt=true`. A URL e a chave publishable foram adicionadas ao `.env.local`, preservando as vari?veis existentes. Nenhuma chave secreta foi adicionada ao frontend.

Valida??o: 8 verifica??es HTTP remotas passaram (cat?logo e configura??es p?blicos, bloqueio de ve?culos/clientes/comandos/uploads an?nimos, CORS e disponibilidade do Auth). O cat?logo e o estoque continuam vazios. Advisors de seguran?a e sa?de sem apontamentos; performance apenas com ?ndices ainda n?o usados no banco novo. Passaram tamb?m 26 testes locais PostgreSQL, 9 do handler de upload, 3 da rota de servidor e build Vite. Esses testes locais n?o equivalem a testes autenticados remotos.

**Pend?ncias:** identificar/criar o primeiro usu?rio real e perfil admin; configurar Site URL, redirects, envio de e-mails e desabilitar cadastro p?blico (a consulta remota ainda indica cadastro habilitado); configurar vari?veis da hospedagem; validar login/recupera??o, uploads autenticados, documentos, publica??o/venda e Realtime com contas autorizadas. N?o houve publica??o do site nem cria??o de usu?rios nesta ativa??o. As ferramentas MCP dispon?veis n?o oferecem cria??o de usu?rios nem altera??o da configura??o de Auth.

## Arquitetura

- `src/entry.js`: separa a aplicação pública da administrativa.
- `src/admin/`: login, autorização, painel, estoque, cadastro em seis etapas, fotos, tarefas, movimentações, documentos, clientes, negociações, vendas, financeiro, relatórios e configurações.
- `src/lib/supabase.js`: cliente público, consultas paginadas, comandos transacionais e chamada de upload.
- `src/catalog.js`: lê apenas as projeções públicas, assina Realtime e reconcilia a cada 15 segundos e ao recuperar foco/conexão.
- `api/vehicle-page.js`: HTML e metadados atuais das páginas de veículos no Vercel, consultando somente a projeção pública. Retorna 404 para anúncios ausentes e 503 quando o catálogo está indisponível. Sem cache de anúncios desatualizados.
- `supabase/migrations/20261111214611_motta_administration.sql`: esquema, constraints, índices, RLS, auditoria, buckets, projeções públicas e RPCs.
- `supabase/functions/motta-upload/`: endpoint autenticado para validar e armazenar arquivos.

A homepage, os filtros, os favoritos, o WhatsApp, o mapa, as avaliações, as galerias e o layout público existentes foram preservados. Os favoritos continuam sendo uma preferência do navegador. O antigo salvamento local de interesses foi retirado: sem WhatsApp configurado, não há envio nem armazenamento de dados de contato.

## Ativação no projeto correto

1. Conectar o plugin Supabase à conta que possui acesso ao projeto informado. Antes de aplicar a migration, consultar tabelas, migrations, extensões, políticas de Storage e configuração do Data API desse projeto. Não usar o banco de outro sistema como substituto.
2. Revisar/aplicar a migration versionada. Ela não inclui estoque, clientes ou vendas de exemplo. Os dados de WhatsApp e endereço são os já cadastrados no site existente. Verificar o cadastro comercial com o responsável.
3. Publicar a função `motta-upload`, mantendo a verificação de JWT habilitada. O handler também consulta `auth.getUser()` e o perfil ativo antes de qualquer operação privilegiada. As variáveis de servidor `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` devem existir exclusivamente no ambiente confiável da função; o Supabase fornece essas variáveis às funções hospedadas. Nunca colocá-las com prefixo `VITE_`.
4. Copiar os nomes de `.env.example` para `.env.local` e preencher somente a URL e a chave **publishable** do projeto. A URL será `https://uujzysypvefhzozogpjz.supabase.co`. O build rejeita uma chave `sb_secret_` ou `service_role` na variável pública.
5. Criar/convidar o administrador pelo Supabase Auth. Não há cadastro aberto no painel. Com um usuário real confirmado, inserir seu UUID explicitamente em `motta_profiles`, com `role='admin'` e `active=true`. Não promover contas automaticamente com base em e-mail ou `user_metadata`.
6. Em Supabase Auth, configurar Site URL e autorizar os redirects `http://127.0.0.1:5173/admin/redefinir-senha` e o equivalente HTTPS do domínio de produção. Configurar o envio de e-mails e confirmar login e recuperação reais. Desabilitar cadastro público se não for necessário.
7. Configurar as variáveis públicas também no ambiente de hospedagem. `PUBLIC_SITE_URL` deve corresponder ao domínio final para os metadados gerados pelo servidor. Rewrites e função de páginas individuais estão em `vercel.json`.
8. Executar advisors de segurança/performance e validar os fluxos reais com contas dos quatro papéis, incluindo tentativas anônimas e de usuários bloqueados. Confirmar Storage, URLs assinadas, publicação, venda simultânea e Realtime no projeto remoto antes da liberação.

Comandos conferidos com **Supabase CLI 3.1.0** nesta implementação (reconferir `--help` ao mudar de versão):

```powershell
npx.cmd supabase db push --remote=uujzysypvefhzozogpjz --dry-run
npx.cmd supabase db push --remote=uujzysypvefhzozogpjz
npx.cmd supabase functions deploy motta-upload --remote=uujzysypvefhzozogpjz --use-api
npx.cmd supabase db advisors --remote=uujzysypvefhzozogpjz --type all
```

Esses comandos exigem autenticação e acesso ao projeto; não foram executados remotamente. Não usar `--prune`, reset ou comandos destrutivos para ativar este sistema. `supabase/config.toml` descreve o ambiente local; ele não altera automaticamente as configurações do Auth hospedado. A CLI local completa requer Docker; os testes PostgreSQL descritos abaixo usam PGlite sem Docker.

## Permissões

| Área | Administrador | Gerente | Vendedor | Operacional |
|---|---|---|---|---|
| Consultar estoque | Sim | Sim | Sim | Sim |
| Criar/editar cadastro comercial | Sim | Sim | Sim | Não |
| Publicar, reservar, arquivar/restaurar | Sim | Sim | Não | Não |
| Fotografias | Sim | Sim | Consulta | Sim |
| Preparação e tarefas | Sim | Sim | Sim | Sim |
| Clientes e negociações | Sim | Sim | Sim | Não |
| Movimentações manuais | Sim | Sim | Não | Não |
| Documentos privados | Sim | Sim | Não | Não |
| Vendas, custos, financeiro e relatórios | Sim | Sim | Não | Não |
| Configurações e papéis | Sim | Não | Não | Não |
| Recuperar arquivos removidos | Sim | Não | Não | Não |

Papéis vêm de `motta_profiles` e são verificados em cada comando/consulta no banco. Contas autenticadas sem perfil ativo não ganham acesso. Bloqueio de perfil tem efeito nas políticas sem esperar a expiração do JWT. O frontend esconde as ações que o papel não pode executar, mas a proteção efetiva é no banco e na função de upload.

## Integridade e privacidade

As tabelas administrativas não têm leitura anônima nem DML direto para o navegador. As duas tabelas públicas são `motta_catalog` e `motta_public_settings`, com campos explicitamente permitidos. Custos ficam em `motta_vehicle_costs`/`motta_expenses`; documentos, clientes, negociações e vendas nunca entram no catálogo público.

As RPCs públicas são `SECURITY INVOKER`, com execução restrita a autenticados. Os comandos privilegiados e triggers estão no esquema não exposto `motta_private`, com `search_path` fixo e autorização explícita. Não existe uma função de SQL arbitrário nem escolha de tabela enviada pelo cliente. Histórico de operações não pode ser editado/apagado pelo navegador.

A venda bloqueia a linha do veículo, valida disponibilidade e comprador, cria venda e parcelas, atualiza negociações, registra saída e retira o carro do estoque público dentro da mesma transação. Há unicidade de venda por veículo e chave de idempotência. Capa, publicação e projeção também são serializadas pela linha do veículo para evitar ressurgimento de anúncios em concorrência com vendas. Edições com `updated_at` antigo são recusadas.

Nenhum cadastro financeiro ou de venda é excluído definitivamente pela interface. Arquivamento e remoção de arquivos são recuperáveis. Fotos removidas ficam fora da galeria; documentos removidos deixam de receber novas URLs assinadas. Administradores podem recuperar esses registros. Arquivos físicos são retidos, inclusive quando uma falha posterior ao upload deixa um objeto sem metadados. A limpeza física requer uma política de retenção definida pelo responsável e ferramenta de servidor; não há exclusão automática destrutiva.

`vehicle-public-images` contém apenas fotografias comerciais, públicas por natureza. Não enviar documentos a esse bucket. `vehicle-private-documents` é privado, com leitura vinculada a metadados ativos e papel autorizado. URLs de documentos expiram em 60 segundos; uma URL já emitida pode continuar válida até expirar. A criação da URL pela interface registra o acesso, mas não representa confirmação de que o usuário baixou/leu o arquivo.

Os clientes não podem gravar diretamente nos buckets: a função de upload verifica identidade, perfil, vínculo, limite de bytes, MIME e estrutura do arquivo. As imagens são decodificadas no navegador, limitadas a 2200 px, regravadas em WebP com qualidade 90% e novamente inspecionadas no servidor. PDFs precisam de cabeçalho e fechamento válidos. Isso não é um serviço de antivírus. Limites: 10 MB por imagem original e 20 MB por documento. O progresso exibido representa os arquivos concluídos do lote.

## Operação

- Um novo cadastro gera entrada inicial e oito tarefas de preparação. O responsável revisa as tarefas e define a situação operacional; concluí-las não aprova automaticamente o anúncio.
- Publicação exige dados básicos válidos, veículo pronto, ativo e capa cadastrada. Veículos vendidos/retirados não aparecem no estoque disponível. A preferência de vendidos pode exibir anúncios antes aprovados em uma seção pública separada.
- A duplicação cria novo ID, código, slug, entrada e checklist. Não reutiliza fotos, custos, documentos ou vendas.
- Aquisição é privada. Preparação e despesas adicionais são lançadas no Financeiro; a consulta do veículo e os relatórios mostram margem **estimada**, calculada com custos cadastrados. Não confundir valor vendido com recebimento nem margem com lucro líquido.
- Recebimentos e pagamentos de despesas exigem confirmação própria. Entrada no formulário de venda é um recebível, não dinheiro automaticamente recebido.
- O interesse/atendimento de um cliente pode ser registrado manualmente e vinculado a um veículo. Um clique público no WhatsApp não cria atendimento concluído, venda ou lead confirmado.
- Relatórios têm período, CSV com tratamento de fórmulas e versão de impressão/PDF pelo navegador. A busca administrativa é paginada e executada no banco, com debounce; índices de trigramas atendem buscas parciais.
- Avaliações Google continuam dependendo de integração autorizada, conforme `GOOGLE-INTEGRATION.md`.

## Verificação local e limites

```powershell
npm.cmd install
npm.cmd run dev
# Site: http://127.0.0.1:5173/
# Painel: http://127.0.0.1:5173/admin

npm.cmd run test:db
npm.cmd run test:uploads
npm.cmd test
npm.cmd run build
npm.cmd run test:server
```

`test:db` aplica a migration real em PostgreSQL embarcado PGlite, com schemas Auth/Storage e papéis preparados exclusivamente para o teste. Verifica RLS, autorização, projeção pública, constraints, venda, rollback, idempotência, pagamentos, preferências de vendidos e recuperação. Não é uma instância remota completa do Supabase e não substitui o teste remoto de concorrência entre conexões.

`test:uploads` executa o handler real com dependências isoladas e verifica autorização, conteúdo e destino. Não envia arquivos reais para o Supabase.

Os testes Playwright usam Microsoft Edge e fixtures de rede isoladas para exercitar login, permissões de tela, cadastros, uploads, documentos, navegação, exportação e atualização automática do catálogo. Os testes antigos da vitrine continuam usando fixtures exclusivas dos testes. As fixtures não entram no bundle de produção nem são uma fonte alternativa do catálogo. Capturas `artifacts/admin-dashboard-fixture-*.png` representam esse cenário de teste; `artifacts/admin-login-local.png` representa o estado local sem conexão.

`test:server` valida metadados e respostas 404/503 com upstream isolado e exige o build existente. `test:all` executa as verificações em sequência. Os testes de navegador precisam do servidor local ativo; um teste do mapa também depende da rede.

Os resultados locais não comprovam login, e-mail, bucket, função, RLS existente ou publicação no projeto remoto inacessível. Essas verificações permanecem pendentes da conexão autorizada.

## Referência visual

O arquivo `Mockup Painel Administrativo Motta.png` não estava em `img`. Foi usada a referência anexada na conversa. A implementação recria sidebar, header, indicadores, gráfico, atividades, tarefas, ações rápidas e tabela com HTML/CSS funcionais. Mantém o logotipo disponível no projeto, que difere da versão branca da referência. Os números e a disponibilidade das ações dependem dos dados e do papel; não foram copiados os indicadores fictícios da imagem.

Documentação oficial consultada: [Auth](https://supabase.com/docs/guides/auth/passwords), [segurança de Storage](https://supabase.com/docs/guides/storage/security/access-control), [Realtime](https://supabase.com/docs/guides/realtime/postgres-changes), [autenticação de funções](https://supabase.com/docs/guides/functions/auth).


## Primeiro administrador ? 11/11/2026

Conta `mottaadminpage@gmail.com` criada pela API administrativa oficial do Auth, com senha inicial aleat?ria fornecida exclusivamente na conversa. UUID `5718114c-ce78-44c4-be88-767ac08d582b`, perfil Administrador Motta Multimarcas, role admin e active=true. Nenhuma senha foi salva no reposit?rio. Validados login real, leitura do pr?prio perfil e RPC motta_dashboard. A sess?o de valida??o foi encerrada. A fun??o tempor?ria motta-admin-bootstrap foi substitu?da por um handler inerte HTTP 410 e seu bloqueio foi validado. Recomenda-se trocar a senha inicial ap?s o primeiro acesso.
