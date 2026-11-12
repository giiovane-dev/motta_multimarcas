# Ficha cadastral simples — Motta Multimarcas

## Atualização: quatro etapas e consulta por CEP

O fluxo atual tem quatro etapas: Seus dados → Seu endereço → Sua profissão → Seu financiamento. Endereço exige CEP, rua, número (ou S/N), bairro, cidade e estado; complemento é opcional. A consulta ViaCEP envia apenas o CEP e preenche rua, bairro, cidade e estado, mantendo edição manual. Falha/CEP inexistente mostra orientação sem impedir preenchimento manual; requisições antigas são canceladas e não sobrescrevem um CEP novo.

Código adicional: `src/financing-address.js`. Endereço estruturado e sua representação completa são validados no servidor e salvos no payload criptografado existente, sem alteração de tabelas ou RLS. Campos separados aparecem somente no detalhe completo autorizado do painel. Fichas antigas permanecem compatíveis. Edge Function atualizada para versão 4 e aviso de privacidade para `ficha-endereco-2026-11-12-v3`; retenção mantida em 90 dias.

Validação desta atualização: seis testes públicos de navegador, um administrativo, 13 de endpoint/validação e build aprovados. Teste SQL remoto com rollback confirmou persistência/recuperação do CEP e bairro sem deixar cadastros sintéticos na base. Referência do serviço: https://viacep.com.br/.

As seções seguintes registram a entrega anterior de três etapas.

Entrega de 12/11/2026. Substitui o fluxo público de quatro etapas por três: **Seus dados**, **Sua profissão** e **Seu financiamento**. Mantém o site e o painel existentes. A coleta foi habilitada com o aviso de finalidade solicitado e retenção de **90 dias**, escolhida pelo usuário; a confirmação jurídica anterior foi mantida na configuração.

## Rotas e operação

- Público: https://motta-multimarcas.vercel.app/simular-financiamento
- Veículo selecionado: `/simular-financiamento?veiculo=UUID`
- Privacidade: https://motta-multimarcas.vercel.app/privacidade-financiamento
- Administrativo: https://motta-multimarcas.vercel.app/admin/applications

O veículo é identificado pelo ID e o servidor confere disponibilidade e preço. A ficha exibe marca, modelo, versão, ano e preço em reais. Sem seleção inicial, o cliente pode escolher um veículo disponível na etapa final ou enviar sem veículo definido. Valores, CPF e telefone têm máscaras; validação de campos também ocorre no servidor. Voltar mantém os dados em memória, sem CPF em localStorage.

E-mail, tempo de trabalho, entrada, parcelas e observações são opcionais. Profissão, situação profissional e renda mensal aproximada em reais são obrigatórios. Preferências de parcelas: 24, 36, 48 e 60. Não há comprovantes, assinatura, marketing, aprovação de crédito ou envio automático a bancos. O aviso completo fica na página de privacidade; a ficha apresenta somente a informação curta solicitada e o acesso à página.

## Painel e Supabase

A aba Fichas Cadastrais tem ícone clipboard-list, quatro indicadores, nomes de clientes, busca por nome/protocolo/modelo e filtros por status e datas de envio. Os nomes são obtidos pela RPC autorizada: não foram adicionados aos resumos usados pelo Realtime. CPF não aparece na tabela. A consulta inicial do detalhe permanece mascarada; revelar dados completos é restrito e auditado.

Status do fluxo simples: Nova, Em atendimento, Aguardando retorno, Finalizada e Arquivada. Arquivar preserva a ficha até o prazo de retenção. É possível atribuir responsável, registrar observações e abrir o WhatsApp do cliente com a mensagem solicitada, sem CPF ou renda. Recursos e status históricos anteriores continuam preservados na base.

Persistência utiliza `public.motta_financing_applications` e `motta_private.financing_details`, com criptografia dos dados pessoais, além de eventos, tarefas e registros de compartilhamento privados já existentes. `public.motta_financing_settings` mantém a configuração. Não foi criada uma tabela paralela com CPF em texto aberto.

Nova migration aplicada: `supabase/migrations/20261112034932_motta_financing_simple.sql`. Amplia a constraint de status para arquivamento, adapta a RPC administrativa com busca por nome e filtro de datas em America/Sao_Paulo e registra consulta da lista em auditoria. Não apaga nem converte registros existentes.

Edge Function `motta-financing`, versão 2, publicada com validação atualizada. Chaves de serviço ficam no servidor. RLS, autorização por perfil ativo, desafio assinado, antispam, rate limiting e idempotência foram preservados. O Realtime continua limitado a resumos seguros para os perfis administrativos permitidos; atualização periódica e recuperação por foco/conexão complementam a assinatura.

Configuração de privacidade publicada: versão `ficha-simples-2026-11-12-v1`, aviso fornecido no pedido complementado pelas informações operacionais de acesso, finalidade, contato e retenção escolhida. Página interna de privacidade com contato para consultar/corrigir/solicitar exclusão. Exclusão automática operacional após 90 dias, executada pela tarefa horária existente. Backups seguem as regras do provedor e não foram objeto de teste de restauração.

## Arquivos modificados

- `src/financing-application.js` e `.css`: três etapas, campos simples, máscaras, aviso breve e sucesso confirmado.
- `src/main.js`, `src/vehicle-view.js`: textos dos botões de entrada.
- `src/admin/applications.js` e `.css`: indicadores, busca, filtros, arquivamento e WhatsApp.
- `src/admin/main.js`, `src/admin/icons.js`: ícone da aba.
- `supabase/functions/motta-financing/validation.js`: renda numérica, servidor público e campos opcionais, compatível com solicitações do formato anterior.
- Migration indicada acima.
- `tests/financing-applications.spec.js`, `tests/admin.spec.js`, `tests/applications-handler.mjs`, `tests/financing-remote.sql`: testes adaptados e novos cenários.

## Testes executados

Os 41 cenários de navegador foram aprovados: a execução ampla aprovou 40 e identificou um seletor incorreto no novo teste de filtros; o seletor foi corrigido e esse cenário passou na execução seguinte. Foram aprovados 11 testes do endpoint/validação, três testes do servidor e o build.

Suíte SQL executada no Supabase real dentro de transação com rollback: envio e protocolo, criptografia, reenvio idempotente, deduplicação, snapshot do preço, consulta por nome, filtro de período, arquivamento, atribuição, notas, tarefas, vínculo com cliente, auditoria, permissões e retenção. Também testou renda numérica e ausência de e-mail/tempo de trabalho. Nenhuma ficha sintética foi mantida em produção.

Auditor Supabase: nenhum novo alerta de RLS; permanece o alerta anterior de proteção contra senhas vazadas desabilitada no Auth. Não foi alterada essa configuração.

Capturas: `financing-simple-production-desktop.png`, `financing-simple-production-mobile.png`, `financing-simple-admin-production.png`. As capturas `financing-form-fixture-*.png` são de dados isolados de teste.

Conferência final em produção aprovada: três etapas disponíveis, layout sem overflow em 320/390/768 px, aviso de 90 dias visível, desafio HTTP 200, envio vazio rejeitado com HTTP 400, leitura anônima bloqueada, login e listagem administrativa reais, filtros via RPC e assinatura Realtime autenticada. Nenhum erro JavaScript observado nessa navegação.

Deploy de produção: `dpl_DFN5VDJRqqYucpS33YQxduBRrAEE`. A verificação em produção usa navegação e autenticação reais, desafio do endpoint e rejeição de submissão vazia. Não foi enviado um cadastro fictício pelo endpoint público: persistência e operações de atendimento foram exercitadas na transação revertida. A assinatura Realtime é verificada em produção; a entrega de um INSERT real não é provocada por dados de demonstração.
