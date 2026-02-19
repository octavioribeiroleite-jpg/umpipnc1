
# Corrigir Desconexoes dos Usuarios

## Problema Identificado

Existem **3 causas principais** para as desconexoes que os usuarios estao relatando:

### Causa 1: Safety timeout apagando sessoes validas
O safety timeout de 5 segundos esta sendo disparado mesmo quando o `getSession()` ja completou com sucesso (o console mostra isso). O problema e que o timeout verifica `loading` mas o estado `loading` pode estar `true` porque `fetchProfileAndRoles` ainda esta rodando. Quando o timeout dispara, ele **limpa o token do localStorage**, destruindo a sessao valida do usuario e forcando logout.

### Causa 2: O `onAuthStateChange` nao trata TOKEN_REFRESHED corretamente
Quando o Supabase renova o token automaticamente (a cada ~1 hora), o evento `TOKEN_REFRESHED` dispara o `onAuthStateChange`. Se `initialLoadDone` for `true`, ele chama `fetchProfileAndRoles` novamente. Se essa chamada falhar por qualquer motivo (rede instavel, timeout), o estado fica inconsistente mas nao ha recuperacao.

### Causa 3: Service Worker pode interferir com auth
O Service Worker faz cache de navegacao (network-first) e pode servir paginas em cache quando offline. Ao voltar online, o app pode carregar com sessao expirada do cache sem conseguir renovar.

## Solucao

### 1. Corrigir o safety timeout (`src/contexts/AuthContext.tsx`)

- Cancelar o safety timeout assim que o `getSession()` completar com sucesso (independente de `fetchProfileAndRoles` ainda estar rodando)
- Mover a logica de cancelamento: quando `getSession` retorna, limpar o timer
- Manter um timeout separado mais longo (10s) apenas para `fetchProfileAndRoles`
- **Nao limpar o localStorage** no timeout - apenas setar `loading = false` para desbloquear a UI

### 2. Tratar renovacao de token (`src/contexts/AuthContext.tsx`)

- No `onAuthStateChange`, verificar o `event` type
- Para `TOKEN_REFRESHED`: apenas atualizar session/user sem re-buscar profile/roles (ja estao em memoria)
- Para `SIGNED_OUT`: limpar tudo
- Para `SIGNED_IN`: buscar profile/roles apenas se ainda nao tiver

### 3. Melhorar Service Worker (`public/sw.js`)

- Adicionar deteccao de token expirado: se uma request auth retornar 401, nao cachear
- Garantir que paginas servidas do cache facam refresh do token ao carregar

## Secao Tecnica

### Arquivo: `src/contexts/AuthContext.tsx`

Mudancas no `useEffect` principal:

```text
1. Safety timeout:
   - Usar ref para o timer, cancelar ao completar getSession
   - Remover localStorage.removeItem do timeout
   - Timeout apenas seta loading=false e rolesLoaded=true

2. onAuthStateChange callback:
   - Adicionar check do event type
   - Se event === 'TOKEN_REFRESHED': apenas atualizar session/user, nao chamar fetchProfileAndRoles
   - Se event === 'SIGNED_OUT': limpar estado
   - Se event === 'SIGNED_IN' e nao tem profile: chamar fetchProfileAndRoles

3. fetchProfileAndRoles:
   - Adicionar try/catch individual em cada query para nao falhar tudo se uma query falhar
   - Nao chamar signOut se a query de profile falhar por rede (apenas se active === false)
```

### Arquivo: `public/sw.js`

```text
- Na funcao isApiRequest: garantir que requisicoes POST para /auth/ nao sejam interceptadas
  (ja esta ok pois so intercepta GET, mas adicionar skip explicito para /auth/v1/token)
```

### Arquivos modificados
- `src/contexts/AuthContext.tsx` (principal)
- `public/sw.js` (ajuste menor)
