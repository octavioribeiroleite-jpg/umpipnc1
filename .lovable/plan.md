

# Dashboard "Agenda Primeiro" para Diretoria/Sociedades

## Objetivo
Transformar o Dashboard da Diretoria (Index.tsx) para seguir a mesma estética do Painel do Pastor: calendário mensal + lista de programações do dia selecionado. Remover stats financeiros, membros e resumo financeiro do Home (ficam no menu). Filtrar eventos pela society do usuário logado.

## Alterações

### 1. `src/hooks/useEvents.ts` — Adicionar filtro por `societyId`
- Aceitar param opcional `societyId?: string`
- Quando presente, adicionar `.eq('society_id', societyId)` nas queries de `eventsQuery` e `upcomingEventsQuery`
- Atualizar `queryKey` para incluir `societyId`

### 2. `src/pages/Index.tsx` — Reestruturação completa do layout
Substituir o dashboard atual (stats + finanças + membros + EventCompletionList) por layout "agenda primeiro":

**Remover:**
- Grid de 4 StatCards (saldo, contribuições, membros, tarefas)
- Cards Diretoria e Membros (+ dialogs)
- Resumo Financeiro card
- `EventCompletionList`
- Fetch de `stats`, `diretoria`, `membros`, `pendingSubmissions`
- Imports não utilizados (DollarSign, Users, Shield, UserCheck, TrendingUp, etc.)

**Adicionar (mesma estrutura do PainelPastor):**
- Estado: `selectedDate`, `currentMonth`, `currentYear`
- `useEvents()` com `societyId` filtrado (quando não admin/pastor)
- Chips de resumo (Hoje, Semana, Aguardando) — 3 AppCards compactos
- `PastorCalendarWidget` (reutilizado, funciona para qualquer role)
- `PastorDayEventList` (reutilizado, mesmo componente)
- Ações Rápidas reduzidas a 4 colunas: Reunião, Evento, Finanças, Tarefa
- Manter: `PastorNotificationBanner`, `PastorLoginNotification`, notificação de comprovantes pendentes

**Layout final (de cima para baixo):**
1. PageHeader simplificado (saudação + data)
2. Banner de comprovantes pendentes (se houver)
3. 3 chips: Hoje | Semana | Aguardando
4. Calendário mensal (PastorCalendarWidget)
5. Programações do dia (PastorDayEventList)
6. Acesso Rápido (4 botões)

### 3. Filtro por sociedade — Lógica
- `const societyId = profile?.society_id` (já existe na linha 122)
- Passar `societyId` ao `useEvents()` para que só retorne eventos da society logada
- Admin/Pastor: `societyId = undefined` → vê todos os eventos (mesmo comportamento atual)
- Diretoria UMP: `societyId = uuid-ump` → só vê eventos da UMP
- Não altera RLS nem banco — apenas filtro no frontend via query param

### 4. Componentes reutilizados (sem duplicar)
- `PastorCalendarWidget` e `PastorDayEventList` já são genéricos — recebem `events` e `selectedDate` como props
- No Index.tsx, passam os mesmos props com dados filtrados pela society
- `PastorEventCard` dentro do DayEventList mostra botões de ação apenas se `onUpdateStatus` é passado (já funciona assim)

### 5. Dialogs mantidos
- Os dialogs de Diretoria e Membros serão removidos do Home (ficam acessíveis via menu Membros/Configurações)

## Arquivos modificados
- `src/hooks/useEvents.ts` — adicionar param `societyId`
- `src/pages/Index.tsx` — reestruturação completa

## O que NÃO muda
- Nenhuma lógica de auth, RLS, banco, permissões
- Nenhum componente base (AppCard, AppButton, etc.)
- PainelPastor.tsx (permanece igual)
- Menu lateral e rotas (Finanças, Membros, Tarefas continuam no menu)

