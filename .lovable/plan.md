## Objetivo

Reorganizar a aba **Camisas** (Finanças) para suportar o fluxo real de encomendas:
1. Abre a proposta → registra as encomendas (nome, tamanho, quantidade, valor).
2. Acompanha **pagamento** (à vista, ou 50% início / 50% final) — com baixa no relatório financeiro.
3. Acompanha **entrega** (pendente / entregue) quando as camisas chegam.

## Nova estrutura da aba Camisas

A aba passa a ter 4 sub-abas:
- **Resumo** (já existe) — adiciona indicadores de pedidos: total encomendado, valor a receber, entregues x pendentes.
- **Encomendas / Entregas** (nova) — o coração desta funcionalidade.
- **Compras** (já existe) — compra em lote do fornecedor, continua entrando como despesa no relatório.
- **Vendas** (já existe) — venda avulsa do estoque, mantida como está.

## Sub-aba "Encomendas / Entregas"

Tabela completa com filtros (status de pagamento, status de entrega, tamanho) e busca por nome.

Colunas por pedido:
- **Nome** (texto livre)
- **Tamanho** e **Quantidade**
- **Valor unitário** e **Valor total**
- **Forma de pagamento**: À vista ou Parcelado (metade/metade)
- **Pago**: valor já pago / total, com badge **Pendente · Parcial · Pago**
- **Entrega**: badge **Pendente · Entregue** + botão "Marcar entregue"
- Ações: registrar pagamento, editar, excluir

Ações rápidas:
- **Registrar pagamento** (valor parcial ou total) → cria uma transação de **entrada** no relatório financeiro (dando baixa em quem paga), com `reference_type = 'shirt_order_payment'`.
- **Marcar como entregue / desfazer** → atualiza status e data de entrega.
- Cabeçalho com totais: encomendado, recebido, a receber, entregues/pendentes.

## Mudanças no banco

Nova tabela `public.shirt_orders`:
- `buyer_name` (texto livre), `size`, `quantity`, `unit_price`, `total_price`
- `payment_type` ('a_vista' | 'parcelado')
- `amount_paid` (quanto já foi pago), status de pagamento derivado em tela
- `delivery_status` ('pendente' | 'entregue'), `delivered_at`
- `notes`, `date`, `society_id`, `created_by`, timestamps

Nova tabela `public.shirt_order_payments` (histórico de pagamentos parciais):
- `order_id`, `amount`, `date`, `transaction_id`, `created_by`, `society_id`

Ambas com GRANTs e RLS no mesmo padrão das demais tabelas de camisas (acesso por diretoria/admin, isolado por `society_id`). Cada pagamento registrado gera uma transação de entrada para aparecer no relatório financeiro.

> Observação: o estoque continua sendo controlado por Compras/Vendas. As encomendas são um controle paralelo de pedido/pagamento/entrega — se você quiser que entregar uma camisa também baixe do estoque, posso ligar isso, mas por padrão deixarei separado para não conflitar com a venda avulsa.

## Detalhes técnicos

- Editar `src/components/financas/CamisasTab.tsx`: adicionar a sub-aba e a tabela de encomendas; extrair a parte de encomendas para um novo componente `EncomendasTab.tsx` para manter o arquivo organizado.
- Registro de pagamento insere em `transactions` (type `entrada`, `reference_type 'shirt_order_payment'`) e em `shirt_order_payments`, e atualiza `amount_paid` da encomenda.
- Exclusão de pagamento/encomenda reverte as transações vinculadas (mesmo padrão atual de compras/vendas).
- Datas sempre em fuso local (padrão do projeto).

## Fora de escopo
- Não vou alterar o cálculo de estoque das vendas avulsas existentes.
- Não vou mexer no layout do header já ajustado.