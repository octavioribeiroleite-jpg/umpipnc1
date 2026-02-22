

# Melhorias na Tela de Reunioes (Mobile)

## Problemas Identificados

1. **Filtros ocupam muito espaco vertical** - Busca, status e mes estao empilhados, ocupando quase metade da tela antes de chegar ao conteudo
2. **Formatacao da data na pasta** - "16 De Dezembro De 2025" com "De" maiusculo (deveria ser "de")
3. **Botao "Nova Reuniao" ocupa espaco fixo no topo** - Poderia ser um FAB (botao flutuante) no mobile para liberar espaco
4. **Card da reuniao pode ser mais compacto** - Informacoes como "Pauta: incompleta" e indicadores de progresso ocupam bastante espaco
5. **Filtros poderiam ser colapsaveis** - Um botao de filtro que expande/recolhe, mostrando badge com filtros ativos

## Alteracoes Planejadas

### 1. `src/components/reunioes/ReuniaoFilters.tsx`
- Tornar filtros colapsaveis no mobile com um botao "Filtros" que expande/recolhe
- Mostrar badge com quantidade de filtros ativos
- No desktop, manter layout atual (lado a lado)
- Colocar busca sempre visivel, e status + mes dentro do colapsavel

### 2. `src/components/reunioes/ReuniaoPastaData.tsx`
- Corrigir capitalizacao da data (usar "dd 'de' MMMM 'de' yyyy" corretamente -- o problema e o `capitalize` no CSS que forca maiusculas)
- Remover a classe `capitalize` que esta forçando "De" maiusculo

### 3. `src/pages/Reunioes.tsx`
- No mobile, trocar o botao "Nova Reuniao" do header por um FAB (botao flutuante) no canto inferior direito
- Manter o botao normal no desktop

### 4. `src/components/reunioes/ReuniaoCard.tsx`
- Compactar layout mobile: reduzir padding e espacamento
- Colocar botoes de acao (Ver Ata / Excluir) mais compactos
- Reduzir tamanho dos indicadores de progresso no mobile

## Detalhes Tecnicos

### ReuniaoFilters - Filtros colapsaveis
- Usar `Collapsible` do Radix no mobile
- Busca sempre visivel
- Botao "Filtros" com icone `SlidersHorizontal` e badge de contagem
- `useIsMobile()` para detectar tamanho

### ReuniaoPastaData - Data
- Remover classe CSS `capitalize` da span da data
- O `date-fns` ja formata corretamente com minusculas

### Reunioes - FAB
- Usar componente `fab.tsx` existente ou criar botao fixo `fixed bottom-20 right-4` no mobile
- Esconder botao do PageHeader no mobile com `hidden md:block`

### ReuniaoCard - Compactacao
- Padding `p-3` no mobile (era `p-4`)
- Gap menor entre elementos
- Texto dos indicadores mais compacto
