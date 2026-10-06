# Instalação PWA — revisão de 06/10/2026

Na revisão da base `113f1ab`, o convite de instalação manteve fundo branco e texto slate mesmo com `html.dark`. A reprodução usou o componente e controller produtivos na fixture isolada 8086, com transportes reais/SW bloqueados. Os 88 registros da entrega anterior não foram repetidos.

## Correção e evidência

Somente `src/components/PWAInstallPrompt.tsx` ganhou variantes `dark:` com tokens de card, texto, borda, primary, muted e foco. A logo usa o mesmo asset, cores e dimensões, com contorno suave no escuro. Retirando apenas as classes novas `dark:`, o arquivo é byte a byte idêntico à base: handlers, textos, layout e aparência clara foram preservados. A impressão digital do componente e o índice dos 13 pares JPG/JSON estão em [summary.json](./summary.json).

| Conferência | Resultado |
| --- | --- |
| Modal manual em 390/768/1440, escuro | Fundo `rgb(22,29,26)`; texto `rgb(240,244,242)`; menor contraste habilitado 7,09:1 |
| Modal claro desktop | Fundo branco/texto slate e altura 651,19 px iguais ao estado anterior |
| CTA de prompt fictício em 375×740, claro/escuro | Todos os controles visíveis com insets CSS 44/34/18/18; CTA escuro 9,19:1 |
| Cancelamento fictício → instruções | Mensagem real do controller; conteúdo longo acessível por rolagem interna; sem overflow horizontal |
| Troca de tema durante o modal | Estado e mensagem preservados, `theme-color` estável por tema (`#060807` escuro, `#6f7170` claro) |
| Fechar e Agora não | Modal fecha; foco volta para Instalar aplicativo no desktop; meta clara retorna a `#f7fbf8` |

Veja [antes escuro](./before-dark-390.jpg), [depois escuro](./after-dark-390.jpg) e [CTA escuro com área segura](./after-native-ready-dark-375-safe.jpg). O cálculo de contraste utiliza cores sRGB calculadas e fundos compostos dos ancestrais; não certifica imagens, gradientes ou toda a aplicação.

## Isolamento e limites

Um adapter temporário da fábrica real `createPWAInstallController` fixa somente as consultas `display-mode` como false, pois a janela Chrome desta revisão estava em fullscreen. O App e o dialog permanecem reais. A opção temporária `installMock=native` fornece `beforeinstallprompt` com `prompt()` inerte e `userChoice=dismissed`; o fluxo de cancelamento é executado pelo controller produtivo. Preferência de cor/viewport foram emulados por CDP documentado e restaurados ao terminar. Nenhum prompt nativo, instalação física, conta ou dado real foi usado.

O teste específico foi funcional na fixture: abrir por botão real, alternar tema, acionar CTA fictício, conferir mensagem/instruções e fechar com retorno de foco. Os 90 testes focados existentes passaram na revisão (PWA/manifest/SW/retomada/refresh/tema/abertura/navegação/PIN/layout); os testes PWA foram repetidos após a correção. Não foi criado teste que apenas repetisse as classes CSS. Lint do componente e diff-check passaram; verificações finais completas e publicação pertencem à coordenação.

O inventário diário encontrou 35 rotas concretas e o catch-all 404, sem destino literal de navegação ausente. A impressão digital das 24 fontes da QA anterior conferiu antes desta correção. Worker/registro/manifest/ícones eram consistentes na base (v22/v14/Home+navigate-existing/v5). A fixture não certifica atualização real entre versões do SW, instalação/retomada física, splash nativo ou funcionamento offline. O worker passa navegação HTML e APIs à rede; `launch_handler` tem suporte limitado, conforme [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/launch_handler). Referências consultadas: [instalação](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt) e [ciclo do worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
