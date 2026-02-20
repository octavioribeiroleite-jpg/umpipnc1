
# Consolidar dados por sociedade e redesenhar cards de estatisticas

## Problema identificado

A query de `membership_payments` (linha 59) nao filtra por sociedade no banco -- busca todos os pagamentos pagos de todas as sociedades e depois filtra no cliente por `memberIds`. Isso funciona mas e ineficiente e pode causar confusao. As demais queries (meetings, tasks, members, transactions) ja filtram corretamente por `society_id`.

## Mudancas

### 1. `src/pages/PastorSociedade.tsx` -- Corrigir query de pagamentos

Adicionar filtro para buscar apenas pagamentos de membros da sociedade atual diretamente no banco, usando um join ou filtrando pelo `member_id` dos membros ja carregados. Como `membership_payments` nao tem `society_id`, a abordagem atual de filtrar por `memberIds` e valida, mas vamos reorganizar para ficar mais claro.

### 2. `src/pages/PastorSociedade.tsx` -- Redesenhar cards de estatisticas

Trocar o grid `grid-cols-2 md:grid-cols-4` por uma fileira unica horizontal com 5 cards compactos:

- Adicionar um 5o card: **Reunioes** (quantidade total)
- Layout: `grid grid-cols-5 gap-2` com cards bem menores
- Reduzir padding dos cards de `p-4` para `p-2`
- Reduzir tamanho da fonte do valor de `text-lg` para `text-sm` 
- Reduzir icones de `h-4 w-4` para `h-3 w-3`
- Reduzir label de `text-xs` para `text-[10px]`
- No mobile, usar `overflow-x-auto` com `flex` para scroll horizontal se necessario, ou manter `grid-cols-5` com cards minusculos

Resultado visual esperado (uma unica linha):

```text
| Saldo | Membros | Feitas | Pend. | Reun. |
| R$120 |    8    |   5    |   3   |   4   |
```

### Arquivos modificados
- `src/pages/PastorSociedade.tsx`
