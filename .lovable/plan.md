
# Correcao do Painel do Pastor

## Problemas Encontrados

### 1. Tipo AppRole incompleto
O tipo `AppRole` em `AuthContext.tsx` nao inclui `'pastor'`, causando uso de `as any` e potenciais problemas.

### 2. Admin bloqueado no Painel do Pastor
O `PainelPastor.tsx` so permite acesso a usuarios com role `pastor`. O admin (voce) e redirecionado de volta para a Home ao tentar acessar `/pastor`.

### 3. Race condition no carregamento de auth
O `onAuthStateChange` e o `getSession()` disparam ao mesmo tempo e ambos chamam `fetchProfileAndRoles`, podendo causar estados de loading inconsistentes que travam a tela.

### 4. Sem feedback durante carregamento da IA
A chamada para a edge function (que usa IA para gerar resumos) pode levar varios segundos, e o usuario so ve um spinner sem saber o que esta acontecendo.

## Correcoes

### 1. Atualizar tipo AppRole
Adicionar `'pastor'` ao tipo `AppRole` no `AuthContext.tsx` e remover os `as any`.

### 2. Permitir admin no Painel do Pastor
Alterar a verificacao em `PainelPastor.tsx` para permitir acesso de admin E pastor:
- `if (!isPastor && !isAdmin)` em vez de `if (!isPastor)`

### 3. Corrigir race condition no AuthContext
Usar uma flag `isMounted` e garantir que `fetchProfileAndRoles` so execute uma vez, evitando chamadas duplicadas entre `onAuthStateChange` e `getSession`.

### 4. Melhorar feedback de carregamento
Adicionar uma mensagem informativa durante o loading: "Gerando resumo com IA... isso pode levar alguns segundos."

## Detalhes tecnicos

### Arquivo: `src/contexts/AuthContext.tsx`
- Linha 5: mudar tipo para `'admin' | 'diretoria' | 'visualizador' | 'pastor'`
- Linha 141: remover `as any` de `roles.includes('pastor')`
- Adicionar controle com `isMounted` para evitar race condition
- Separar `getSession` como inicializacao (controla `setLoading(false)`) e `onAuthStateChange` como listener (usa setTimeout para buscar dados sem controlar loading)

### Arquivo: `src/pages/PainelPastor.tsx`
- Linha 48: usar `isPastor` do contexto em vez de verificacao local
- Linha 85: mudar para `if (!isPastor && !isAdmin)` para permitir admin
- Adicionar `isAdmin` ao destructuring do `useAuth()`
- Melhorar o skeleton de loading com mensagem "Gerando resumo com IA..."

### Arquivo: `src/pages/Index.tsx`  
- Nenhuma mudanca necessaria (o redirect para pastor so acontece se isPastor for true)

## Resultado esperado
- Voce (admin) conseguira acessar o painel do pastor normalmente
- O pastor conseguira fazer login e ver seu painel
- O loading nao ficara travado
- O usuario vera uma mensagem informativa durante o carregamento da IA
