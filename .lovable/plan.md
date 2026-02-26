

# Corrigir registro de gastos: categorias vazias + erro ao salvar

## Problemas identificados

1. **Categorias não aparecem**: As categorias de gasto no banco têm `society_id = NULL` (são globais). Mas a query filtra por `society_id` quando o usuário pertence a uma sociedade, então nenhuma categoria é retornada.

2. **Erro ao registrar**: Após o INSERT da transação, o código faz um UPDATE separado para vincular o comprovante (linha 231). A política RLS de UPDATE exige `society_id = get_user_society_id(auth.uid())`, e esse UPDATE sem WHERE adequado falha.

## Correções em `src/components/financas/GastosTab.tsx`

### 1. Query de categorias — incluir globais (society_id IS NULL)
Alterar a query de categorias para buscar tanto as da sociedade quanto as globais:
```
catQuery = catQuery.or(`society_id.eq.${societyId},society_id.is.null`);
```
Em vez de `catQuery.eq('society_id', societyId)`.

### 2. Fluxo de comprovante — upload antes do INSERT
- Gerar UUID com `crypto.randomUUID()` antes do INSERT
- Fazer upload do comprovante usando esse UUID como nome do arquivo
- Incluir `receipt_url` diretamente no INSERT
- Eliminar o UPDATE separado na linha 231

## Arquivo modificado
- `src/components/financas/GastosTab.tsx`

