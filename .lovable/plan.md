## Objetivo

Lançar o pedido de **40 camisas** na sociedade **UMP** sem mexer na estrutura atual do módulo (sem campos novos de OFF/PRETA/Infantil/status). Toda a granularidade que não cabe nos campos hoje será preservada nas **observações** de cada venda.

## Mapeamentos adotados

**Tamanhos (constraint do banco aceita só PP/P/M/G/GG/XG):**
- Infantil 2/3/4 anos → registrado como **PP** (com a idade na observação)

**Status (cores) → preço efetivamente pago:**
- 🟢 PAGO INTEGRAL → recebe valor integral (qtd × R$ 65) e gera transação de entrada
- 🟡 PAGO METADE → recebe metade (qtd × R$ 32,50) e gera transação de entrada com esse valor
- 🔵 DOAÇÃO → nenhuma transação financeira (custo continua no pedido de compra)
- ⚪ A CONFERIR → nenhuma transação por enquanto; observação destaca "REVISAR"

O `payment_method` de cada venda receberá `pago_integral`, `pago_metade`, `doacao` ou `a_conferir` para você filtrar depois.

## Passo a passo da importação

1. **Compra única (R$ 2.200 / 40 unidades)** em `shirt_purchases` com data de hoje, fornecedor "Pedido camisas", e observação detalhando os totais OFF (32) e PRETA (8). Cria também a transação de saída (despesa) de R$ 2.200.
2. **Itens da compra** em `shirt_purchase_items` agregados por tamanho (infantil → PP):
   - PP: 5 · P: 9 · M: 19 · G: 5 · GG: 1 · XG: 1
3. **Estoque** em `shirt_inventory`: ajusta as quantidades por tamanho com custo médio de R$ 55. Após as 33 vendas abaixo, o estoque ficará zerado (40 entram, 40 saem).
4. **33 vendas individuais** em `shirt_sales`, uma por pessoa (ordem do XLS). Casos com tamanhos diferentes (ex.: Octávio 1M + 1XG) são divididos em duas linhas para manter o estoque exato. Cada venda guarda em `notes` o detalhamento original (modelo OFF/PRETA, infantil etc.).
5. **Transações de entrada** só são criadas para vendas verdes e amarelas, com o valor efetivamente recebido. Vinculadas à venda via `transaction_id`.

## Resumo numérico esperado

```text
Custo total (compra)        R$ 2.200,00
Receita potencial (40×65)   R$ 2.600,00  (referência)
Receita lançada no sistema  R$ 2.340,00  (40 - 4 doações = 36 × 65)
Recebido efetivo            = soma das verdes (integral) + amarelas (metade)
Em aberto                   = amarelas (metade restante) + brancas (a conferir)
Lucro previsto              R$ 140,00 (após 4 doações)
```

## Detalhe técnico das vendas (33 pessoas, 34 linhas)

| Pessoa | Tam. (BD) | Qtd | Status | Obs. |
|---|---|---|---|---|
| Octávio | M | 1 | 🟢 integral | 1 M OFF (split) |
| Octávio | XG | 1 | 🟢 integral | 1 XG OFF (split) |
| Cintia | PP | 2 | 🟢 integral | 2 PP OFF |
| Wânia | P | 1 | 🟡 metade | 1 P OFF |
| Matheus | G | 1 | 🟡 metade | 1 G PRETA |
| Davi | M | 2 | 🟡 metade | 1 M OFF + 1 M PRETA |
| Bianca | M | 1 | 🟢 integral | 1 M OFF |
| Viviane | P | 1 | 🟢 integral | 1 P OFF |
| Thainara | P | 2 | 🟢 integral | 1 P OFF + 1 P PRETA |
| Rodrigo (Jana) | M | 2 | 🟡 metade | 1 M OFF + 1 M PRETA |
| Vitor | G | 1 | 🟡 metade | 1 G OFF |
| Emilly | M | 1 | 🟡 metade | 1 M OFF |
| Marlon | G | 2 | 🟡 metade | 1 G OFF + 1 G PRETA |
| Lucas Felipe | M | 1 | 🟡 metade | 1 M OFF |
| Mayara | M | 1 | 🟡 metade | 1 M OFF |
| Fernando (Fel) | PP | 1 | 🟡 metade | Infantil 4 anos OFF |
| Isabella | P | 1 | ⚪ a conferir | 1 P OFF |
| Eduarda | P | 1 | 🟢 integral | 1 P OFF |
| Dany | P | 1 | 🟡 metade | 1 P OFF |
| Ricardo | M | 1 | 🔵 doação | 1 M OFF |
| Elisa | PP | 1 | 🟡 metade | Infantil 3 anos OFF |
| Joice | M | 1 | 🟢 integral | 1 M OFF |
| Wesley | GG | 1 | 🟢 integral | 1 GG OFF |
| Raquel | M | 1 | 🟡 metade | 1 M OFF |
| Daniel Pastor | M | 2 | ⚪ a conferir | 1 M OFF + 1 M PRETA |
| André | M | 1 | ⚪ a conferir | 1 M OFF |
| Rafael | M | 1 | 🟡 metade | 1 M PRETA |
| Daniel | M | 1 | 🟡 metade | 1 M OFF |
| Helena | PP | 1 | 🟡 metade | Infantil 2 anos OFF |
| Jaqueline | M | 1 | 🔵 doação | 1 M OFF |
| Valkiria | P | 1 | 🟡 metade | 1 P OFF |
| Franklin | G | 1 | 🟡 metade | 1 G PRETA |
| Thierry | M | 1 | 🔵 doação | 1 M OFF |
| Ana | P | 1 | 🔵 doação | 1 P OFF |

**Confere:** OFF 32 + PRETA 8 = **40** ✓

## O que NÃO será feito

- Nenhuma alteração de schema, tela ou layout do módulo Camisas.
- Sem distinção visual de OFF/PRETA ou status colorido (cabe num próximo passo, se quiser).
- Os 4 status ficam codificados em `payment_method` (`pago_integral` / `pago_metade` / `doacao` / `a_conferir`) para você filtrar manualmente.