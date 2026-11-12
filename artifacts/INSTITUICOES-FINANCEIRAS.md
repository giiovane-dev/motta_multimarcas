# Instituições financeiras — Motta Multimarcas

## Entrega

Seção inserida imediatamente após o financiamento e antes das avaliações do Google. Título, subtítulo, chamada e observação de crédito seguem o texto solicitado. O CTA abre o WhatsApp de financiamento já configurado no projeto, +55 51 97400-6062, com a mensagem solicitada.

Layout preto, branco e vermelho, cards com bordas discretas, grid responsivo, entrada por viewport e hover curto. `prefers-reduced-motion` elimina movimento e transições. Não há carrossel automático nem bibliotecas adicionais.

## Gestão

Em `/admin/settings`, a seção **Instituições financeiras** permite adicionar, editar nome, definir ordem numérica, ativar/desativar, informar URL do logotipo e remover registros. Menor ordem aparece primeiro; empates são ordenados por nome e UUID. Desativar mantém o cadastro e o retira da homepage.

O logotipo pode ser informado por URL HTTPS ou por caminho existente em `/img/`. Não foi adicionado upload de arquivos; o administrador fornece a URL do arquivo oficial autorizado. É necessário confirmar a identidade e a autorização de uso antes de salvar uma imagem. Imagem indisponível volta automaticamente ao nome em texto, sem distorção ou filtro de cor. Nenhum logotipo foi gerado ou reconstruído.

As nove instituições foram cadastradas conforme informado pela revenda: Bradesco, Itaú, Safra, Daycoval, C6 Bank, Banco PAN, BV, Car Bank e Omni. A lista não é apresentada como comprovação de parceria formal. Nesta entrega, os nove cards usam nomes em texto porque não foram disponibilizados arquivos oficiais com autorização de uso.

## Identidade das marcas

- **Car Bank:** identificada no [relatório oficial da Volkswagen Financial Services](https://www.vwfs.com.br/content/dam/bluelabel/valid/www-vwfs-com-br/relatorio-anual/RELAT%C3%93RIO%20ANUAL%202023.pdf). Isso identifica a marca e não concede autorização de uso do logotipo nem confirma relacionamento comercial com a revenda.
- **Omni:** o cliente confirmou que a grafia inicialmente informada como “Omene” se refere ao [site oficial Omni](https://www.omni.com.br/). O nome foi corrigido no banco por uma segunda migration; nenhuma marca semelhante foi escolhida por suposição.

## Supabase e segurança

Tabela `public.motta_financing_institutions`, RLS habilitada e grants explícitos. Visitantes e usuários comuns leem apenas instituições ativas. Administração de instituições, incluindo leitura de inativas, requer perfil admin ativo, verificado pelo helper privado existente. INSERT, UPDATE (USING e WITH CHECK) e DELETE possuem políticas próprias. Não foram alteradas as regras das demais tabelas ou as permissões dos demais módulos.

A homepage consulta a lista ativa em ordem, assina Realtime e reconcilia a cada 15 segundos, ao recuperar foco, visibilidade e conexão. Não requer novo deploy para mudanças nos cadastros. Sem instituições ativas, a seção fica oculta. Falhas transitórias preservam a última lista recebida.

Migrations criadas pela CLI e aplicadas ao projeto autorizado `uujzysypvefhzozogpjz`: `20261112011147_motta_financing_institutions.sql` e `20261112011749_motta_confirm_omni.sql`.

## Arquivos

- `src/financing.js`, `src/financing.css`: seção pública, atualização automática, validação da URL e fallback visual.
- `src/admin/financing.js`, `src/admin/financing.css`: gestão administrativa.
- `src/admin/modules.js`: integração com Configurações.
- `src/data.js`, `src/main.js`: contato de financiamento centralizado e montagem da seção.
- `supabase/migrations/`: tabela, políticas, dados iniciais e correção confirmada para Omni.
- `tests/admin.spec.js`, `tests/database.mjs`: cobertura de gestão, sincronização, responsividade e segurança.
- `tests/fixtures/public.js`: testes públicos isolados do banco real, evitando que o estoque remoto sobrescreva as fixtures locais.

## Validação

- 29 verificações PostgreSQL/PGlite aprovadas, incluindo RLS, usuários sem perfil administrativo, mutações, logos e registros inativos.
- 17 testes administrativos/browser aprovados, incluindo três cenários específicos das instituições: posição e CTA, ciclo completo de gestão, atualização automática e fallback.
- 7 testes públicos de homepage, mapa, avaliações, navegação e movimento reduzido aprovados após isolar as fixtures da configuração remota.
- Fluxos de veículos verificados pela suíte própria.
- Build Vite e 3 testes da rota de servidor aprovados.
- Integração real: administrador inseriu e editou um registro temporário inativo; leitura e escrita anônimas indevidas foram bloqueadas; registro removido e sessão encerrada ao concluir. Nenhum registro de teste ficou na seção pública.
- Desktop e mobile inspecionados; sem overflow horizontal em 1440, 1024, 768, 390 e 320 px.

Advisors não apontaram problemas de RLS desta tabela. Há um alerta do Auth sobre [proteção contra senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), fora das alterações desta seção.

Capturas em `artifacts/financing-institutions-desktop.png` e `artifacts/financing-institutions-mobile.png`.
