

# Layout dos Cards de Sociedades em Grid Responsivo

## O que sera feito

Alterar o container dos cards de sociedades no Painel do Pastor para exibir em grid de 2 colunas no desktop, mantendo 1 coluna no mobile.

## Alteracao

### `src/pages/PainelPastor.tsx` (linha ~290)

Trocar:
```text
<div className="space-y-3">
```
Por:
```text
<div className="grid grid-cols-2 gap-3">
```

Isso coloca os cards lado a lado tanto no mobile quanto no desktop, aproveitando melhor o espaco em ambos os tamanhos de tela.

