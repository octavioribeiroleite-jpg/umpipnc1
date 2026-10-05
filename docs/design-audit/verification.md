# Verificação integrada — auditoria visual IPNC

## Resultado local

- Build de produção Vite 8 aprovado, servidor e cliente, após a integração das áreas e os ajustes finais de menus/calendário/votação.
- Suíte completa: **66 testes, 66 aprovados**, sem ignorados. Comando: `node --experimental-strip-types --test tests/*.mjs tests/*.ts`.
- `git diff --check`: aprovado.
- Typecheck: **aprovado sem erros após a correção solicitada em 28/09/2026**. A cópia desatualizada `src/pages/Secretaria 2.tsx` agora reexporta a página atual e o tipo `VisitorEntry`. O original de 35.541 bytes foi preservado integralmente em `docs/archive/secretaria/Secretaria-2.2026-09-28.tsx.txt`. A página ativa, seus callbacks e `tsconfig.app.json` não foram alterados; nenhum erro foi suprimido.
- Lint comparativo da fundação e páginas gerais:36 arquivos, 10 diagnósticos anteriores e 10 atuais,0 novos; `shared-lint.json`. Menus, calendário comum, popover e FileCard também passaram na checagem direcionada final.
- Lint EBD/aniversariantes/admin: sem novos diagnósticos nos 24 arquivos comparados pelo responsável. Lint financeiro: 45 anteriores/45 atuais, nenhum novo. Tarefas/calendário:0. Pastor/portal/eleições/reuniões/plenárias: 47 arquivos comparados, 141 erros anteriores/141 atuais, sem novos diagnósticos. Não é alegado lint global sem erros.
- Build continua emitindo os avisos anteriores sobre bundle principal acima de500 kB e importação dinâmica/estática de `sonner`. Não houve mudança de arquitetura/chunks nesta revisão visual.

## Regressões verificadas

A suíte cobre centavos exatos, validação financeira, resposta perdida/idempotência, conflito de revisão, permissão, filtros/paginação, estado público/admin da tesouraria, erros que não viram saldo zero, sincronização e sessão EBD, aniversariantes, caminhos de comprovantes e controles de IA existentes.

Foram acrescentadas verificações de renderização do layout pastoral: uma árvore de página/formulário/campo para pastor e administrador, ausência de conteúdo para visitante/papel não permitido/carregamento. Isso confirma a estrutura montada pelo render; não simula resize ou efeitos no navegador.

O teste de oito fotos da votação conserva oito alvos de 44 px e um grupo com quebra de linha e largura limitada. A correção foi motivada por achado independente: oito botões em uma linha excediam a largura do card móvel. O teste de legibilidade financeira foi adaptado às novas classes semânticas, mantendo normal/anywhere/ausência de reticências e verificando o uso real das classes em Finanças e Camisas.

## Preservação funcional

Comparação SHA-256 com a referência independente capturada às 18:24:30 UTC em 28/09/2026: **174 arquivos protegidos, 0 alterados** (`protected-files-check.json`). A referência inclui contextos, hooks, bibliotecas, funções e migrações. Não contém dados pessoais ou segredos.

A revisão independente posterior (captura 18:31–18:35 UTC) também não encontrou perda de handlers de gravação, `value`, `checked`, `disabled` ou `onOpenChange` nos TSX então alterados. Confirmou rotas, guards, centavos, UUID, revisão concorrente e árvores únicas. Algumas alterações já estavam em andamento antes dessa referência; ela não representa prova completa de equivalência nem verificação do banco em produção.

Em Auth, os marcadores exigidos por IdentityConfirmationEnhancer (`Você é`, `shadow-2xl`, nome/metadados adjacentes, grupo com dois botões) foram preservados. SocietySelector não recebeu grade nova que reativasse o observador. O observador financeiro, rótulos de pagamento/entrega e loaders reconhecidos foram preservados.

## Navegador: escopo exato

Diagnóstico realizado **na versão 21 publicada, anterior às alterações locais**:

| Superfície | Larguras medidas | Resultado |
|---|---|---|
| Entrada pública `/auth` |375, 390, 768, 1024, 1440 px| Scroll horizontal ausente; botão administrativo38 px em todas, corrigido para44 px na fonte local |
| Seleção de perfil `/secretaria` |375 px| Sem overflow; cards e retorno acessíveis visualmente |
| PIN do professor `/secretaria` |375, 390, 768, 1024, 1440 px| ScrollWidth igual à viewport, 13 botões; formulário não enviado; retorno por seta funcionou |

Captura de tela do PIN publicada foi inspecionada. As dimensões temporárias do navegador foram restauradas e as abas temporárias fechadas.

A prévia da tesouraria foi regenerada em `docs/treasury/preview.html` por renderização estática dos componentes reais, sem conexão com banco e com valores “—”. A tentativa de abri-la foi rejeitada automaticamente pelo navegador:

> The browser URL policy blocks this action. … The requested URL protocol is not allowed. Allowed protocols: "http:", "https:".

O motivo foi a política de protocolos de URL (`file://`), **não falta de autorização do usuário**. Não houve tentativa por outro navegador, URL intermediária, CDP, servidor alternativo ou qualquer contorno. O arquivo continua disponível como artefato local; sua aparência final não foi inspecionada pelo navegador.

## O que permanece necessário

A aprovação nativa anterior do servidor local e a operação de atualização da fonte Sites no worktree continuam pendentes e não foram repetidas. Assim, **a versão modificada não foi executada no navegador, os fluxos autenticados não foram exercitados e nenhuma publicação foi realizada**.

A matriz de rotas/abas/estados está em `README.md`. As cinco larguras da versão nova, papéis, rascunhos durante resize, atualização financeira, foco/teclado, erro de sessão, versão publicada e cache/PWA devem ser conferidos antes de concluir a auditoria. As verificações de código/render e o build não substituem essas etapas.

## Correção posterior dos tipos

Após a solicitação “corrija”, foram executados novamente o typecheck completo, o lint do arquivo corrigido e os 12 testes existentes de EBD/sessão/aniversariantes: todos aprovados. O conteúdo histórico foi conferido byte a byte e por SHA-256. A correção não executou operações de banco nem publicou o aplicativo.
