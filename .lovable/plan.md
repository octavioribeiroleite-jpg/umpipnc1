

# Corrigir INSERT de visitante para usuarios autenticados

## Problema

A politica de INSERT na tabela `portal_visitors` foi criada apenas para o papel `anon`:

```sql
CREATE POLICY "Anon can insert portal visitors"
  ON portal_visitors FOR INSERT TO anon
  WITH CHECK (true);
```

Quando um usuario ja esta logado (como admin, diretoria, etc.), o Supabase usa o papel `authenticated`, e essa politica nao se aplica. Por isso o INSERT falha com "violates row-level security policy".

## Solucao

Adicionar uma politica de INSERT permissiva tambem para `authenticated`, permitindo que qualquer usuario logado tambem possa se registrar como visitante no portal.

## Detalhes tecnicos

### Migracao SQL

```sql
CREATE POLICY "Authenticated can insert portal visitors"
  ON portal_visitors FOR INSERT TO authenticated
  WITH CHECK (true);
```

Isso cria uma segunda politica de INSERT (permissiva) que cobre usuarios autenticados. A politica existente para `anon` continua funcionando para visitantes nao logados.

### Nenhuma mudanca de codigo

O codigo do `PortalIgreja.tsx` permanece o mesmo.

