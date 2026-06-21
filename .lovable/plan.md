## Objetivo

Organizar a aba **Camisas** para que o **Resumo** concentre, de forma limpa e segmentada, todos os números do lote — incluindo os brindes contabilizados como gasto (pelo custo de produção) — mantendo "Valor a receber (total)" e "Lucro previsto" em destaque.

## O que muda

Tudo acontece na aba **Camisas → Resumo** (`src/components/financas/CamisasTab.tsx`). As demais sub-abas (Encomendas, Campanhas, Compras, Vendas, Estoque) continuam servindo de referência detalhada das vendas; o Resumo passa a ser a visão consolidada.

### 1. Brinde contabilizado como gasto (custo de produção)
- Calcular o custo dos brindes = quantidade de camisas dadas como brinde × custo unitário da campanha (hoje ≈ 3 × R$ 54,75 = **R$ 164,25**).
- Como o custo da compra da campanha já inclui essas camisas, o valor **não será somado em dobro** ao custo total — ele será **destacado** dentro do card de gastos (ex.: "Gastos das camisas R$ 2.409,00 · sendo R$ 164,25 em brindes"), só para controle e visualização.

### 2. Cards do Resumo (reorganizados, em destaque)
Quatro cards principais, na ordem:

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Recebido /       │ A receber        │ Gastos (com      │ Lucro previsto   │
│ Caixa atual      │ (total)          │ brindes)         │                  │
│ R$ 2.340,00      │ R$ 325,00        │ R$ 2.409,00      │ R$ 256,00        │
│ caixa: -R$ 69,00 │                  │ brindes:R$164,25 │ se todos pagarem │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

- **Recebido / Caixa atual**: total recebido e o resultado de caixa (recebido − custos).
- **A receber (total)**: soma do que falta receber de todas as encomendas.
- **Gastos (com brindes)**: custo total das camisas, com o valor dos brindes destacado embaixo.
- **Lucro previsto**: resultado se todos pagarem (encomendado − custos), já considerando que os brindes não geram receita.

### 3. Segmentação/organização visual
- Agrupar os cards do Resumo em duas seções com títulos claros: **"Financeiro do lote"** (os 4 cards acima) e **"Produção e estoque"** (quantidades, tamanhos, entregas), para a visualização ficar organizada.
- Manter o aviso de vendas antigas apenas se ainda existir (hoje já está zerado).

## Detalhes técnicos

- Brinde em quantidade: somar `quantity` das encomendas com `is_gift = true`.
- Custo unitário: usar `unit_cost` da campanha (fallback: `total_purchase_cost / purchased_quantity`).
- `giftCost = giftQty * unitCost` — exibido como detalhe no card de gastos, sem alterar `realShirtCosts` (evita duplicidade).
- "A receber (total)" = `orderToReceive` (já calculado).
- "Lucro previsto" = `orderOrdered - realShirtCosts` (mantém a fórmula atual, que já trata brinde como custo sem receita).
- Mudança apenas de apresentação/cálculo no componente do Resumo; nenhuma alteração de banco de dados.

## Fora de escopo (confirmar se quer depois)
- Incluir um bloco de camisas no PDF de **Relatórios** (`RelatoriosTab` / `financialReportPdf.ts`) não existe hoje. Posso adicionar em uma etapa seguinte, se você quiser que o consolidado das camisas também saia no relatório.
