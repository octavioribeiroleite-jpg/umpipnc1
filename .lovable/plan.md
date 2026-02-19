
# Melhoria do Calendario Mobile

## Problema

No celular, o calendario mostra o mes inteiro em grade 7x5, com celulas muito pequenas onde os nomes dos eventos ficam truncados (ex: "P...", "A...", "D..."). Nao ha como ver os detalhes de um dia sem clicar diretamente no evento.

## Solucao

Criar 3 modos de visualizacao para mobile (Semana, 15 dias, Mes) e adicionar um popup ao clicar em qualquer dia para ver todos os eventos daquele dia.

### 1. Seletor de visualizacao (mobile only)

Adicionar tabs/botoes acima do calendario no mobile com 3 opcoes:
- **Semana**: mostra apenas 7 dias (semana atual ou semana contendo o dia selecionado)
- **15 dias**: mostra 15 dias a partir do inicio da quinzena atual
- **Mes**: visualizacao completa do mes (atual, mas com celulas mais compactas)

No desktop, manter a visualizacao mensal como esta.

### 2. Popup de detalhes do dia

Ao clicar em qualquer celula de dia (nao apenas no evento), abrir um Drawer (bottom sheet no mobile) mostrando:
- Data completa no titulo (ex: "Quarta, 19 de Fevereiro")
- Lista de todos os eventos do dia com EventCard detalhado
- Botao "Novo Evento" se o usuario for gestao (pre-preenchendo a data)

### 3. Melhorias visuais mobile

- Celulas mais compactas com indicadores de cor (bolinhas) em vez de texto truncado
- Numero do dia mais destacado
- Ocultar o card "Proximos Eventos" no mobile (fica acessivel via drawer do dia)

## Secao Tecnica

### Novo componente: `src/components/calendario/DayDetailDrawer.tsx`

- Usa `ResponsiveDialog` (drawer no mobile, dialog no desktop)
- Recebe: `date`, `events`, `open`, `onOpenChange`, `onEventClick`, `onNewEvent`
- Mostra lista de EventCards completos para o dia selecionado

### Novo componente: `src/components/calendario/CalendarViewSelector.tsx`

- Tabs com opcoes: "Semana", "15 dias", "Mes"
- Controla o estado `viewMode` passado pelo pai
- Visivel apenas no mobile

### Modificacoes em `src/pages/Calendario.tsx`

- Adicionar estados: `viewMode` ('week' | 'fortnight' | 'month'), `selectedDay` (number | null), `dayDrawerOpen` (boolean)
- Usar `useIsMobile()` para condicionar visualizacao
- Logica de filtragem de dias conforme viewMode:
  - `week`: calcular inicio/fim da semana atual e renderizar apenas esses 7 dias
  - `fortnight`: calcular quinzena (1-15 ou 16-fim) e renderizar
  - `month`: manter comportamento atual
- Ao clicar na celula do dia: setar `selectedDay` e abrir `DayDetailDrawer`
- No mobile, mostrar bolinhas coloridas em vez de EventCard compact (max 3 bolinhas + "+N")
- Ocultar card "Proximos Eventos" no mobile via `hidden md:block`

### Resumo de mudancas nos arquivos

| Arquivo | Acao |
|---|---|
| `src/components/calendario/DayDetailDrawer.tsx` | Criar novo |
| `src/components/calendario/CalendarViewSelector.tsx` | Criar novo |
| `src/pages/Calendario.tsx` | Modificar - adicionar viewMode, dayDrawer, bolinhas mobile |
