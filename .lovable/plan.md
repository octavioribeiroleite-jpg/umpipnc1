## Objetivo

Adicionar um controle financeiro por **campanha/lote** de camisas ao módulo Finanças, separando compra, encomendas, recebimentos, pendências, brindes e estoque disponível — sem remover nada do que já existe (autenticação, isolamento por `society_id`, RLS, encomendas, pagamentos, compras, vendas diretas e transações).

Regra central: a **compra do lote gera uma única saída**; **encomenda não gera receita**; a **receita só nasce quando um pagamento é registrado**. Encomendas usam apenas `shirt_campaigns`, `shirt_orders`, `shirt_order_payments` e `transactions` — nunca `shirt_sales`.

## 1. Migration do banco

Nova migration `supabase/migrations/<timestamp>_shirt_campaigns_financial_control.sql`:

- Cria `public.shirt_campaigns` (nome, quantidade comprada, custo unitário, custo total, preço padrão de venda, fornecedor, data da compra, vínculo com a transação, `society_id`, `created_by`, timestamps) com índices, RLS, GRANTs e trigger de `updated_at`.
- Políticas RLS isoladas por sociedade (admin e pastor veem tudo; diretoria gerencia apenas a própria sociedade).
- Em `shirt_orders`: adiciona `campaign_id` (FK para campanha) e `unit_cost`.
- Em `shirt_order_payments`: adiciona `payment_method` e `notes`.
- Índices para `campaign_id` e `order_id`.
- Função `create_shirt_campaign(...)` (SECURITY DEFINER): valida permissão/sociedade, cria a transação de **saída** e a campanha **na mesma transação**, retornando o id.
- Função `register_shirt_order_payment(...)` (SECURITY DEFINER): valida permissão, bloqueia brinde, calcula saldo, recusa valor acima do pendente, cria a transação de **entrada**, insere em `shirt_order_payments` e atualiza `amount_paid` — tudo atômico.

A migration usa os nomes de funções já existentes no projeto (`has_role`, `has_pastor_role`, `get_user_society_id`, `update_updated_at_column`) e o enum `app_role`.

## 2. Tipos do Supabase

Após a migration aprovada/aplicada, os tipos em `src/integrations/supabase/types.ts` são regenerados, expondo `shirt_campaigns`, os novos campos (`campaign_id`, `unit_cost`, `payment_method`, `notes`) e as RPCs `create_shirt_campaign` e `register_shirt_order_payment`. Não usar `any` onde houver tipo.

## 3. Novo componente `CampanhasCamisasTab.tsx`

- Lista campanhas da sociedade ativa.
- Criação de campanha via RPC `create_shirt_campaign` (a saída financeira é criada pela RPC, nunca no frontend).
- Exibe nome, data, fornecedor, quantidade comprada, custo unitário, custo total, preço padrão, quantidade encomendada e quantidade disponível.
- Permite selecionar uma campanha (estado compartilhado com a aba Encomendas).
- Bloqueia exclusão quando houver transação, encomenda ou pagamento vinculados.

## 4. Ajustes em `EncomendasTab.tsx`

- Tipo `ShirtOrder` ganha `unit_cost` e `campaign_id`.
- Formulário ganha seleção de campanha: ao escolher, preenche o preço padrão de venda, copia o custo unitário e vincula `campaign_id`; impede encomendar acima do saldo disponível.
- Cadastro de encomenda **não** cria transação.
- Pagamento passa a usar a RPC `register_shirt_order_payment` (substitui o fluxo de 3 operações). Diálogo mostra valor, data, forma de pagamento, observação, total, já pago e restante; para parcelado sem pagamento, sugere metade (sem impedir valor menor).
- Resumo financeiro no topo: quantidade comprada, encomendada, disponível, custo total, total vendido, total recebido, a receber, resultado atual, lucro previsto e brindes — com `calculateCampaignSummary` e cores semânticas.
- Tabela com colunas Nome, Itens, Quantidade, Custo, Venda, Pago, Pendente, Pagamento, Entrega, Ações; cor da linha calculada por `getPaymentStatus`/`getPaymentRowClass` (sem salvar cor no banco).
- Filtros: campanha (incluindo "Sem campanha" para pedidos antigos), nome, cor, tamanho, pagamento, entrega.
- Exclusão bloqueada quando `amount_paid > 0`, com mensagem orientando estornar antes.

## 5. Integração em `CamisasTab.tsx`

Abas reorganizadas: Resumo, Campanhas, Encomendas, Compras, Vendas, Estoque. A aba Campanhas usa `<CampanhasCamisasTab />`; Encomendas continua com `<EncomendasTab />`. A campanha selecionada em Campanhas é compartilhada com Encomendas. Compras, Vendas e Estoque permanecem inalterados.

## Regras contábeis (resumo)

```text
totalCost          = campaign.total_purchase_cost
totalSold          = Σ order.total_price
totalReceived      = Σ order.amount_paid
totalPending       = max(0, totalSold - totalReceived)
currentCashResult  = totalReceived - totalCost
projectedProfit    = totalSold - totalCost
orderedQuantity    = Σ order.quantity
availableQuantity  = max(0, purchased_quantity - orderedQuantity)
brinde:  is_gift=true, total_price=0, amount_paid=0 (custo entra no totalCost)
```

## Detalhes técnicos

- `brl` via `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`.
- Datas sempre em fuso local (padrão do projeto).
- Cores via tokens semânticos; status de pagamento calculado em tela.
- Pedidos antigos sem `campaign_id` continuam visíveis (filtro "Sem campanha").

## Fora de escopo

- Não alterar `shirt_purchases`/`shirt_sales`/estoque avulso existentes além da reorganização de abas.
- Não excluir transações já consolidadas; exclusão só de encomendas sem pagamento.

## Verificação

Após implementar: aplicar a migration, regenerar tipos, validar build/lint, conferir o teste de aceitação (campanha "Camisas UMP 2026": custo R$ 2.420,00, vendido R$ 2.665,00, recebido R$ 1.917,50, a receber R$ 747,50, resultado -R$ 502,50, lucro previsto R$ 245,00) e a recusa de pagamento acima do saldo pendente.