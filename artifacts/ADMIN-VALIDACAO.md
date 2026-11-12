# Validação local — painel Motta Multimarcas

Comando executado: `npm.cmd run test:all`. Resultado final: **sucesso**.

| Verificação | Resultado |
|---|---|
| PostgreSQL/PGlite: migration, RLS, autorização, integridade, venda e privacidade | 26 passaram |
| Handler de upload: identidade, papel, vínculo, estrutura do arquivo, tamanho e bucket | 9 passaram |
| Playwright/Edge: painel e regressões da vitrine | 21 passaram |
| Build Vite | Passou |
| Rota de servidor: metadados, 404 e 503 | 3 passaram |

Total: **59 verificações**, mais o build.

Foram verificadas larguras administrativas de 390, 768, 1024, 1440 e 1672 px, sem overflow da página. Tabelas têm rolagem interna. A sidebar fica recolhível no celular. Galeria e páginas públicas mantêm seus testes de teclado, toque e movimento reduzido.

Capturas administrativas com dados de teste: `admin-dashboard-fixture-desktop.png` e `admin-dashboard-fixture-{390,768,1024,1440}.png`. Os registros dessas capturas são fixtures de rede isoladas nos testes e não estão disponíveis na aplicação ou no build de produção.

`admin-login-local.png` mostra a tela local real com configuração Supabase pendente. A referência visual é a imagem anexada pelo cliente; o arquivo de mockup não estava em `img`. Foram conferidos sidebar, cabeçalho, cores, cards, gráfico, ações e tabela. O logotipo local existente foi mantido.

**Limite da validação:** Auth/HTTP/Storage no navegador são interceptados nos testes; o handler de upload tem dependências isoladas; o PostgreSQL embarcado usa schemas de suporte de teste e não é uma instalação completa do Supabase. Não houve login real, aplicação de migration, deploy de função ou upload no projeto remoto. A conexão atual não tem permissão no projeto `uujzysypvefhzozogpjz`. Advisors e testes remotos, incluindo concorrência entre conexões reais, permanecem pendentes. Consulte `ADMINISTRACAO.md`.
