
# Isolamento completo de dados por sociedade

## Problema encontrado

A funcao backend `summarize-for-pastor` tem uma falha de isolamento: mesmo quando recebe um `society_id` especifico (ex: UMP), ela:

1. Busca `membership_payments` de TODAS as sociedades (linha 71 - sem filtro)
2. Busca `events` de TODAS as sociedades (linha 74 - sem filtro)  
3. Busca `plenaries` de TODAS as sociedades (linha 75 - sem filtro)
4. Computa stats para TODAS as sociedades (linhas 89-109), nao apenas para a solicitada
5. Envia contexto de TODAS as sociedades para a IA (linhas 180-209), resultando em resumo misturado

Por isso, quando o pastor abre a pagina da UMP, o resumo da IA fala sobre SAF, UPA, UPH -- dados que nao pertencem aquela sociedade.

## Solucao

### 1. `supabase/functions/summarize-for-pastor/index.ts`

Quando `society_id` for fornecido:

- Filtrar `membership_payments` apenas por membros daquela sociedade (usando os member_ids ja carregados)
- Filtrar `events` por `society_id` (eventos da sociedade) + eventos sem society_id (eventos gerais da igreja)
- Computar stats apenas para a sociedade solicitada, nao para todas
- Enviar para a IA apenas o contexto daquela sociedade especifica
- Ajustar o prompt da IA para focar na sociedade individual em vez de comparar todas

Quando `society_id` NAO for fornecido (dashboard global do pastor):
- Manter o comportamento atual: buscar tudo, comparar sociedades

### 2. `src/pages/PastorSociedade.tsx`

A pagina ja filtra corretamente por `society_id` nas queries diretas (meetings, tasks, members, transactions, payments). Nenhuma mudanca necessaria na camada de dados direta.

A unica mudanca e garantir que o resumo da IA retornado pelo backend ja venha filtrado (corrigido no passo 1 acima).

### Arquivos modificados
- `supabase/functions/summarize-for-pastor/index.ts` (filtros por society_id na funcao backend)
