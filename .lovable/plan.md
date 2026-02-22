

# Melhorias no Calendario Unificado do Pastor

## Problemas Identificados

1. **Card "Tema 2026" ocupa muito espaco no topo** - Mesmo sendo colapsavel, inicia aberto e empurra o calendario para baixo no mobile
2. **Sem legenda de cores** - O calendario geral (dos membros) tem uma legenda colorida para identificar as sociedades, mas o do Pastor nao tem
3. **Sem drawer de detalhe ao clicar no dia** - O calendario geral permite clicar num dia e ver todos os eventos em um drawer; o do Pastor nao tem isso
4. **Lista de "Proximos Eventos" muito longa** - Mostra todos os eventos futuros sem limite, gerando rolagem infinita (visivel na screenshot)
5. **Sem lista de programacoes mensais** - O calendario geral tem a secao "Programacoes de [Mes]" agrupada por dia abaixo da grade; o do Pastor nao tem
6. **Sem seletor de modo de visualizacao** - O calendario geral permite alternar entre Semana/15 dias/Mes no mobile; o do Pastor sempre mostra o mes inteiro

## Melhorias Propostas

### 1. Tema colapsado por padrao
Iniciar o Collapsible do Tema 2026 fechado para que o calendario fique visivel imediatamente.

### 2. Adicionar legenda de cores das sociedades
Incluir uma barra de legenda (bolinhas coloridas + sigla) abaixo dos controles de mes/filtro, igual ao calendario geral.

### 3. Drawer de detalhe do dia
Ao clicar em qualquer dia da grade, abrir o `DayDetailDrawer` existente mostrando todos os eventos daquele dia com detalhes. Isso melhora muito a usabilidade mobile onde os nomes dos eventos ficam truncados.

### 4. Limitar "Proximos Eventos" a 5 itens
Mostrar no maximo 5 eventos proximos no sidebar/lista, com um botao "Ver todos" que pode expandir ou navegar.

### 5. Adicionar lista de programacoes mensais
Abaixo da grade, incluir a secao "Programacoes de [Mes]" agrupada por dia (igual ao calendario geral), mostrando titulo, horario, local, descricao e a sociedade vinculada com cor.

### 6. Seletor de visualizacao mobile
Adicionar o `CalendarViewSelector` (Semana/15 dias/Mes) para facilitar a navegacao no celular.

## Detalhes Tecnicos

### Arquivo a modificar:
- **`src/pages/PastorCalendario.tsx`**

### Componentes reutilizados (ja existem):
- `DayDetailDrawer` de `src/components/calendario/DayDetailDrawer.tsx`
- `CalendarViewSelector` de `src/components/calendario/CalendarViewSelector.tsx`

### Alteracoes especificas:

1. Adicionar `defaultOpen={false}` ou iniciar o `Collapsible` com estado `open={false}`
2. Adicionar legenda colorida usando `societies` ja carregadas (mapear `societies` para bolinhas + nome)
3. Importar e integrar `DayDetailDrawer` com estado `selectedDay` e `dayDrawerOpen`
4. Adicionar logica de `viewMode` e `CalendarViewSelector` com calculo de dias visiveis (copiar padrao do `Calendario.tsx`)
5. Adicionar `eventsByDay` agrupado + secao "Programacoes de [Mes]" abaixo da grade
6. Limitar `filteredUpcoming.slice(0, 5)` e adicionar botao expandir

### Sem alteracoes no banco de dados.

