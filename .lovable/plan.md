
Objetivo

- Fazer as melhorias aparecerem no PC ao atualizar a página, sem quebrar o app instalável.

Diagnóstico

- A causa mais provável está no cache do PWA:
  - `index.html` registra o `sw.js` sempre, inclusive no preview e dentro do iframe do editor.
  - `public/sw.js` usa cache agressivo para arquivos estáticos.
  - No mobile já existe um caminho manual de atualização (`PullToRefresh`), mas no desktop não existe equivalente.
- Resultado: no PC, principalmente no preview, o navegador pode continuar servindo uma versão antiga mesmo após refresh.

Plano de implementação

1. Remover o registro inline atual do service worker em `index.html`.
2. Mover o controle do service worker para `src/main.tsx`, com proteção de ambiente:
   - não registrar no preview (`id-preview--...`);
   - não registrar dentro de iframe;
   - nesses casos, desregistrar service workers antigos e limpar caches `ump-cache*`.
3. Manter o comportamento instalável no app publicado:
   - registrar o service worker só fora do preview;
   - preservar `manifest.json` e o fluxo de instalação já existente.
4. Melhorar a atualização no desktop:
   - detectar nova versão disponível;
   - exibir um aviso/botão “Atualizar agora” no app para recarregar a versão nova no PC, equivalente ao gesto mobile.
5. Ajustar o `sw.js` para reduzir risco de versão presa em cache:
   - manter navegação em estratégia segura;
   - evitar cache indevido em rotas sensíveis;
   - preservar exclusões como OAuth.

Detalhes técnicos

- Arquivos a revisar:
  - `index.html`
  - `src/main.tsx`
  - `public/sw.js`
  - possivelmente um novo componente de aviso de atualização, integrado ao `App.tsx` ou layout global
- Vou preservar o padrão atual do app:
  - PWA continua instalável
  - pull-to-refresh mobile continua funcionando
  - a correção foca no cache e na atualização do desktop/preview

Validação esperada

- No preview do editor, dar refresh no PC e ver a mudança imediatamente.
- No publicado, uma nova versão deve:
  - atualizar corretamente ao recarregar;
  - ou mostrar aviso claro de “nova versão disponível”.
- Confirmar que a tela de votação continua funcionando normalmente após a correção.

Resultado esperado

- As mudanças feitas no dia passam a aparecer no PC.
- O preview deixa de ficar preso em versão antiga.
- O publicado continua instalável, mas com atualização mais confiável.
