# Abertura e exibição mobile/PWA — IPNC

Data: 06/10/2026. Base revisada: `9b588e538ed356cf8ebdccc191baa36c5d418a53` (Site v40). Site existente: https://renovo-ipnc.octavioribeiroleite.chatgpt.site.

## Resultado e escopo

A inicialização de `/` deixou de apresentar a navegação e o esqueleto do painel. Agora usa a composição clara da IPNC até o efeito de navegação existente decidir o destino. Boot HTML, carregamento React e entrada mobile compartilham curvas, folhas discretas, fundo e logo oficial transparente. O conteúdo aparece em fade de 300 ms, com movimento da logo para sua posição na entrada mobile.

Não houve alteração em autenticação produtiva, Supabase, banco, permissões, APIs, rotas, regras administrativas/financeiras ou navegação de retomada. A única mudança em `Index.tsx` é a apresentação dos fallbacks de carregamento e do intervalo antes do redirecionamento já existente. O contexto de identidade alterado em `tests/fixtures` é exclusivamente sintético e não faz parte do build publicado.

## Configuração anterior e final

| Propriedade | Anterior | Final |
|---|---|---|
| `display` | `standalone` | `standalone` |
| `display_override` | `["fullscreen", "standalone"]` | `["fullscreen", "standalone"]` |
| `theme_color` | `#f7fbf8` | `#f7fbf8` |
| `background_color` | `#f7fbf8` | `#f7fbf8` |
| `id`, `start_url`, `scope` | `/` | `/` |
| `orientation` | `portrait-primary` | `portrait-primary` |
| Viewport | único, `viewport-fit=cover` | preservado |
| iOS | capable `yes`, título Renovo IPNC, status `black-translucent` | preservado |
| Cache do SW | `ump-cache-v18` | `ump-cache-v19` |
| URL do SW | `2026-10-06-mobile-global-v10` | `2026-10-06-opening-v11` |

`display_override` já priorizava fullscreen nos navegadores compatíveis. `display: standalone` permanece como fallback para navegadores que ignoram o override. Trocar esse fallback por fullscreen prejudicaria a preferência expressa de fallback standalone. A [documentação do Chrome](https://developer.chrome.com/docs/capabilities/display-override) descreve essa ordem de avaliação.

## Abertura e prontidão

- O boot fica fora de `#root`; a montagem de React não o apaga abruptamente.
- `AppLoadingSplash` sinaliza apenas carregamento visual real com `data-opening-pending`.
- O controlador observa a montagem do conteúdo, o marcador e o carregamento da logo. Uma falha de imagem também libera a entrada, evitando prender o aplicativo.
- Enquanto a composição opaca cobre a entrada, a raiz é `inert`, evitando foco e toque em controles escondidos. A raiz recupera seu estado anterior antes do fade.
- Ao ficar pronto, o boot deixa imediatamente de interceptar cliques e sai da árvore acessível. A entrada já pode ser usada durante os 300 ms da transição.
- Não existe tempo mínimo de permanência. O temporizador de 450 ms serve somente para remover resíduos da animação se o evento de término não chegar; ele não posterga a entrada.
- A entrada da logo usa opacity 0→1 e escala .97→1 em 300 ms no wrapper. O movimento da imagem fica separado dessa animação, inclusive quando a inicialização termina antes de 300 ms.
- Movimento reduzido remove o boot imediatamente quando pronto e desativa animações do carregamento.
- A linha pequena é indeterminada, sem percentual fictício de progresso.

## Logo, ícones e recursos críticos

A logo utilizada é `src/assets/logo-ipnc.png`, **1254×1254**, preservada byte a byte, incluindo transparência. SHA-256: `2df611f147250f6df0caeb189051cea1cd0748c05ed90bb752501125021f7081`. Nenhuma nova logo foi desenhada.

O HTML agora preloads a própria logo usada por React e pela entrada, em vez de baixar um ícone PWA diferente primeiro. O build resolve preload, boot e consumidores para o mesmo asset com hash. A fonte do sistema é usada apenas nas superfícies de abertura/entrada para evitar troca tardia de fonte, sem esperar por downloads de fontes nem modificar o restante do sistema.

Nenhum ícone foi alterado/criado nesta revisão: os ícones v5 já contêm a identidade atual e foram conferidos.

| Uso | Asset | Dimensão |
|---|---|---|
| PWA `any` | `public/icons/icon-192x192-v5.png` | 192×192 |
| PWA `any` | `public/icons/icon-512x512-v5.png` | 512×512 |
| PWA `maskable` | `public/icons/icon-maskable-512x512-v5.png` | 512×512 |
| Apple Touch | `public/icons/apple-touch-icon-v5.png` | 180×180 |

O maskable é uma composição própria opaca com fundo `#f7fbf8`. Toda a arte cabe no círculo seguro de raio 204,8 px; o maior raio ocupado medido é 198,04 px. Não contém uma caixa arredondada artificial em torno da logo. As URLs versionadas permanecem; o novo cache do SW renova o código da abertura e remove somente caches antigos do próprio app.

## Bordas, altura e áreas seguras

A fundação existente mantém `html`, `body` e `#root` sem margens e com altura mínima da viewport; usa `100dvh` com fallback `100vh`. Não foi adicionado padding ao `body`. Os quatro tokens `--safe-top`, `--safe-bottom`, `--safe-left` e `--safe-right` usam os respectivos `env(safe-area-inset-*)`.

Arte e fundo ocupam as bordas; padding protege o conteúdo, não o fundo. O boot protege sua composição central com os quatro insets. A entrada mantém a proteção dos botões/campos e sua rolagem natural: quatro acessos, rodapé e instalação excedem algumas alturas mobile, portanto não foi imposto `overflow:hidden` ao conteúdo. Os princípios seguem a [orientação do WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).

## Arquivos alterados

Produto/configuração:

- `index.html` — boot externo, preload oficial e stylesheet crítico compartilhado.
- `src/main.tsx` — controlador de abertura e limpeza no HMR.
- `src/lib/app-opening.ts` — prontidão visual, acessibilidade, transição e cleanup.
- `src/opening.css` — composição e animações compartilhadas.
- `src/components/layout/OpeningBackdrop.tsx` — fundo comum.
- `src/components/layout/AppLoadingSplash.tsx` — carregamento integrado e indicador mínimo.
- `public/opening-canopy-v1.svg`, `public/opening-floor-v1.svg` — decoração baseada na composição de entrada aprovada, sem alterar a logo.
- `src/pages/Index.tsx` — substituição da apresentação provisória do painel.
- `src/pages/Auth.tsx` — reutilização da decoração; funções existentes preservadas.
- `src/auth-readability.css` — base clara coerente.
- `src/mobile-app-shell.css` — remoção da composição antiga do splash.
- `public/sw.js`, `src/lib/registerSW.ts` — versão do cache/worker.

Validação isolada:

- `tests/app-opening.test.ts` — prontidão, imagem/falha, interação, movimento reduzido e teardown.
- `tests/pwa-install.test.mjs` — atualização da expectativa de limpeza do cache v19.
- `tests/diretoria-fixture.test.mjs` — cenário de inicialização sintética.
- `tests/fixtures/diretoria/auth.tsx`, `main.tsx`, `README.md` e `tests/vite.diretoria.config.ts` — cenário que conclui loading e usa o HTML de boot real, sem conexão a backend produtivo.

## Verificações executadas

- `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: **270 testes aprovados**.
- `tests/pwa-install.test.mjs`: incluído, dimensões PNG, identidade do manifest, override, instalação e regras do SW aprovados.
- `npm run build`: aprovado. Mantém avisos anteriores sobre chunks grandes, import dinâmico ineficaz de Sonner e base Browserslist antiga.
- `git diff --check`: aprovado.
- Lint pertinente: zero novos problemas. Continua um `no-explicit-any` preexistente em Auth e três avisos Fast Refresh preexistentes nas fixtures. Conferidos contra o código da base por regra/severidade; não foram ocultados.
- Build isolado da fixture e tipos da fixture/configuração: aprovados.
- Build publicado: nenhum `/src` residual em `dist/client/index.html`; logo e SVGs referenciados presentes. Logo do build com bytes iguais à oficial.

## Conferência visual e evidências

Navegador local isolado, dados fictícios, transporte real bloqueado. Entrada conferida em **360×800, 390×844, 412×915, 430×932, 375×812, 768×1024, 1024×768 e 1440×900**. Sem overflow horizontal observado. Insets de teste: top 44, bottom 34, laterais 18 px — são geometria de fixture, não um aparelho físico.

Conferidos: primeiro boot, inicialização que resolve em 700 ms, inicialização rápida de 100 ms, loading persistente, fade, movimento reduzido, campos de usuário/senha, botão escrito de volta à Home e diálogo de instalação. Nenhum login produtivo, instalação física, alteração financeira ou escrita de backend foi usado para testar.

Evidências em `evidence/`:

- `splash.png`, `crossfade.png`, `opening-sequence.json`.
- `entry-*x*.png` e `layout-checks.json` para as oito resoluções.
- `login-390.png`, `install-dialog-390.png`.

## Limitações reais

O splash **nativo Android** é gerado pelo sistema a partir do manifest, cores e ícone. Curvas, folhas e animação CSS começam no boot HTML/React; não são recursos do splash nativo. A [documentação de PWA](https://web.dev/learn/pwa/web-app-manifest) distingue esses mecanismos. O navegador/sistema controla a disponibilidade efetiva de fullscreen e suas barras, conforme [Chrome edge-to-edge](https://developer.chrome.com/docs/css-ui/edge-to-edge).

No iOS, as metas suportadas e `viewport-fit=cover` foram preservados. O Safari controla status bar, splash e área do sistema; `black-translucent` não promete esconder seus indicadores. Não foram adicionados startup images específicos para dispositivos. A [documentação Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) descreve seu mecanismo próprio.

A instalação/reabertura em **Android e iPhone físicos** não foi executada neste ambiente. A configuração e a geometria foram verificadas; não se afirma que o splash nativo, notch/Dynamic Island reais, launcher, teclado nativo ou barras do sistema foram testados fisicamente. Não é possível garantir ausência absoluta de flashes causados pelo sistema/rede/versão do navegador. A publicação utiliza o projeto e acesso atuais; revisão e commit finais são informados na entrega do chat após o status de deploy confirmar sucesso.
