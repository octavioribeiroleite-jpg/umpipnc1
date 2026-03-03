

# Corrigir: Pastor visualizando como integrante da UMP

## Problema
Quando o usuário já está logado como diretoria-UMP e depois loga como Pastor, o `AuthContext` não recarrega o perfil porque a condição na linha 95 é `if (newSession?.user && !profile)` — como o `profile` já está preenchido (do UMP), o sistema nunca busca o perfil do Pastor. Resultado: o Pastor herda os dados do UMP.

## Solução
No `AuthContext.tsx`, ao detectar mudança de sessão (`onAuthStateChange`), comparar o `user.id` do novo session com o `user.id` atual. Se forem diferentes (troca de conta), forçar o re-fetch do perfil e roles.

### Mudança em `src/contexts/AuthContext.tsx`

Na condição do `onAuthStateChange` (linha ~92-106):

**Antes:**
```ts
if (newSession?.user && !profile) {
  setTimeout(() => { fetchProfileAndRoles(newSession.user.id); }, 0);
}
```

**Depois:**
```ts
const isNewUser = newSession?.user?.id !== user?.id;
if (newSession?.user && (!profile || isNewUser)) {
  if (isNewUser) {
    // Reset stale data immediately
    setProfile(null);
    setRoles([]);
    setSociety(null);
  }
  setTimeout(() => { fetchProfileAndRoles(newSession.user.id); }, 0);
}
```

Isso garante que ao trocar de conta de serviço (UMP → Pastor ou vice-versa), o perfil e roles sejam buscados novamente do banco.

| Arquivo | Ação |
|---|---|
| `src/contexts/AuthContext.tsx` | Detectar troca de usuário e forçar re-fetch de perfil/roles |

