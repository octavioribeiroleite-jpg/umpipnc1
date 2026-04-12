

# Plano: Resumo Financeiro Completo na Aba de Cobranças

## Contexto
A aba de Cobranças mostra apenas contagem de pagos/pendentes/isentos. O usuario quer ver valores monetarios: quanto ja recebeu, quanto falta receber, dividido entre mensalidade e per capita.

## Alteracoes em `src/components/financas/CobrancasTab.tsx`

### 1. Calcular totais financeiros a partir dos dados existentes
- Total mensalidades a receber (soma `amount` onde `type = 'mensalidade'`)
- Total mensalidades recebido (soma `paid_amount` onde `type = 'mensalidade'` e `status = 'pago'`)
- Total mensalidades pendente (diferenca)
- Mesma logica para per capita
- Total geral (mensalidade + per capita)

### 2. Novo card de resumo financeiro acima dos mini-cards de status
Layout:

```text
┌─────────────────────────────────────────┐
│ Resumo Financeiro - Abril/2026          │
│                                         │
│ MENSALIDADE          PER CAPITA         │
│ Previsto: R$ 600     Previsto: R$ 300   │
│ Recebido: R$ 400     Recebido: R$ 200  │
│ Pendente: R$ 200     Pendente: R$ 100   │
│                                         │
│ TOTAL                                   │
│ Previsto: R$ 900                        │
│ Recebido: R$ 600  |  Pendente: R$ 300  │
└─────────────────────────────────────────┘
```

- Cores: recebido em verde, pendente em vermelho/laranja
- Formato compacto no mobile (grid 2 colunas para mensalidade/percapita, 1 coluna para total)
- Valores formatados em R$ com virgula

### 3. Mini-cards de status existentes
- Manter como estao (filtros rapidos por Pagos/Pendentes/Isentos)
- Apenas reposicionar abaixo do novo resumo

## Arquivo alterado
- `src/components/financas/CobrancasTab.tsx`

