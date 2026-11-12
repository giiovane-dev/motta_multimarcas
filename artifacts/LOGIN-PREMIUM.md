# Login premium — Motta Multimarcas

## Implementação

- `src/admin/auth.js`: nova apresentação do formulário; mostrar/ocultar senha; opção de lembrar apenas e-mail; validação nativa; estado de autenticação; bloqueio de envios repetidos; mensagens genéricas; recuperação preservada via Supabase Auth.
- `src/admin/login.css`: estilos limitados ao login; composição desktop 58/42; adaptações para tablet e mobile; animações finitas em CSS; foco e movimento reduzido.
- `src/admin/main.js`: após autenticação e verificação do perfil ativo, normaliza a rota para `/admin`. Consultas de autorização e demais módulos preservados.
- `tests/admin.spec.js`: regressões existentes e cinco cenários adicionais do login. Fixtures de Auth isoladas, sem usuários ou estoque de demonstração em produção.
- `public/img/motta-login-studio.webp`: imagem de 1536 × 1024, 73.106 bytes.
- `public/img/motta-login-studio-mobile.webp`: versão de 720 × 480, 23.222 bytes.

O logotipo existente foi preservado. Não havia foto de estúdio ou vídeo adequado nas pastas de mídia. O fundo esportivo foi gerado com a ferramenta integrada image_gen e otimizado em WebP. É uma imagem institucional ilustrativa; não representa um anúncio do estoque.

## Movimento

Animação 2D de fotografia, sem vídeo ou modelo 3D: entrada com opacidade e deslocamento de 22 px por 2,4 s; uma passagem sutil de luz vermelha; câmera com zoom de 2,5% e deslocamento de 6 px ao longo de 16 s, estabilizando ao final. Nenhum movimento decorativo infinito. No mobile o carro fica estático; com prefers-reduced-motion as animações e transições são desativadas. A imagem não bloqueia o formulário. A ausência da mídia mantém o fundo e o formulário utilizáveis.

## Validação executada

- 14 testes Playwright administrativos aprovados: acesso sem configuração, login/logout, recuperação, usuário sem perfil autorizado, módulos existentes, validação de e-mail, senha inválida, estado de carregamento, bloqueio de envio duplicado, mostrar senha, lembrar e-mail, ausência de senha no armazenamento, teclado, imagem carregada, movimento reduzido e sessão expirada.
- Layout verificado em 1440, 1024, 768, 390 e 320 px, sem rolagem horizontal.
- Login e logout reais do administrador no Supabase aprovados, sem erros de JavaScript. Nenhum dado comercial foi criado nesses testes.
- Build Vite aprovado e 3 testes da rota de servidor aprovados.
- Capturas: `artifacts/login-premium-desktop.png`, `artifacts/login-premium-mobile.png`, `artifacts/login-premium-tablet.png`.

Recuperação e expiração de sessão foram testadas com fixtures. Entrega de e-mails e autorização dos redirects no ambiente hospedado continuam dependendo da configuração de Auth/SMTP; não foram alteradas nesta mudança visual. Banco, migrations, RLS, Storage e papéis não foram modificados.

## Prompt final da mídia

Ferramenta: image_gen integrada, sem CLI de geração.

Use case: ads-marketing. Asset type: background photograph for the left panel of a premium Brazilian automobile dealership admin login. Create a cinematic photorealistic studio photograph of one dark graphite luxury sports coupe, front three-quarter view facing left, low camera, car entirely visible with space around it, occupying middle-lower frame. Seamless near-black studio, satin black floor with subtle natural reflection. Refined soft red side lighting grazing body contours, neutral softbox revealing hood and wheels, realistic sophisticated automotive advertising photography. Landscape 3:2 composition, generous clean black negative space in upper third for separately rendered text. Vehicle is elegant and clearly legible against dark background. No people, text, badges, logos, watermarks, neon strips, particles or futuristic props. Not a dealership inventory listing.
