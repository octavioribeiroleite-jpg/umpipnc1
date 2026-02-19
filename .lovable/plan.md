

# Legenda de Cores + Lista de Programacoes do Mes

## O que sera feito

1. **Legenda de cores** acima do grid do calendario (abaixo do seletor de visualizacao), mostrando bolinhas coloridas com o nome de cada sociedade (UMP, SAF, UPH, UPA, UCP) e "IPNC" para eventos gerais (cinza).

2. **Lista de programacoes do mes** abaixo do calendario, agrupadas por dia, mostrando titulo do evento, nome da sociedade (com cor), descricao e horario. O usuario pode simplesmente rolar para ver todas as programacoes do mes.

## Secao Tecnica

### Arquivo: `src/pages/Calendario.tsx`

**Mudanca 1 - Legenda de cores**

Adicionar uma secao entre o `CalendarViewSelector` e o grid de dias, com layout horizontal (flex-wrap) mostrando:

```text
[bolinha azul] UMP  [bolinha rosa] SAF  [bolinha verde] UPH  [bolinha laranja] UPA  [bolinha roxa] UCP  [bolinha cinza] IPNC
```

Sera um mapeamento estatico das cores conhecidas para nomes:

| Cor | Nome |
|---|---|
| #3b82f6 | UMP |
| #ec4899 | SAF |
| #10b981 | UPH |
| #f97316 | UPA |
| #8b5cf6 | UCP |
| #6b7280 | IPNC |

**Mudanca 2 - Lista de programacoes abaixo do calendario**

Adicionar um Card abaixo do grid principal (fora do grid lg:grid-cols-4), com titulo "Programacoes de {Mes}". Conteudo:

- Agrupar `events` por dia (extraindo a data local)
- Para cada dia, mostrar um cabecalho com data formatada (ex: "Sabado, 21 de Fevereiro")
- Para cada evento do dia, mostrar:
  - Bolinha colorida + nome da sociedade (derivado da cor)
  - Titulo do evento
  - Horario (ou "Dia inteiro")
  - Descricao (se houver)
  - Local (se houver)
- Estilo: cards compactos com borda lateral colorida, separados por dia

A derivacao do nome da sociedade sera feita pelo mapeamento de cor, ja que os dados mostram que cada sociedade tem cor unica. Para eventos com cor `#6b7280`, o nome sera "IPNC".

### Resumo

| Mudanca | Local |
|---|---|
| Legenda de cores (bolinhas + nomes) | Dentro do Card do calendario, apos CalendarViewSelector |
| Lista de programacoes do mes agrupada por dia | Novo Card abaixo do grid principal |

Apenas o arquivo `src/pages/Calendario.tsx` sera modificado.

