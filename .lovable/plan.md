

# Implementar Migração de Isolamento por Sociedade

## O que será feito

Uma migração SQL que será aplicada automaticamente ao banco de dados, sem necessidade de ação manual.

## Conteúdo da migração

1. **Criar função `get_user_society_id()`** - retorna o `society_id` do perfil do usuário autenticado

2. **Atualizar políticas RLS em 16 tabelas** para filtrar por sociedade:

### Tabelas com `society_id` direto (14 tabelas):
- charges, transactions, members, meetings, tasks, files
- financial_settings, financial_categories, membership_payments
- shirt_inventory, shirt_purchases, shirt_purchase_items, shirt_sales
- member_payment_submissions

### Tabelas vinculadas via meeting_id (4 tabelas):
- agenda_items, meeting_participants, contributions, ai_suggestions

## Regras de acesso após a migração

| Papel | Leitura | Escrita |
|-------|---------|---------|
| Admin | Todas as sociedades | Todas as sociedades |
| Pastor | Todas as sociedades | Nenhuma (somente leitura) |
| Diretoria | Apenas sua sociedade | Apenas sua sociedade |
| Visualizador | Apenas sua sociedade | Nenhuma |

## Detalhes Técnicos

### Função auxiliar
```text
get_user_society_id(uuid) -> uuid
  SECURITY DEFINER (evita recursão RLS)
  Retorna profiles.society_id WHERE user_id = parametro
```

### Padrão SELECT (tabelas com society_id)
```text
USING (
  has_role(auth.uid(), 'admin')
  OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
)
```

### Padrão INSERT/UPDATE/DELETE (management)
```text
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
```

### Padrão para tabelas via meeting_id
```text
USING (
  has_role(auth.uid(), 'admin')
  OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = table.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  )
)
```

## Nenhuma alteração no frontend
O código já filtra por sociedade. Esta migração adiciona proteção no banco de dados.

