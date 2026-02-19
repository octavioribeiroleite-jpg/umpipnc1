
# Correcao do Redirecionamento Indevido para o Painel do Pastor

## Problema identificado

O log do console mostra **"Auth loading safety timeout triggered"**, indicando que o timer de seguranca de 4 segundos disparou antes dos dados de perfil/roles terminarem de carregar. Isso causa uma condicao de corrida:

1. O timer dispara e `loading` vira `false`
2. Nesse momento, `user` ja existe mas `roles` ainda esta vazio (`[]`)
3. `isAdmin = false` e `isPastor = false` temporariamente
4. Quando `fetchProfileAndRoles` finalmente completa, os roles atualizam e o `useEffect` na Index reage as mudancas de dependencias, podendo causar navegacao inesperada

Alem disso, a logica de redirecionamento na Index nao protege admins — se por qualquer motivo `isPastor` ficar `true` para um admin (ex: usuario com ambos os roles), ele seria redirecionado.

## Solucao

### 1. Adicionar flag `rolesLoaded` no AuthContext

Criar um estado separado `rolesLoaded` que so fica `true` depois que `fetchProfileAndRoles` completa com sucesso. Isso permite que a pagina saiba se os roles ja foram carregados, independente do timer de seguranca.

### 2. Proteger o redirecionamento na Index

Alterar a logica para:
- So redirecionar para `/pastor` quando `rolesLoaded` for `true` (nao apenas quando `loading` for `false`)
- Admins nunca sao redirecionados para `/pastor`, mesmo que tambem tenham role de pastor

### 3. Aumentar o timeout de seguranca

Aumentar de 4s para 8s para dar mais tempo em conexoes lentas, reduzindo a chance do timeout disparar antes dos dados carregarem.

## Secao tecnica

### Arquivo: `src/contexts/AuthContext.tsx`

- Adicionar estado `const [rolesLoaded, setRolesLoaded] = useState(false)`
- Setar `setRolesLoaded(true)` no final de `fetchProfileAndRoles`
- Setar `setRolesLoaded(false)` no `signOut`
- Expor `rolesLoaded` no contexto
- Aumentar safety timer de 4000ms para 8000ms

### Arquivo: `src/pages/Index.tsx`

- Importar `rolesLoaded` do `useAuth()`
- Mudar a condicao de redirecionamento de:
  ```
  else if (!loading && user && isPastor)
  ```
  para:
  ```
  else if (!loading && user && rolesLoaded && isPastor && !isAdmin)
  ```
- Isso garante que:
  - Os roles ja foram carregados (`rolesLoaded`)
  - O usuario e pastor (`isPastor`)
  - O usuario NAO e admin (`!isAdmin`) — admins ficam no painel principal
