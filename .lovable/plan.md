
# Corrigir Vinculacao de Membros com Logins Existentes

## Problema Identificado

Os logins ja foram criados anteriormente para todos os 18 membros (existem no sistema de autenticacao com emails como `bianca@ipnc.local`, `daviteles@ipnc.local`, etc.), mas a coluna `user_id` na tabela `members` esta `null` para todos. Isso faz com que:

1. A interface mostre "Sem login" para todos
2. Ao tentar criar logins novamente, da erro "email already exists"

## Solucao

### Passo 1: Vincular membros existentes aos usuarios ja criados (SQL Migration)

Executar um UPDATE que faca o match entre `members.name` e `profiles.full_name` para preencher o `user_id`:

```sql
UPDATE members m
SET user_id = p.user_id
FROM profiles p
WHERE LOWER(TRIM(m.name)) = LOWER(TRIM(p.full_name))
  AND m.user_id IS NULL
  AND p.user_id IS NOT NULL;
```

Isso vai vincular imediatamente os 18 membros aos seus logins existentes.

### Passo 2: Melhorar a edge function `create-user`

Atualizar a funcao para que, quando o email ja existir, ela tente vincular o usuario existente ao membro em vez de simplesmente retornar erro:

- Se o erro for "email already exists", buscar o usuario existente pelo email
- Vincular o `user_id` encontrado ao `member_id` fornecido
- Retornar sucesso com as credenciais existentes

### Passo 3: Garantir exibicao correta na interface

A pagina de Usuarios ja tem a logica para exibir login/senha quando o `user_id` existe. Apos o passo 1, os dados aparecerao automaticamente pois o `fetchMembers` ja busca o profile vinculado.

## Resultado Esperado

- Todos os 18 membros mostrarao login e senha na interface
- O botao "Criar logins em massa" funcionara sem erro para novos membros futuros
- Membros ja vinculados mostrarao as credenciais com opcao de copiar
