

# Ajuste de Proporções do Dashboard Mobile

## O que muda

O dashboard atual mostra os cards de estatísticas empilhados (1 por linha) no mobile, ocupando muito espaço vertical. O objetivo é deixar mais compacto, similar ao segundo print de referência.

### Alterações planejadas:

**1. Cards de estatísticas em grid 2x2 no mobile**
- Atualmente: 1 coluna no mobile, cada card ocupa a linha inteira
- Novo: Grid de 2 colunas no mobile, cards mais compactos
- Reduzir padding interno dos cards para ficarem menores

**2. Ações rápidas em grid 2x2**
- Atualmente: scroll horizontal
- Novo: Grid de 2 colunas fixo, sem scroll, similar ao layout do print de referência

**3. Espaçamentos mais compactos**
- Reduzir margins e paddings gerais no mobile para melhor aproveitamento de tela

### Arquivo modificado:
- `src/pages/Index.tsx` - Ajustar grid dos StatCards de `grid-cols-1` para `grid-cols-2` no mobile, ajustar layout das ações rápidas para grid 2x2, e reduzir espaçamentos internos dos componentes

