
# Corrigir Loading Infinito na Autenticação

## Problema
A inicialização da autenticação está levando mais de 8 segundos, travando a tela no skeleton de carregamento. O console mostra "Auth loading safety timeout triggered", indicando que `getSession()` está demorando (possivelmente tentando renovar um token expirado).

## Solucao

### 1. Melhorar o AuthContext (`src/contexts/AuthContext.tsx`)

- Reduzir o safety timeout de 8s para 5s
- Adicionar tratamento para sessao expirada/invalida: se `getSession()` retornar sessao mas `fetchProfileAndRoles` falhar, limpar a sessao e redirecionar
- Garantir que se o `getSession()` demorar, o timeout limpe o estado e libere a navegacao para /auth
- Adicionar `try/catch` no `getSession()` para tratar erro de refresh token, limpando a sessao nesse caso

### 2. Secao Tecnica

No `AuthContext.tsx`, as mudancas serao:

```text
- Safety timeout: 8000ms -> 5000ms
- No bloco catch do initializeAuth: chamar signOut() para limpar sessao corrompida
- No safety timeout: se nao houver sessao valida, limpar localStorage do Supabase
- Adicionar log para identificar onde esta travando (getSession vs fetchProfileAndRoles)
```

### Arquivo modificado
- `src/contexts/AuthContext.tsx`
