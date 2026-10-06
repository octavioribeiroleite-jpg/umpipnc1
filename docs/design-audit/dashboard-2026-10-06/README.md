# Home da diretoria — computador e celular

Revisão de 06/10/2026 baseada nas duas imagens fornecidas pelo proprietário. Implementação no painel autenticado existente, com verde profundo, superfícies creme, cabeçalho ilustrado, indicadores alinhados e cartões de eventos, acessos rápidos, aniversariantes e calendário.

## Composição e escopo

- Desktop: sidebar de 240 px, área principal mais larga, quatro indicadores e duas colunas para os painéis. A sidebar recolhe para 76 px.
- Tablet: navigation rail de 76 px e indicadores em duas colunas.
- Celular: cabeçalho compacto, indicadores em duas colunas quando cabem, conteúdo empilhado e navegação inferior com Mais. Fonte ampliada faz os indicadores usarem uma coluna.
- A logo oficial permanece intacta. O topo creme da sidebar e o cabeçalho claro do celular permitem ler as letras verdes sem recolorir o PNG.
- Data, saudação, nome, sociedade e contagens vêm dos dados/contexto existentes. Não foram incorporados os nomes, cargos ou números dos mockups.
- Finanças continua representando **entradas do mês**, com essa indicação explícita; não foi convertido em saldo bancário ou saldo da tesouraria. Valores usam separadores brasileiros.
- Alertas, notificações pastorais e comprovantes pendentes continuam aparecendo quando necessários. Erro de leitura continua diferente de lista vazia e preserva a indicação de consulta indisponível.
- O calendário conserva todos os dias, navegação entre meses, Hoje, seleção de dia e filtros de situação. Nenhuma consulta, regra financeira, permissão, API ou migration foi alterada.
- Estilos do conteúdo são limitados à variante dashboard. HomeBirthdayCard conserva a variante padrão para seus outros consumidores. Navegação compartilhada mantém seus filtros por perfil e rotas.
- Atualização do PWA: cache `ump-cache-v14` e URL de registro `/sw.js?v=2026-10-06-dashboard-v6`. Ícones oficiais v4 permanecem os mesmos; o teste de ativação comprova remoção dos caches anteriores e preservação de cache de outro aplicativo.

## Verificação técnica

Node 24, dependências existentes do package-lock:

| Verificação | Resultado |
| --- | --- |
| `npx tsc -p tsconfig.app.json --noEmit` | Aprovada |
| `node --experimental-strip-types --test tests/*.mjs tests/*.ts` | 245 aprovados, zero falhas |
| ESLint dos TSX/TS, SW e teste PWA alterados | Zero erros e avisos |
| `npm run build` | Aprovado |
| `git diff --check` | Aprovado |

O build continua avisando sobre importação estática/dinâmica de sonner e tamanho de chunk. São avisos já existentes; não foram escondidos nem tratados como falhas. A conferência recente do console local mostrou apenas os dois avisos de migração futura do React Router.

## Navegador e evidências

Conferência com componentes reais na [fixture isolada](../../../tests/fixtures/diretoria/README.md), sem backend ou autenticação reais. Todas as pessoas, valores e eventos das capturas são fictícios. Nenhuma operação financeira, voto ou mensagem real foi executada.

| Largura | Conferência |
| --- | --- |
| 320 px | Valores sem quebra no meio do número, cabeçalho compacto, calendário completo |
| 375 / 390 px | Grade móvel, Mais com todos os acessos do perfil, aniversariantes e filtros |
| 768 / 1024 px | Rail, duas colunas de indicadores e conteúdo empilhado |
| 1440 px | Sidebar, quatro indicadores e duas colunas de painéis |

Nas leituras estabilizadas, scrollWidth não excedeu clientWidth. As barras de rolagem podem consumir 15 px no navegador de teste. Também foram conferidos normal, empty, error e loading; cenário long com fonte base em 200% no celular e desktop. Em fonte ampliada, cabeçalho do calendário e indicadores se reorganizam. Essa emulação não é certificação de acessibilidade nem teste de zoom nativo.

Ações exercitadas: acesso rápido a Reuniões e retorno à Home; central abrindo Finanças na aba de comprovantes; seleção de dia, próximo mês e Hoje; filtro Concluídas/Todas; recolher/expandir sidebar; menu da conta, confirmação de saída e Cancelar; Mais no celular. O menu administrativo conserva Eleições, Usuários e Sugestões do Pastor, ausentes na diretoria comum.

Capturas:

- [Computador](evidence/desktop-1440.png) e [calendário completo](evidence/desktop-calendar.png).
- [Celular 390](evidence/mobile-390.png), [conteúdo móvel](evidence/width-390.png) e [320](evidence/width-320.png).
- [Tablet 768](evidence/width-768.png) e [1024](evidence/width-1024.png).
- [Sem registros no celular](evidence/empty-mobile.png) e [desktop](evidence/empty-desktop.png).
- [Erro](evidence/error-mobile.png), [carregamento](evidence/loading-mobile.png).
- [Fonte ampliada móvel](evidence/long-font200-mobile.png) e [desktop](evidence/long-font200-desktop.png).

Limites: não houve teste em aparelhos físicos Android/iOS, reinstalação real de PWA ou autenticação com credenciais reais. A fixture não comprova RLS, entrega de Realtime ou autorização de APIs; essas funções não foram modificadas.

## Conferência manual após atualização

1. Atualizar o aplicativo pelo botão existente e abrir Home no acesso habitual.
2. No computador, conferir saudação, sociedade e valores reais; recolher/expandir menu e acessar Reuniões.
3. No celular, conferir os quatro indicadores, rolar até calendário e abrir Mais. Todos os acessos autorizados devem continuar disponíveis.
4. Selecionar outro dia, mudar mês, usar Hoje e alternar filtros. Não é necessário concluir ou cancelar evento para testar a interface.
5. Abrir menu da conta, selecionar Sair e usar Cancelar para conferir a confirmação sem encerrar a sessão.

## Imagem decorativa

Ferramenta: geração de imagem integrada (`image_gen.imagegen`). A imagem é uma ilustração ambiental de igreja genérica; não representa o prédio real da IPNC nem modifica a logo institucional.

Original PNG: 2172 × 724 px, preservado em `/Users/octavioribeiroleite/.codex/generated_images/01a10eb0-d2a9-7603-9f43-f20d93e4f755/exec-f2e69748-12ff-4ed5-a14d-073aada754d0.png`.

Asset entregue: [dashboard-church-v1.webp](../../../src/assets/dashboard-church-v1.webp), 1600 × 533 px, 75.654 bytes. Redução com Lanczos3 e WebP qualidade 88, sem upscale. A composição deixa espaço escuro à esquerda para texto HTML; não inclui letras, logos ou elementos de interface.

Prompt usado:

```text
Use case: stylized-concept.
Asset type: one background bitmap for a responsive church community dashboard hero; this is only the atmospheric background, not a screenshot or interface.
Primary request: a serene panoramic environmental illustration of a small contemporary church in a tropical garden at the beginning of night, colored in deep evergreen and dark petrol teal.
Composition: wide horizontal panorama, approximately 3:1 aspect ratio. The church must occupy the rightmost third only, seen from a gentle front three-quarter angle, with its complete roof and facade visible. A simple slender softly glowing warm gold cross is on the facade. Garden palms and leafy shrubs frame the church to the right; very subtle bokeh warm light far behind it. The left two thirds are deliberately dark, calm, uncluttered negative space, with only a nearly invisible gradient of forest green, for text that will be added in HTML. Do not put a church, trees, large leaf shapes, foreground objects, or bright lights in the left two thirds.
Style: polished photorealistic environmental illustration with soft cinematic depth and tasteful fine texture, like a welcoming modern church portal, natural believable architecture and leaves. Not a representation of any actual church building.
Lighting and mood: quiet and warm, early night, subtle warm light on the cross, deep shadows, low contrast background. Mostly very dark green with only restrained warm highlights around the church.
Constraints: absolutely no text, letters, numbers, logos, watermarks, people, interface elements, borders, rounded card frame, badges, or icons. The illustration fills its canvas edge to edge. Keep large usable dark negative space on the left. High visual quality.
```
