

# Corrigir erro ao criar usuário duplicado

## Problema identificado

O usuário "Daniel" com email `daniel@ipnc.local` **já existe** no banco de dados. Quando você tenta criar outro usuário com o mesmo nome, o sistema gera o username `daniel`, que resulta no email `daniel@ipnc.local` — já registrado. A edge function retorna erro 400 mas a mensagem não chega clara ao usuário.

## Causa raiz

1. A edge function `create-user` tenta criar o auth user e recebe erro "already been registered"
2. Como não tem `member_id` no body (criação via página Usuários), o fallback de vincular membro existente não se aplica
3. O erro retornado pela function tem formato que o `supabase.functions.invoke` não parseia corretamente — o `error` vem no body JSON mas o status HTTP não é 2xx, então o SDK joga um erro genérico "Edge Function returned a non-2xx status code" sem mostrar a mensagem real

## Correções

### 1. `supabase/functions/create-user/index.ts`
- Melhorar a mensagem de erro para duplicatas: em vez de retornar a mensagem crua do Supabase Auth, retornar "Já existe um usuário com o login 'daniel'. Escolha outro nome de usuário."

### 2. `src/pages/Usuarios.tsx` — `handleCreateUser`
- Tratar melhor o retorno da edge function: verificar se `data?.error` existe mesmo quando `error` do SDK é null, e vice-versa
- Adicionar tratamento para o caso de erro HTTP: ler o body da resposta para extrair a mensagem de erro real

### 3. `src/pages/Usuarios.tsx` — validação preventiva
- Antes de chamar a edge function, verificar se o username gerado já existe consultando a tabela `profiles`
- Se existir, sugerir um username alternativo (ex: `daniel2`) ou mostrar erro imediato

### 4. `src/components/financas/MembrosTab.tsx` — mesma proteção
- Aplicar a mesma validação preventiva de username duplicado no cadastro de membros

## Arquivos modificados
- `supabase/functions/create-user/index.ts`
- `src/pages/Usuarios.tsx`
- `src/components/financas/MembrosTab.tsx`

