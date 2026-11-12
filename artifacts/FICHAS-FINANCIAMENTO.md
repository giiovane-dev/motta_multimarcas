# Fichas de financiamento — 12/11/2026

> Histórico da primeira entrega. O fluxo foi posteriormente simplificado para três etapas e habilitado com retenção de 90 dias. Consulte [a entrega atual](FICHA-SIMPLES-FINANCIAMENTO.md).

Implementação publicada em https://motta-multimarcas.vercel.app. Formulário: `/simular-financiamento`. Painel: `/admin/applications`. A coleta pública permanece **desativada**, sem campos pessoais disponíveis. O contato por WhatsApp continua disponível.

## Ativação

No painel, acessar Configurações → Fichas: privacidade e coleta. Cadastrar a versão, o texto efetivamente aprovado do aviso, a URL HTTPS da política, a base legal e o prazo aprovado de retenção em dias. Confirmar a validação jurídica e habilitar a coleta. Esses valores não foram inventados: a confirmação recebida foi “sim”, sem os textos, URL e prazo. Alterações no aviso/campos exigem nova versão. Administradores podem configurar até cinco campos adicionais.

## Funcionamento

Formulário em quatro etapas, com revisão e aceite desmarcado inicialmente. Usa veículos disponíveis do catálogo, preços reais em R$ e fotografia dos dados do veículo no momento do envio. Valida CPF, nascimento, telefone, e-mail e demais campos no navegador e servidor. Não consulta CPF, score ou bancos externos. Não promete aprovação. Dados pessoais ficam apenas em memória no formulário e são limpos após confirmação de persistência e protocolo.

O painel oferece lista paginada, filtros, contadores, atribuição, próximo contato, tarefas, histórico, vínculo com cliente e registro de compartilhamentos. A visualização inicial é mascarada; revelar dados e exportar gera auditoria. Exportação JSON exclusiva de administrador. Aprovação/recusa exige registro de instituição, confirmação e referência de evidência; o sistema registra a informação fornecida pela equipe, sem verificar documentos externos nem executar aprovação bancária. Registrar compartilhamento não envia dados para instituições.

Notificações contêm somente resumo seguro, protocolo e dados públicos do veículo. Realtime é restrito por RLS e tem atualização periódica complementar. Vendedores não acessam fichas; administradores e gerentes ativos têm as permissões operacionais definidas. Configuração e exportação são exclusivas de administrador.

## Persistência e proteção

Projeto Supabase `uujzysypvefhzozogpjz`. Resumos mascarados ficam em `public.motta_financing_applications`; detalhes pessoais são criptografados com PGP AES-256 no schema privado. A chave fica no Vault (`motta_financing_key`), sem exposição ao cliente. CPF usa HMAC para deduplicação, nunca hash simples. Tabelas privadas têm RLS e bloqueio explícito de acesso direto dos papéis de cliente. Funções privadas verificam perfil ativo e autorização; a entrada de fichas aceita apenas o papel de serviço.

A Edge Function `motta-financing` aceita chamadas públicas intencionalmente, com desafio HMAC vinculado ao IP, expiração, tempo mínimo, honeypot, limite de tamanho, origens permitidas e validação no servidor. Limites persistentes: dez tentativas por IP/hora, 120 globais/hora e três fichas por CPF/dia. Não há CAPTCHA externo. Chaves idempotentes impedem reenvio acidental; conteúdo duplicado no dia também é rejeitado. O retorno não revela dados pessoais.

Retenção automática: tarefa `motta-financing-retention`, minuto 17 de cada hora, remove fichas vencidas e registros relacionados da base operacional. O prazo depende da configuração aprovada; nenhum prazo foi presumido. Exclusão operacional não garante eliminação imediata dos backups do provedor. Política de backups e restauração completa não foram alteradas nem testadas nesta entrega.

Migrações aplicadas e alinhadas ao histórico remoto:

- `20261112031419_motta_financing_applications.sql`
- `20261112032424_motta_financing_hardening.sql`
- `20261112033028_motta_financing_abuse_guards.sql`
- `20261112033156_motta_financing_private_policies.sql`

Código principal: `src/financing-application.js`, `src/financing-application.css`, `src/admin/applications.js`, `src/admin/applications.css` e `supabase/functions/motta-financing/`. Integrações em entrada/rotas, homepage, veículo e painel existentes. Nenhuma senha ou chave de serviço foi adicionada ao frontend.

## Validação

- 40 cenários Playwright aprovados, incluindo funcionalidades anteriores, formulário, revisão, repetição, mobile e painel.
- 10 testes do handler, 29 verificações de banco existentes, nove de uploads e três do servidor aprovados.
- Build de produção concluído.
- `tests/financing-remote.sql` executado no Supabase real com rollback: criptografia, idempotência, snapshot de preço, auditoria, permissões, tarefas, cliente, limites e expiração. Dados sintéticos e alterações de configuração foram revertidos.
- Produção: formulário bloqueado sem inputs pessoais, login real, listagem administrativa, ausência de overflow mobile, logout, RPC autorizada e assinatura Realtime autenticada confirmados. Nenhum erro JavaScript observado nessa navegação.
- Não foi enviado cadastro pessoal em produção. A entrega de INSERT real pelo Realtime não foi provocada; eventos e recuperação periódica foram exercitados em testes isolados.
- Estado remoto conferido: zero fichas, coleta e validação desativadas, prazo vazio, agendamento ativo. Auditor de segurança sem novos alertas de RLS; alerta anterior de proteção contra senhas vazadas permanece na configuração Auth.

Capturas de produção: `financing-public-production-disabled.png`, `financing-admin-production-empty.png`, `financing-admin-production-mobile.png`. Capturas `financing-form-fixture-*.png` usam exclusivamente dados e aviso sintéticos de teste.

Deploy Vercel: `dpl_9Cxwt6PkYbWuwyg9f4cBqAMaCT7j`, alias de produção `motta-multimarcas.vercel.app`.
