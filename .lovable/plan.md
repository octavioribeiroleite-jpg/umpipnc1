

# Design System Global — Plano de Implementacao

## Objetivo
Padronizar o visual de todas as telas usando o estilo "premium" do Painel do Pastor. Apenas mudancas esteticas (UI). Zero alteracao em logica, dados, permissoes ou funcionalidades.

## Componentes Base a Criar

### 1. `src/components/ui/app-card.tsx`
Card padrao reutilizavel com visual premium consistente.
- **Estilos fixos**: `rounded-[18px] bg-white/90 dark:bg-card/95 border border-white/20 dark:border-border/40 shadow-sm backdrop-blur-sm`
- **Props**: `children`, `className`, `onClick`, `noPadding` (sem p-4), `colorStripe` (barra lateral 3px opcional)
- **Variantes**: `default` (p-4), `stat` (p-3, compacto), `interactive` (cursor-pointer + hover:shadow-md)

### 2. `src/components/ui/app-button.tsx`
Wrapper fino sobre o `<Button>` existente com presets visuais.
- `primary`: rounded-xl, h-11, font-semibold
- `secondary`: bg-white/80, border, rounded-xl
- `ghost-action`: para acoes dentro de cards (text-xs, sem borda)

### 3. `src/components/ui/typography.tsx`
Componentes simples para tipografia consistente.
- `<Title>`: text-xl md:text-2xl font-bold font-display
- `<Subtitle>`: text-sm text-muted-foreground
- `<SectionTitle>`: text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3

## Layout

### 4. `src/components/layout/AppLayout.tsx`
- Mobile padding: `px-3` -> `px-4` (uniformizar com PastorLayout)
- Sem outras mudancas estruturais (bg-background/60 backdrop-blur-sm ja esta correto)

## Refatoracao das Telas (somente classes CSS)

### 5. `src/pages/Index.tsx` (Dashboard Diretoria)
- `StatCard`: trocar `<Card>` por `<AppCard variant="stat">`
- Cards Diretoria/Membros: trocar `<Card>` por `<AppCard variant="interactive">`
- QuickActions: trocar `<Button variant="outline">` por `<AppCard variant="interactive">` com layout flex-col
- Resumo Financeiro: trocar `<Card>` por `<AppCard>`
- Dialogs: manter como estao (sao modais, nao cards)

### 6. `src/pages/PainelPastor.tsx`
- Summary chips: trocar classes inline por `<AppCard variant="stat">`
- Quick Access buttons: trocar classes inline por `<AppCard variant="interactive">`
- Error card: usar `<AppCard>`

### 7. `src/components/pastor/PastorCalendarWidget.tsx`
- Trocar `bg-card rounded-2xl border border-border/60 shadow-sm` por `<AppCard noPadding>` + padding interno

### 8. `src/components/pastor/PastorEventCard.tsx`
- Trocar `bg-card rounded-xl border border-border/60 shadow-sm` por `<AppCard noPadding colorStripe={eventColor}>`

### 9. `src/components/pastor/PastorDayEventList.tsx`
- Empty state: usar `<AppCard>`
- Filter buttons: manter estilo atual (ja estao bons)

### 10. `src/components/pastor/SocietyOverviewCard.tsx`
- Trocar `<Card className="bg-card/70 backdrop-blur-sm rounded-xl border-l-4">` por `<AppCard variant="interactive" colorStripe={society.color}>`

### 11. `src/pages/Financas.tsx`
- `StatCard`: trocar `<Card>` por `<AppCard variant="stat">`

### 12. `src/pages/Reunioes.tsx`, `Tarefas.tsx`, `Calendario.tsx`, etc.
- Onde usam `<Card>` diretamente para containers de conteudo, substituir por `<AppCard>`
- Manter componentes filhos internos intactos

## O que NAO muda
- Nenhuma logica, query, hook, calculo, permissao, rota ou comportamento
- Componentes base do shadcn (`card.tsx`, `button.tsx`) ficam intactos
- Os novos componentes sao wrappers independentes
- Auth, banco de dados, edge functions — tudo intocado

## Ordem de implementacao
1. Criar `app-card.tsx`, `app-button.tsx`, `typography.tsx`
2. Ajustar `AppLayout.tsx` (padding mobile)
3. Refatorar `Index.tsx` e `PainelPastor.tsx` (dashboards principais)
4. Refatorar componentes pastor (Calendar, EventCard, DayEventList, SocietyCard)
5. Refatorar `Financas.tsx`

