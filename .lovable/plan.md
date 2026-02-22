

# Corrigir erro ao criar visitante no portal

## Problema

O banco de dados esta rejeitando o INSERT na tabela `portal_visitors` com o erro: **"new row violates row-level security policy"**.

A causa raiz e que todas as politicas RLS da tabela `portal_visitors` foram criadas como **RESTRICTIVE** (restritivas). No PostgreSQL, politicas restritivas funcionam com logica AND -- ou seja, **todas** precisam passar ao mesmo tempo. Como a politica de SELECT so permite admin/diretoria/pastor, ela bloqueia o INSERT anonimo tambem.

## Solucao

Recriar as politicas de INSERT e UPDATE como **PERMISSIVE** (permissivas), que e o comportamento padrao e correto para esse caso. Politicas permissivas funcionam com logica OR -- basta uma delas passar.

## Detalhes tecnicos

### Migracao SQL

Remover as 3 politicas restritivas atuais e recriar como permissivas:

```sql
-- Remover politicas restritivas
DROP POLICY "Anon can insert portal visitors" ON portal_visitors;
DROP POLICY "Anon can update own device last_access" ON portal_visitors;
DROP POLICY "Management can view portal visitors" ON portal_visitors;

-- Recriar como PERMISSIVE
CREATE POLICY "Anon can insert portal visitors"
  ON portal_visitors FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update own device last_access"
  ON portal_visitors FOR UPDATE TO anon
  USING (device_id = current_setting('request.headers')::json->>'x-device-id')
  WITH CHECK (true);

CREATE POLICY "Management can view portal visitors"
  ON portal_visitors FOR SELECT TO authenticated
  USING (has_management_role(auth.uid()) OR has_pastor_role(auth.uid()));
```

**Nota:** As politicas permissivas sao o padrao do PostgreSQL. A diferenca e nao incluir a clausula `RESTRICTIVE`. O INSERT para `anon` com `WITH CHECK (true)` permite qualquer visitante se registrar, e o SELECT continua restrito a gestao.

### Nenhuma mudanca de codigo

O codigo do `PortalIgreja.tsx` esta correto. O problema e exclusivamente nas politicas RLS do banco.
