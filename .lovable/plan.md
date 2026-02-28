

# Melhorias de Segurança — Problemas Identificados e Plano

A análise de segurança identificou **6 problemas**. Aqui está o resumo por prioridade e o plano de correção:

---

## Problemas Críticos (vermelho)

### 1. Senhas armazenadas em texto puro
O campo `plain_password` na tabela `profiles` guarda senhas sem criptografia. Qualquer admin ou invasor com acesso ao banco vê todas as senhas.

**Correção:**
- Remover a coluna `plain_password` da tabela `profiles`
- Remover o armazenamento de senha em texto nas edge functions `create-user` e `update-user-password`
- Remover a exibição de senhas na página de Usuários (`Usuarios.tsx`)
- Atualizar o trigger `handle_new_user` para não salvar `plain_password`

### 2. Dados financeiros expostos a todos os usuários logados
Tabelas como `transactions`, `charges`, `membership_payments`, `shirt_sales` etc. têm políticas que permitem qualquer usuário autenticado ver todos os dados financeiros.

**Correção:**
- Já foram parcialmente corrigidas (as políticas atuais já usam `society_id` e roles) — preciso verificar se ainda existem políticas `USING (true)` remanescentes

### 3. Função de seed de eventos sem autenticação
A edge function `seed-calendar-events` não verifica se quem chamou é autenticado ou admin.

**Correção:**
- Adicionar verificação de autenticação e role de admin na function

---

## Problemas Médios (amarelo)

### 4. Bucket de recibos público
O bucket `receipts` está configurado como público — qualquer pessoa com a URL pode ver recibos financeiros.

**Correção:**
- Tornar o bucket privado e ajustar políticas de acesso

### 5. Validação de input nas edge functions
As edge functions não validam formato, tamanho ou conteúdo dos inputs adequadamente.

**Correção:**
- Adicionar validação de UUID, username, senha e role nas functions

### 6. Proteção contra senhas vazadas desabilitada
O recurso de detecção de senhas comprometidas está desativado.

**Correção:**
- Habilitar a proteção contra senhas vazadas nas configurações de autenticação

---

## Informativo (baixo risco)
- Função `get_email_by_username` — aceitável para o caso de uso de login
- Timing de contribuições reveladas — risco mínimo

---

## Ordem de implementação sugerida

1. **Remover `plain_password`** — mais crítico, elimina exposição direta de credenciais
2. **Proteger `seed-calendar-events`** — endpoint aberto
3. **Tornar bucket `receipts` privado**
4. **Adicionar validação de inputs nas edge functions**
5. **Habilitar proteção contra senhas vazadas**

### Arquivos modificados
- Migração SQL (remover coluna `plain_password`, atualizar trigger)
- `supabase/functions/create-user/index.ts`
- `supabase/functions/update-user-password/index.ts`
- `supabase/functions/seed-calendar-events/index.ts`
- `src/pages/Usuarios.tsx` (remover exibição de senha)
- Migração SQL (tornar bucket privado + políticas)

