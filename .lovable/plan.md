

# Reestruturação Painel do Pastor — Calendário + Cards Premium

## Resumo

Substituir a lista `EventCompletionList` por um calendário mensal interativo com lista de eventos do dia selecionado, usando cards redesenhados com visual premium. Mantém os dados reais do `CalendarEvent` (`start_date`, `color`, `status`, `society_id`, etc).

## Componentes a criar

### 1. `src/components/pastor/PastorCalendarWidget.tsx`
- Grid 7 colunas (Dom-Sáb) com navegação de mês e botão "Hoje"
- Cada dia: até 3 bolinhas coloridas (pela cor do evento / society), "+N" se >3
- Dia selecionado: `bg-primary text-primary-foreground rounded-full`
- Dia atual: `ring-2 ring-primary`
- Props: `events: CalendarEvent[]`, `selectedDate: Date`, `onDaySelect: (date: Date) => void`, `currentMonth/Year`, `onPrevMonth/onNextMonth/onToday`
- Comparação de dias usando `getFullYear/getMonth/getDate` local (sem UTC)

### 2. `src/components/pastor/PastorEventCard.tsx`
- Card branco sólido (`bg-card`), borda cinza leve (`border border-border/60`), sombra suave (`shadow-sm`)
- Barra lateral esquerda 3px com `event.color` (cor da society)
- Layout:
  - Título (max 2 linhas, `line-clamp-2 font-semibold text-sm`)
  - Data+hora (ícone Clock) + Local (ícone MapPin)
  - Badge de society (nome derivado de `colorToSociety` map) com fundo suave
  - Se aguardando conclusão: botão "Marcar concluído" + menu dropdown "..." com "Não realizado"
  - Se já resolvido: badge de status discreto
- Tipografia maior e mais contrastada que o card atual

### 3. `src/components/pastor/PastorDayEventList.tsx`
- Props: `selectedDate: Date`, `events: CalendarEvent[]`, `onUpdateStatus`, `isUpdating`
- Filtra eventos do dia selecionado usando comparação local (sem `toISOString`)
- Barra de filtros: Todas | Aguardando | Concluídas | Canceladas (com contadores)
- Ordena por `start_date`
- Estado vazio: mensagem discreta
- Renderiza `PastorEventCard`
- Mapeamento de filtros para os status reais: aguardando = `confirmado`/`pendente`, concluídas = `concluido`, canceladas = `cancelado`/`nao_realizado`

## Arquivo modificado

### 4. `src/pages/PainelPastor.tsx`
- Adicionar estado: `selectedDate` (default: hoje), `currentMonth`, `currentYear`
- Usar `useEvents()` (sem filtro de mês, para ter todos os eventos nos chips de resumo)
- **Seção 1**: Saudação + AI drawer (mantém)
- **Seção 2**: 3 chips de resumo — "Hoje: X eventos", "Esta semana: X", "Aguardando conclusão: X" — computados dos `allEvents`
- **Seção 3**: `PastorCalendarWidget` com os eventos do mês
- **Seção 4**: `PastorDayEventList` com filtros e ações de conclusão
- **Seção 5**: Society cards (mantém)
- **Seção 6**: Acesso Rápido — 4 colunas em vez de 5
- **Seção 7**: Alertas (mantém)
- Remover `EventCompletionList` e import de `useAllEvents` wrapper

## Mapeamento de dados

O tipo real `CalendarEvent` do projeto usa:
- `start_date` (não `startAt`)
- `color` (hex) — mapeado para nome da society via `colorToSociety`
- `status`: `'confirmado' | 'pendente' | 'cancelado' | 'concluido' | 'nao_realizado'`
- `location`, `all_day`, `society_id`

Os filtros mapeiam assim:
- "Aguardando" = status `confirmado` ou `pendente` em eventos passados
- "Concluídas" = status `concluido`
- "Canceladas" = status `cancelado` ou `nao_realizado`

