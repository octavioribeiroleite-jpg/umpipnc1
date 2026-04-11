

# Auditoria Completa de Design, Layout e Responsividade

## Problemas Identificados

### 1. Inconsistencia de Cards
- Algumas paginas usam `AppCard` (design system glassmorphism), outras usam `Card` do shadcn diretamente (ex: `Eleicoes.tsx`, `Plenarias.tsx`, `DiretoriaComunicados.tsx`, `Estudos.tsx`, `Visitantes.tsx`, `Usuarios.tsx`, `Configuracoes.tsx`)
- Isso causa visual diferente entre telas -- algumas tem fundo branco solido, outras tem o efeito transparente

### 2. PageHeader Inconsistente
- Na pagina `Aniversariantes.tsx`, o PageHeader esta dentro de um `div flex justify-between` manual em vez de usar a prop `action` do componente
- Isso quebra o espacamento padrao

### 3. Arquivo `App.css` com codigo morto
- O `App.css` tem estilos do template Vite inicial (`.logo`, `.card`, `.read-the-docs`, `logo-spin`) que nao sao usados e so poluem

### 4. Tabelas sem responsividade
- `Visitantes.tsx` e `Usuarios.tsx` usam `<Table>` sem wrapper de scroll horizontal, causando overflow em mobile
- `Configuracoes.tsx` tambem pode ter o mesmo problema

### 5. FAB posicionamento inconsistente
- O FAB tem `bottom-20` fixo, pensado para quando havia bottom nav. Agora com sidebar/hamburger, essa margem pode estar alta demais em desktop (md:hidden resolve) mas em mobile o espacamento pode nao combinar com o layout atual

### 6. Paginas que usam `Card` + `CardContent` sem AppCard
- `Plenarias.tsx`, `Eleicoes.tsx`, `Estudos.tsx`, `DiretoriaComunicados.tsx` usam Card direto
- Visualmente destoam do padrao glassmorphism

### 7. Estados vazios sem padronizacao
- Algumas paginas tem empty state bem feito (Tarefas, Arquivos), outras tem apenas `<p>` simples (Reunioes, Plenarias)

### 8. Loading states inconsistentes
- Algumas paginas usam `<Skeleton>`, outras usam `<Loader2>` spinner centralizado
- Ideal padronizar

### 9. `Visitantes.tsx` usa layouts condicionais
- Dependendo de admin/pastor, usa `PastorLayout` ou `AppLayout`, mas as duas tem estilos de padding diferentes

### 10. Dark mode com cores hardcoded
- Na `Auth.tsx`, ha varias classes como `text-gray-900`, `text-gray-500`, `bg-white/90` que nao respondem ao dark mode
- Varios componentes usam cores absolutas (`text-gray-400`, `bg-gray-100`) em vez de tokens semanticos

---

## Plano de Correcoes

### Etapa 1 -- Limpar codigo morto
- Remover `App.css` (nao e importado em nenhum lugar util)

### Etapa 2 -- Padronizar Cards para AppCard
- Substituir `Card`/`CardContent` por `AppCard` nas paginas: Eleicoes, Plenarias, Estudos, DiretoriaComunicados, Visitantes
- Manter `Card` apenas dentro de `AppCard` para headers/content quando necessario, ou usar `AppCard noPadding` + `CardHeader`/`CardContent`

### Etapa 3 -- Corrigir PageHeader da pagina Aniversariantes
- Usar a prop `action` do `PageHeader` em vez de wrapper manual

### Etapa 4 -- Tabelas responsivas
- Adicionar wrapper `overflow-x-auto` nas tabelas de Visitantes, Usuarios e Configuracoes

### Etapa 5 -- Padronizar Empty States
- Criar um padrao visual unificado para estados vazios (icone + titulo + descricao + acao opcional), similar ao que ja existe em Tarefas e Arquivos
- Aplicar em: Reunioes, Plenarias, Estudos, Comunicados

### Etapa 6 -- Padronizar Loading States
- Usar Skeleton para carregamento inicial de listas/grids
- Usar Loader2 spinner apenas para acoes pontuais (submit, processar)

### Etapa 7 -- Corrigir cores hardcoded no Auth.tsx
- Trocar `text-gray-*` por tokens semanticos (`text-foreground`, `text-muted-foreground`)
- Trocar `bg-white/90` por `bg-card/90`

### Etapa 8 -- Verificar responsividade geral
- Garantir que todas as paginas com grids usem breakpoints corretos
- Verificar que nenhum conteudo transborda horizontalmente em 360px

---

## Arquivos a serem editados
- `src/App.css` (remover)
- `src/pages/Aniversariantes.tsx`
- `src/pages/Eleicoes.tsx`
- `src/pages/Plenarias.tsx`
- `src/pages/Estudos.tsx`
- `src/pages/DiretoriaComunicados.tsx`
- `src/pages/Visitantes.tsx`
- `src/pages/Usuarios.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Configuracoes.tsx`
- `src/pages/Reunioes.tsx`

## Resultado esperado
Visual uniforme em todas as telas: mesmo estilo de card, mesmos espacamentos, mesmas cores semanticas, responsividade correta em mobile (360px+), sem codigo morto.

