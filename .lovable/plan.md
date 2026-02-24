

# Corrigir menu Visitantes + Resumo inteligente por domingos

## 1. Corrigir menu faltando no MobileHeader

O item "Visitantes" esta ausente no menu hamburger do admin mobile (`src/components/layout/MobileHeader.tsx`).

**Correcao:** Adicionar `{ to: '/visitantes', icon: Globe, label: 'Visitantes' }` ao array `adminItems` e importar o icone `Globe`.

## 2. Resumo inteligente por domingos

Adicionar uma secao no topo da pagina de Visitantes que mostra automaticamente os ultimos domingos com contagem de acessos, permitindo ver rapidamente quantas pessoas vieram em cada culto.

### Nova secao "Resumo dos Domingos"

- Lista os ultimos 8 domingos automaticamente (calculados a partir da data atual)
- Para cada domingo, mostra: data, total de acessos, membros e visitantes
- Cards clicaveis: ao clicar em um domingo, o filtro de data muda para aquele dia
- Domingo atual destacado visualmente
- Domingos sem nenhum acesso aparecem com contagem zero

### Layout

```text
+--------------------------------------------------+
| Resumo dos Domingos                              |
|                                                  |
| [23/02] [16/02] [09/02] [02/02] [26/01] ...    |
|  12       8       15      0       10             |
|  acessos  acessos acessos acessos acessos        |
+--------------------------------------------------+
```

Cada card mostra:
- Data do domingo (dd/MM)
- Numero total de acessos
- Mini breakdown: "X membros, Y visitantes"
- Fundo destacado se for o domingo selecionado no filtro

## Detalhes tecnicos

### `src/components/layout/MobileHeader.tsx`
- Adicionar `Globe` ao import de lucide-react
- Adicionar `{ to: '/visitantes', icon: Globe, label: 'Visitantes' }` no array `adminItems`

### `src/pages/Visitantes.tsx`
- Novo `useMemo` para calcular os ultimos 8 domingos (`sundayStats`)
  - Usa `startOfDay` e loop para encontrar domingos anteriores
  - Para cada domingo, filtra `visitors` por `isSameDay` e conta total/membros/visitantes
- Nova secao de cards horizontais com scroll (`overflow-x-auto`) antes do filtro de data
- Cada card e clicavel e chama `setSelectedDate(sundayDate)`
- Card do domingo atualmente selecionado recebe borda/fundo destacado

### Arquivos modificados
- `src/components/layout/MobileHeader.tsx` (adicionar item Visitantes)
- `src/pages/Visitantes.tsx` (adicionar resumo de domingos)
