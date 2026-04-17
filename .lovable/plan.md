
O usuário quer um indicador visível de "última atualização" no site para confirmar se uma nova versão foi de fato carregada no navegador. Isso resolve dois problemas: (1) diagnóstico do cache antigo e (2) confiança visual de que o publish chegou.

## Plano

Adicionar um carimbo de **build (data/hora)** gerado automaticamente em cada build do Vite e exibi-lo de forma discreta no app.

### Como funciona

1. **`vite.config.ts`** — injetar uma constante global `__BUILD_TIME__` com `new Date().toISOString()` no momento do build, via `define`.
2. **`src/vite-env.d.ts`** — declarar o tipo `declare const __BUILD_TIME__: string;`.
3. **Componente `BuildStamp`** (novo, em `src/components/BuildStamp.tsx`) — formata a data em PT-BR com timezone local (ex.: "Atualizado em 17/04/2026 às 14h32") e renderiza pequeno e discreto.
4. **Exibição**:
   - Rodapé do menu lateral (mobile) em `MobileHeader.tsx`, abaixo do bloco do usuário.
   - Rodapé da `AppSidebar` (desktop), abaixo do botão de Sair.
   - Rodapé do `PastorSidebar` e `PastorMobileHeader` (para o pastor ver também).
   - Tela `/auth` (rodapé), para confirmar versão antes mesmo de logar — útil no diagnóstico atual.

### Junto desta atualização

Como a constante `__BUILD_TIME__` só é gerada quando o build novo realmente chega ao navegador, o próprio carimbo já serve como prova: se aparecer "17/04/2026", a versão nova carregou; se não aparecer ou ficar antiga, ainda há cache preso.

### Arquivos a alterar

- `vite.config.ts` (define)
- `src/vite-env.d.ts` (tipo global)
- `src/components/BuildStamp.tsx` (novo)
- `src/components/layout/MobileHeader.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/pastor/PastorSidebar.tsx`
- `src/components/pastor/PastorMobileHeader.tsx`
- `src/pages/Auth.tsx`

### Resultado esperado

- Em todo lugar relevante do app aparece "Atualizado em DD/MM/AAAA às HHhMM".
- Você consegue comparar instantaneamente o carimbo do PC com o do celular ou aba anônima e identificar onde está o cache antigo.
