# Motta Multimarcas — GVN DIGITAL

Site público existente em HTML/CSS/JavaScript com Vite, integrado a uma nova área administrativa em `/admin`.

**Estado atual:** banco e fun??o de upload ativados no Supabase `uujzysypvefhzozogpjz` em 11/11/2026. Conex?o local configurada com chave publishable. Primeiro administrador, configura??o final de Auth, vari?veis da hospedagem e valida??o autenticada remota ainda pendentes. O cat?logo est? vazio, sem estoque fict?cio.

Consulte **[ADMINISTRACAO.md](ADMINISTRACAO.md)** para arquitetura, papéis, migrations, storage, configuração, operação, validações e pendências reais.

## Executar localmente

```powershell
npm.cmd install
npm.cmd run dev
```

- Site: http://127.0.0.1:5173/
- Painel: http://127.0.0.1:5173/admin

Use `.env.example` como referência para configurar a URL e a chave publishable do Supabase em `.env.local`. A migration, a função de upload e o primeiro perfil administrativo precisam ser configurados no projeto autorizado. Não inserir chaves secretas em variáveis públicas.

## Organização

| Caminho | Responsabilidade |
|---|---|
| `src/main.js`, `src/styles.css` | Homepage, navegação, filtros, favoritos e contato |
| `src/data.js` | Configuração comercial inicial e coleção carregada do banco |
| `src/catalog.js` | Catálogo e configurações públicos; Realtime e reconciliação |
| `src/vehicle-*.js`, `src/vehicle-details.css` | Páginas, galerias, mensagens e SEO dos veículos |
| `src/experience.*` | Mapa, avaliações Google e animações |
| `src/admin/` | Autenticação e módulos administrativos |
| `src/lib/supabase.js` | Consultas, comandos e upload |
| `supabase/migrations/` | Esquema, RLS, integridade e operações transacionais |
| `supabase/functions/motta-upload/` | Validação e upload autenticados no servidor |
| `api/vehicle-page.js` | Metadados e HTML dinâmicos no Vercel |
| `tests/` | PostgreSQL local, uploads, servidor e navegador |
| `public/img/` | Materiais visuais existentes, preservados |

## Verificações

Com o servidor local ativo e Microsoft Edge instalado:

```powershell
npm.cmd run test:all
```

Executa testes PostgreSQL com PGlite, testes do handler de upload, Playwright, build e testes da rota de servidor. Os testes de Auth/HTTP/Storage do navegador usam fixtures isoladas. Não substituem a validação em um Supabase real. Um teste do mapa exige internet.

Para conferir a versão compilada: `npm.cmd run preview`. Os metadados de servidor de `/veiculos/:slug` dependem do runtime do Vercel; o preview estático mantém a renderização dessas páginas pelo cliente.

## Publicação

O projeto preserva a configuração Vercel e acrescenta as rotas administrativas e páginas dinâmicas. A ativação requer migrations, função de upload, Auth, conta autorizada e variáveis de ambiente reais. Não houve publicação nesta implementação.

As fotografias e o logotipo existentes foram preservados. Os antigos veículos demonstrativos existem apenas nos testes. Avaliações Google dentro do site continuam dependendo de uma fonte autorizada; não há notas ou comentários fictícios. Consulte `GOOGLE-INTEGRATION.md`.
