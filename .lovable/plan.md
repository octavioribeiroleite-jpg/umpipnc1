
# Ajuste de Espaçamento no Topo da Página de Comunicados

## Problema
O cabeçalho "Comunicados" com o botão "Novo" está colado na barra superior do mobile. O `PastorLayout` aplica `pt-14` para compensar o header fixo de 56px, mas não sobra respiro visual entre a barra e o conteúdo.

## Solução
Aumentar o padding-top do layout mobile de `pt-14` para `pt-16` no `PastorLayout`, adicionando 8px de respiro. Isso beneficia todas as páginas do pastor, não apenas Comunicados.

## Detalhe Técnico

### Arquivo: `src/components/pastor/PastorLayout.tsx` (linha 58)

Alterar de:
```
<main className="flex-1 overflow-auto pt-14 px-3 pb-4">
```

Para:
```
<main className="flex-1 overflow-auto pt-16 px-3 pb-4">
```

Nenhuma outra alteração necessária.
