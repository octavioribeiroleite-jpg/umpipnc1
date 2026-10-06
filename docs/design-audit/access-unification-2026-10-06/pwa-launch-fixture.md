# Verificação isolada de abertura e retomada — 06/10/2026

A fixture separada da porta 8084 usa o controller de produção `startAppResumeHome`, a interface real do aplicativo e o backend fictício da fixture Diretoria. O adapter mantém o basename `/__diretoria`, usa um namespace próprio de armazenamento e declara explicitamente a instalação como simulada. A fixture 8083 foi preservada.

Resultados no Chrome, com larguras 390 e 375 px:

- Abertura em `/configuracoes`, com perfil administrativo fictício e registro de atividade recente, iniciou `/auth?home=1` antes da tela privada ser montada.
- Escolher Diretoria e UMP levou ao PIN; duas teclas numéricas e ajuste de viewport mantiveram os dois dígitos e a etapa ativa.
- Os controles explícitos `Simular background` e `Simular retomada` entregaram hidden/visible ao adapter do documento. O controller real recarregou `/auth?home=1`, removeu a etapa e o PIN parcial e exibiu a Home. O backend continuou fictício, sem alteração de credenciais ou logout real.
- O controller e o tratamento de picker foram verificados separadamente pela suíte de testes sintéticos da implementação. O seletor nativo de arquivos não foi testado nesta conferência.

Limitação observada: nesta superfície de automação, abrir/ativar outra aba, Ctrl+Tab e os comandos freeze/active do motor mantiveram `document.visibilityState` como `visible` e não forneceram um ciclo observável de background/retomada. A prova de retomada acima usa um sinal sintético identificado, não um teste de fechamento, launcher, iOS, Android ou PWA instalada física. `visibilitychange` indica mudanças de visibilidade, e não identifica sozinho a intenção de fechar ou abrir um aplicativo. Fontes: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event), [Page Lifecycle API do Chrome](https://developer.chrome.com/docs/web-platform/page-lifecycle-api).

Evidências: `pwa-launch-restored-cold.png`, `pwa-launch-active-pin.png`, `pwa-launch-resumed-home.png` e `pwa-launch-metrics.json`. Ambas as abas próprias foram fechadas, o viewport temporário foi removido e o servidor próprio 8084 foi encerrado.

Executar novamente com `vite --config tests/vite.app-launch.config.ts`; recarregar manualmente após alterações de código, pois o bootstrap original limita o WebSocket de HMR à fixture 8083. O build dessa fixture usa `dist/fixtures/app-launch` e não é um artefato de publicação.
