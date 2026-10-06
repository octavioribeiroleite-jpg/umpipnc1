# IPNC — padronização global mobile/PWA

Data: 06/10/2026. Escopo: fundação visual, navegação, viewport, áreas seguras, carregamento e apresentação do PWA existente.

A implementação coloca a aplicação inteira dentro de um `AppShell` independente do roteador. O fundo inicial passa a ser `#f7fbf8`, os controles reservam as áreas seguras e o manifest prioriza fullscreen onde houver suporte. A logo oficial foi preservada. A configuração e as medições em navegador não comprovam, por si, o comportamento do sistema operacional em um aparelho com o PWA instalado.

## 1. Arquivos alterados

| Grupo | Arquivos |
| --- | --- |
| Fundação global | `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/responsive-foundation.css`, novo `src/mobile-app-shell.css`, novo `src/components/layout/AppShell.tsx`, novo `src/lib/app-shell-surface.ts` |
| Carregamento | `index.html`, novo `src/components/layout/AppLoadingSplash.tsx`, `src/pages/Auth.tsx`, `src/components/pastor/PastorLayout.tsx` |
| Navegação compartilhada | `src/components/layout/AppLayout.tsx`, `BottomNav.tsx`, `MobileHeader.tsx`, `TabletNavigationRail.tsx`, `diretoria-navigation.css`, novo `useNavigationHeight.ts` no mesmo diretório; `src/components/pastor/PastorMobileHeader.tsx`, `PastorSidebar.tsx`; `src/components/membro/MembroLayout.tsx` |
| Entradas e áreas próprias | `src/auth-readability.css`, `src/components/secretaria/PinPad.tsx`, `PinPad.css`, `ProfileSelect.tsx`, `ProfileSelect.css`, `SecretariaNavigation.tsx`, `secretaria-workspace.css`; `src/pages/Secretaria.tsx`, `secretaria-theme.css`, `PortalIgreja.tsx`, `VotePublic.tsx`; `src/components/treasury/treasury-dashboard.css` |
| Componentes compartilhados | `src/components/ui/alert-dialog.tsx`, `card.tsx`, `drawer.tsx`, `fab.tsx`, `sheet.tsx`, `sonner.tsx`, `toast.tsx` |
| PWA e atualização | `public/manifest.json`, `public/sw.js`, `src/components/PWAInstallPrompt.tsx`, `src/lib/pwaInstall.ts`, `registerSW.ts`, `app-resume-navigation.ts`, novo `pwa-display.ts`; novo `scripts/generate-pwa-assets-v5.py`; os quatro assets v5 listados no item 14 |
| Validação isolada | `tests/app-resume-navigation.test.mjs`, `tests/pwa-install.test.mjs`, novo `tests/app-shell-surface.test.ts`, novo `tests/fixtures/mobile-safe-area.ts`, `tests/fixtures/diretoria/main.tsx`, `index.html`, `tests/fixtures/ebd-history.tsx`, `ebd-history.html`, `ebd-back.html`, `tests/treasury-ui/app.tsx`, `scripts/treasury-ui-preview.mjs` |
| Documentação e evidências | Este relatório, [documentação dos assets](pwa-assets/README.md), [metadados dos assets](pwa-assets/pwa-asset-metadata-v5.json), [contato visual dos ícones](pwa-assets/qa-pwa-icons-v5.png), arquivos de validação e evidências da consolidação final |

Os nomes abreviados em uma célula pertencem ao diretório explicitado imediatamente antes. A lista definitiva está em [changed-files.json](changed-files.json) e no diff final.

## 2. Componentes globais e arquitetura

`main.tsx` envolve `App`, incluindo o limite de erro, provedores, rotas e aprimoramentos visuais, com `AppShell`. Assim, login, páginas públicas, estados de erro e carregamento também herdam a fundação. O shell não lê sessões nem depende de `BrowserRouter`.

O contrato fica dividido em três camadas reutilizáveis:

1. **Raiz:** `AppShell` e `mobile-app-shell.css` controlam viewport, fundo até as bordas, tokens de área segura, tema superior e adaptação visual ao teclado.
2. **Página e navegação:** `AppLayout`, `PastorLayout`, `SecretariaNavigation` e a composição do portal distribuem cabeçalho, conteúdo, sidebar/rail e navegação inferior. `useNavigationHeight` mede a linha de controles; o CSS acrescenta o inset uma única vez.
3. **Portais de interface:** Dialog, AlertDialog, Sheet, Drawer e toasts usam os tokens de `html`, mesmo quando renderizados fora da árvore da rota.

Novas rotas normais herdam automaticamente o estágio seguro de `AppShell`, sem introduzir um novo wrapper em cada página. Um futuro `PageLayout` deve ser um descendente dessa raiz, reutilizando os componentes e tokens existentes. Páginas com barras fixas devem usar a família compartilhada correspondente; não devem recriar paddings de sistema ou status bars falsas. A classe `ipnc-safe-managed` identifica famílias que já distribuem os insets entre seus controles, evitando aplicação dupla pelo estágio padrão.

## 3. Display anterior

O manifest anterior usava `display: "standalone"`, sem `display_override`. `theme_color` e `background_color` eram `#123b2e`.

## 4. Display final

O campo `display` permanece `"standalone"`. Ele é o fallback compatível para navegadores que não interpretam a prioridade adicional. `id`, `start_url` e `scope` permanecem `/`; nome, nome curto e orientação `portrait-primary` foram preservados.

## 5. Display override

O manifest usa `display_override: ["fullscreen", "standalone"]`. O navegador considera o primeiro modo que suporta, mantendo a alternativa standalone. Isso configura a preferência do PWA instalado; não dispara uma solicitação automática da Fullscreen API. A existência desse campo não prova que um aparelho específico ocultou a barra de status. [Documentação Chrome sobre display override](https://developer.chrome.com/docs/capabilities/display-override).

O helper `pwa-display.ts` reconhece `fullscreen`, `standalone`, `minimal-ui` e `navigator.standalone` do iOS. Instalação, retomada e atualização deixam de presumir que todo PWA instalado necessariamente esteja em standalone.

## 6. Theme color final

O valor inicial único no HTML e no manifest é `#f7fbf8`. Após a montagem, `AppShell` acompanha a superfície superior visível, inclusive cabeçalhos e sobreposições, e atualiza a meta `theme-color` e `--app-edge-background`. A composição considera transparência, para que um scrim de modal também produza uma cor coerente.

O padrão claro substitui o verde escuro fixo. Superfícies efetivamente escuras podem determinar uma cor correspondente. O comportamento da barra do sistema continua dependente do navegador e do sistema operacional; o site informa a cor preferida.

## 7. Background color final

O manifest usa `background_color: "#f7fbf8"`. HTML, body, raiz e splash têm uma base clara coerente antes e depois do JavaScript. Os tokens de cor existentes continuam sendo usados pelos componentes; as cores próprias das sociedades e suas imagens foram preservadas.

## 8. Implementação das áreas seguras

Os quatro tokens globais são `--safe-top`, `--safe-bottom`, `--safe-left` e `--safe-right`, derivados de `env(safe-area-inset-*, 0px)`. Não existe padding global no body que empurre toda a pintura para longe das bordas.

O estágio padrão protege o conteúdo e calcula `--app-content-viewport-height` descontando os insets verticais. Famílias com navegação própria distribuem esses mesmos valores em cabeçalho, conteúdo e rodapé. A altura da linha de controles e a altura total da barra são distintas: um inset não é contado de novo no espaçamento do conteúdo.

O HTML tem uma única meta viewport com `viewport-fit=cover`. Esse conjunto permite estender a pintura e preservar os controles em áreas seguras; os insets reais são fornecidos pelo dispositivo. [Orientação do WebKit sobre viewport e áreas seguras](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).

## 9. Implementação de edge-to-edge

`html`, `body`, `#root` e `AppShell` cobrem a viewport. `--app-viewport-height` usa `100dvh` quando disponível e `100vh` como fallback. O fundo ocupa a área inteira; os insets são aplicados aos controles ou à região de conteúdo, sem faixa artificial de 24/30/40 px.

No mobile, os layouts mantêm rolagem de página; no desktop, o layout da diretoria mantém a área de conteúdo rolável dentro da estrutura com navegação lateral. Dialogs e drawers limitam sua altura e mantêm acesso ao conteúdo por rolagem. Quando um campo está em edição e a viewport visual é reduzida pelo teclado, o shell acompanha sua altura; isso não equivale a testar um teclado nativo.

## 10. Tratamento da faixa verde superior

Foi removida a dependência de uma cor verde escura global para a abertura do app. A pintura inicial, o tema padrão e o splash usam a base clara. As composições de login, seleção, PIN e Secretaria continuam podendo desenhar folhas e curvas até as bordas, com os botões protegidos pelas áreas seguras.

Não foi criada uma div extra, barra branca/verde ou simulação de relógio e bateria. A integração decorre do viewport, do tema e da preferência de display. O desaparecimento efetivo da barra do Android requer confirmação pelo ícone instalado em um aparelho que suporte fullscreen.

## 11. Fallback quando fullscreen não estiver disponível

O app continua funcionando em standalone e em uma aba normal. Quando a barra de status permanecer visível, o tema inicial claro e a atualização contextual procuram integrá-la à superfície da página.

A expansão até a região dos gestos disponível em versões recentes do Chrome Android não significa que a parte superior tenha se tornado automaticamente fullscreen. Chrome e Android decidem quais regiões podem ser ocupadas. [Guia oficial Chrome de edge-to-edge](https://developer.chrome.com/docs/css-ui/edge-to-edge).

## 12. Parte inferior e navegação

`BottomNav` permanece reutilizado pelas áreas de diretoria, pastoral, Secretaria e composição de membro. A linha de controles reserva uma altura base, cresce conforme o conteúdo e recebe `--safe-bottom` abaixo dela. O conteúdo reserva a altura total mais sua margem de leitura. O portal mantém sua navegação própria, com altura medida e o mesmo contrato de inset.

Menu “Mais”, drawer, modal e notificações respeitam os tokens globais. No Sonner os offsets são passados pelas propriedades desktop e mobile, pois os defaults da biblioteca são estilos inline. A posição inferior considera a barra do app quando presente. A ação de chamada da EBD permanece acima da navegação inferior, sem duplicar a reserva da barra de gestos.

Sidebar e navigation rail continuam adaptados aos breakpoints existentes. Sem insets reais, desktop não ganha um notch ou uma margem de sistema simulada.

## 13. Splash e transição para a interface

Há duas apresentações controladas pela aplicação: o boot HTML antes do React e `AppLoadingSplash` durante carregamentos reais. Ambos usam a identidade clara e a logo oficial; o React acrescenta folhas discretas, logo central e animação curta de 300 ms. `prefers-reduced-motion` desativa esse movimento. Não há timer para prolongar artificialmente o splash de autenticação.

O splash nativo Android é produzido pelo navegador com cor e ícone do manifest. Ele não renderiza as folhas e animações CSS do React. A composição foi aproximada por cor e identidade, sem prometer uma transição nativa idêntica em todos os aparelhos. [Documentação Chrome sobre composição do splash](https://developer.chrome.com/docs/lighthouse/pwa/splash-screen). O antigo checklist PWA do Lighthouse é depreciado e não é usado como prova de instalação real.

## 14. Ícones PWA alterados

| Arquivo novo | Dimensões | Finalidade |
| --- | --- | --- |
| `public/icons/icon-192x192-v5.png` | 192 × 192 | Ícone comum com transparência e arte completa |
| `public/icons/icon-512x512-v5.png` | 512 × 512 | Ícone comum/splash, transparente e sem quadrado opaco adicional |
| `public/icons/icon-maskable-512x512-v5.png` | 512 × 512 | Arte em canvas de 320 × 320, centralizada sobre `#f7fbf8` |
| `public/icons/apple-touch-icon-v5.png` | 180 × 180 | Composição opaca sobre a mesma base clara |

Fonte: `src/assets/logo-ipnc.png`, PNG RGBA oficial de 1254 × 1254. O mestre permaneceu byte a byte idêntico. A geração reduz por Lanczos, preserva proporção e todos os pixels da arte, e usa codificação PNG lossless. Não houve redesenho, recoloração, recorte ou upscale.

O maskable verifica os cantos de todos os pixels com alpha maior que zero dentro do círculo seguro de raio 204,8 px. A margem mínima calculada é de aproximadamente 6,76 px. As máscaras de círculo, quadrado arredondado e squircle não removem pixels da arte. Os detalhes e as evidências estão no [README dos assets](pwa-assets/README.md) e nos [metadados da geração](pwa-assets/pwa-asset-metadata-v5.json).

O manifest aponta exclusivamente para os três ícones v5. Seu link é versionado; Apple Touch também tem URL nova. O service worker usa `ump-cache-v18` e registro versionado, preservando o fluxo existente de atualização. Favicon e preview social v4 continuam usando a mesma logo oficial, sem mudança de composição nesta tarefa.

## 15. Páginas sob o layout global

O inventário de `src/App.tsx` contém **36 registros de rota**, incluindo a rota curinga. Todos estão abaixo da raiz `AppShell`; o quadro indica a família de apresentação, não uma afirmação de inspeção visual individual de cada estado.

| Rota | Família dentro de AppShell |
| --- | --- |
| `/` | AppLayout — Home da diretoria |
| `/auth` | Entrada própria — home pública, conta, sociedades, confirmação e PINs |
| `/reset-password` | Página própria — redefinição e estados de link |
| `/reunioes` | AppLayout |
| `/reunioes/nova` | AppLayout |
| `/reunioes/:id` | AppLayout |
| `/tarefas` | AppLayout |
| `/calendario` | AppLayout |
| `/financas` | AppLayout, após FinancialRoute |
| `/tesouraria` | TreasuryDashboard ou entrada/bloqueio próprios |
| `/camisas` | AppLayout, após FinancialRoute |
| `/arquivos` | AppLayout |
| `/configuracoes` | AppLayout |
| `/usuarios` | AppLayout |
| `/plenarias` | AppLayout |
| `/plenarias/:id` | AppLayout |
| `/pastor` | PastorLayout |
| `/pastor/sociedade/:slug` | PastorLayout |
| `/pastor/calendario` | PastorLayout |
| `/pastor/comunicados` | PastorLayout |
| `/pastor/sugestoes` | PastorLayout ou AppLayout, conforme contexto existente |
| `/pastor-sugestoes` | Alias existente da mesma composição |
| `/sugestoes` | Alias existente da mesma composição |
| `/comunicados` | AppLayout |
| `/membro` | MemberAccessUnavailable — acesso ainda não liberado |
| `/eleicoes` | AppLayout |
| `/eleicoes/:id` | AppLayout |
| `/vote/:electionId` | Votação pública própria, incluindo erro/carregamento/urna |
| `/eleicao/:id/apresentar` | Apresentação própria |
| `/dizimos` | PastorLayout ou AppLayout |
| `/igreja` | Portal com entrada, header, sidebar/rail e navegação próprios |
| `/visitantes` | PastorLayout ou AppLayout |
| `/estudos` | AppLayout |
| `/secretaria` | ProfileSelect, nome/PIN ou SecretariaNavigation, conforme etapa |
| `/aniversariantes` | AppLayout |
| `*` | NotFound |

O carregamento de `FinancialRoute` e o fallback de `PageErrorBoundary` também recebem a fundação global. Popups de instalação e modais compartilhados herdam os tokens por `html`.

## 16. Exceções e componentes preservados

As diferenças entre famílias são composições existentes, sem root separado fora de `AppShell`. Portal e tesouraria mantêm navegação e conteúdo próprios. A página de apresentação mantém sua finalidade de exposição, e a votação conserva suas etapas. Componentes específicos não foram reconstruídos apenas para trocar a fundação mobile.

`MembroLayout` foi alinhado ao contrato de navegação, mas o portal de membros não foi ativado. `/membro` continua exibindo `MemberAccessUnavailable`, conforme a configuração anterior. Arquivos não usados por uma rota não são evidência de uma nova funcionalidade liberada.

A área segura sintética existe somente nas fixtures de validação. `?safe=1` aplica top 44 px, bottom 34 px e laterais 18 px em `html`, inclusive para portais. Para paisagem, a fixture usa top 0 px, bottom 21 px, left 44 px e right 0 px; `?font=200` amplia a fonte apenas no ambiente isolado. Esses valores não são enviados ao aplicativo real. A barra amarela de controle da fixture Treasury também é exclusiva de QA e pode influenciar seu tema superior durante a inspeção.

## 17. Limitações de Android, Chrome e iOS

- **Modo de exibição:** fullscreen depende do navegador, da instalação e do aparelho. O manifest declara uma preferência; não oferece controle absoluto sobre relógio, notificações ou barras do sistema.
- **Atualização do launcher:** no Chrome 144+, uma URL/metadado novo de ícone solicita atualização, mas mudanças de identidade podem ficar disponíveis para revisão do usuário. O navegador pode manter o ícone instalado até essa revisão. A troca de cache do service worker não força o launcher. [Chrome — atualização de apps, 21/01/2026](https://developer.chrome.com/blog/improvements-to-web-app-updates).
- **iOS:** `apple-mobile-web-app-status-bar-style` permanece `black-translucent` para permitir pintura na região superior no app instalado. Não oculta obrigatoriamente relógio/bateria. O contraste dos indicadores do sistema sobre a base clara precisa ser conferido na versão real do iOS; uma screenshot de navegador desktop não comprova esse resultado. [Guia da Apple para aplicações web instaladas](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).
- **Splash do sistema:** o aplicativo não fornece curvas e folhas CSS ao splash Android; a decoração aparece quando o documento carrega.
- **Aparelhos físicos:** não havia Android/iPhone conectado disponível; `adb` não estava disponível e não havia simulador iOS inicializado utilizável. Instalar, fechar e reabrir pelo ícone em Android/iOS físicos não foi executado. Não se declara aprovação desse percurso.

## 18. Preservação das regras de negócio

Não houve migração, alteração de banco/Supabase, autenticação, permissões, PINs válidos, regras financeiras, lógica de chamada, eleições ou contratos de API. As rotas e funções existentes foram preservadas.

O reconhecimento dos modos fullscreen/standalone/minimal-ui é um ajuste de ambiente de apresentação do PWA. Não amplia acesso nem muda os critérios de autorização. As fixtures utilizam dados fictícios e transportes isolados; a validação não movimenta finanças reais, não registra votos reais e não envia mensagens reais.

## Validação e evidências da entrega

**Resultados definitivos em [validation.json](validation.json) e [evidence/layout-matrix.json](evidence/layout-matrix.json). Os registros foram consolidados após a inspeção final.** Foram aprovados tipos, 256 testes (incluindo 15 de PWA), build e diff. O lint pertinente mantém 37 erros e 4 avisos da base, sem novos diagnósticos. Foram salvas 122 medições de navegador, sem overflow horizontal.

A matriz distingue inspeção visual, geometria do DOM, estados sintéticos e configurações PWA. As sete dimensões móveis solicitadas são 360 × 800, 360 × 780, 375 × 812, 390 × 844, 393 × 873, 412 × 915 e 430 × 932. A cobertura desktop/tablet, paisagem, fonte ampliada, altura reduzida com campo focado, sem teclado nativo e insets sintéticos deve ser consultada nos registros efetivamente produzidos.

As medições feitas alterando viewport continuam sendo testes de navegador: **`physicalDevice: false`**. Nomes como notch, câmera central/lateral ou Dynamic Island identificam cenários de geometria; não identificam um aparelho testado. O fluxo instalado nativo permanece explicitamente não executado.

As verificações da consolidação abrangem tipos, lint pertinente, testes existentes/relevantes, build de produção e `git diff --check`. Resultados e falhas preexistentes devem aparecer nos registros, sem serem convertidos em aprovação por este texto. O sucesso da publicação do Site existente também precisa ser confirmado pelo fluxo de entrega; prévia local ou push não equivalem a deploy concluído.
