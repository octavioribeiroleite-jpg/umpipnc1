## Problema

O lucro das camisas sai errado porque os dados estão inconsistentes — não é um bug de fórmula, e sim de **registro**:

1. **O custo das camisas está solto.** A compra foi lançada como gasto manual avulso ("Camisas UMP" R$ 2.369,00 + "Arte da camisa UMP" R$ 40,00 = **R$ 2.409,00**), sem estar ligada a uma Campanha ou Compra de camisas. O Resumo só desconta o custo quando ele está em `shirt_campaigns` ou `shirt_purchases`, que estão vazias. Por isso o lucro aparece sem custo (inflado).
2. **As encomendas não têm campanha.** As 35 encomendas (44 camisas) estão com `campaign_id` vazio, então o resumo financeiro da aba Encomendas nunca calcula lucro ("Selecione uma campanha…").
3. **Dados duplicados.** Existe um sistema antigo de "vendas diretas" (`shirt_sales`, de 08/05) com 34 vendas somando R$ 2.340 — a mesma campanha lançada duas vezes. Isso infla as receitas.
4. **Pagamentos sem entrada no caixa.** Dos R$ 2.340 marcados como pagos nas encomendas, só R$ 487,50 geraram transação de receita; os outros R$ 1.852,50 foram marcados como pagos sem entrar no caixa.

## Números corretos (referência)

```
Encomendas (campanha atual):  44 camisas (41 vendidas + 3 brindes)
Total vendido (devido):       R$ 2.665,00
Recebido:                     R$ 2.340,00
A receber:                    R$   325,00
Custo total (compra + arte):  R$ 2.409,00
Lucro projetado:              R$   256,00
Resultado de caixa atual:     R$   -69,00
```

## Plano de correção

**Etapa 1 — Criar a Campanha de camisas com o custo correto**
- Criar um registro em `shirt_campaigns` para a UMP: 44 camisas, custo total **R$ 2.409,00**, com a transação de custo vinculada.
- Aproveitar a saída já existente "Camisas UMP" (R$ 2.369) + "Arte da camisa UMP" (R$ 40) como o custo dessa campanha, evitando lançar gasto em duplicidade.

**Etapa 2 — Vincular as encomendas à campanha**
- Atualizar as 35 encomendas (`shirt_orders.campaign_id`) para apontar para a campanha criada, para o resumo financeiro passar a calcular lucro automaticamente.

**Etapa 3 — Remover a duplicidade antiga**
- Excluir as 34 "vendas diretas" antigas (`shirt_sales`, de 08/05) e suas transações `shirt_sale` (R$ 1.397,50), já que representam a mesma campanha das encomendas. Isso remove o aviso de "vendas diretas antigas" e tira o valor inflado das receitas.

**Etapa 4 — Acertar os pagamentos sem entrada no caixa**
- Para os R$ 1.852,50 marcados como pagos sem transação, gerar as transações de receita correspondentes (`shirt_order_payment`), para receitas e saldo refletirem o caixa real.
- Após isso, conferir Saldo, Receitas e o lucro da campanha.

## Detalhes técnicos

- Etapas 1–4 são **correção de dados** (não mudam código): feitas via operações de banco escopadas por `society_id` da UMP, sempre com `WHERE` (regra safe-update).
- A criação da campanha reaproveita as transações de saída já existentes como `transaction_id`, em vez de criar novo gasto.
- O cálculo de lucro do app (`EncomendasTab.calculateCampaignSummary` e o Resumo de `CamisasTab`) já está correto — passa a funcionar assim que `shirt_campaigns` e `campaign_id` estiverem preenchidos.
- Antes de excluir/alterar, confirmo a contagem exata de linhas afetadas para evitar apagar dados de outras sociedades.

## Confirmação necessária

Antes da Etapa 4, preciso confirmar com você: os R$ 1.852,50 marcados como pagos **realmente foram recebidos** (dinheiro/Pix em mãos) e só faltou lançar? Se sim, geramos as entradas; se não, ajustamos o `amount_paid` para refletir o que de fato entrou.
