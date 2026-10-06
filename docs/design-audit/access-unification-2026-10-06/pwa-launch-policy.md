# Abertura e retomada do PWA — 06/10/2026

O PWA começa em `/auth?home=1` antes da montagem das páginas, mesmo quando o sistema restaura uma rota da Diretoria, uma sessão válida ou um registro de atividade recente. A URL do ícone usa essa entrada; a identidade `/` e o escopo `/` do aplicativo foram preservados. O manifest declara `launch_handler.client_mode = navigate-existing` para navegadores que oferecem esse controle.

Um processo instalado que ficou em segundo plano volta à entrada na retomada, sem esperar os 30 minutos da regra anterior. `pagehide/pageshow`, `freeze/resume` e a fila de lançamento cobrem restaurações e relançamentos disponíveis no navegador. Eventos duplicados provocam somente uma navegação. A primeira entrega atrasada da fila de lançamento não interrompe uma navegação que o usuário já iniciou.

O clique em um campo de arquivo protege seu ciclo de segundo plano, incluindo câmera. A proteção é consumida no retorno e limpa por seleção, cancelamento ou foco; não protege uma próxima abertura. Teclado, redimensionamento, perda de foco e navegação interna, sem segundo plano, continuam na tela atual. Nenhuma sessão, credencial, dado local ou IndexedDB é apagado. Somente caches antigos `ump-cache*` são removidos pela atualização do service worker para `ump-cache-v20`.

Links abertos explicitamente para recuperação de senha, votação e apresentação pública preservam seu destino. Abas comuns do navegador mantêm a continuidade e o limite de 30 minutos já existente.

## Limite do navegador

O navegador não fornece, em todos os sistemas, um evento distinto para fechar o PWA, minimizá-lo ou trocar de aplicativo. Por isso, nas plataformas sem sinal específico de relançamento, **retomar um PWA que ficou oculto também começa na entrada**. O seletor de arquivos possui a exceção descrita acima. A API de lançamento e os eventos de congelamento variam por navegador; a política de início do documento funciona independentemente dessas APIs e de acesso ao armazenamento.

Referências primárias: [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), [Launch Handler API](https://developer.chrome.com/docs/web-platform/launch-handler).

## Verificação

58 testes de abertura, lifecycle, navegação e PWA/service worker passaram, além de TypeScript, lint dos arquivos alterados e `git diff --check`. Foram exercitados início com sessão e rota restauradas, ausência de armazenamento, documento inicialmente oculto, retenção do processo, eventos duplicados, fila atrasada, restauração bfcache, congelamento, seleção/cancelamento de arquivos e continuidade com teclado e navegação ativa.

A validação adicional no Chrome, em 375 e 390 px, confirmou que a rota privada com atividade recente inicia na Home; PIN parcial e navegação permanecem durante teclado/redimensionamento; e um ciclo de background/retomada fornecido explicitamente pelo adaptador volta à Home e remove a etapa do PIN. O controlador e a interface são reais, com backend fictício.

A condição de instalação e os sinais de background são simulados: a superfície de automação não forneceu um evento nativo de ocultação ao alternar abas ou congelar o motor. O seletor nativo não foi operado; sua política está coberta pelos testes automatizados. Não foi feita validação física de fechamento/launcher no iOS ou Android. As evidências e os detalhes estão em [pwa-launch-fixture.md](./pwa-launch-fixture.md).
