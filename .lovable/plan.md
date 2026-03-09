

# Plano: Funcionalidade Completa de Aniversariantes

## 1. Banco de Dados (Migrations)

### Tabela `aniversariantes`
```sql
CREATE TABLE public.aniversariantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia integer NOT NULL,
  mes integer NOT NULL,
  departamento text DEFAULT 'IPNC',
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  pendente_revisao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aniversariantes ENABLE ROW LEVEL SECURITY;
-- Politicas: leitura para anon/authenticated, gestao para management
```

### Tabela `notificacoes_aniversarios`
```sql
CREATE TABLE public.notificacoes_aniversarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL, -- 'semanal' ou 'diario'
  referencia_data date NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes_aniversarios ENABLE ROW LEVEL SECURITY;
```

### Seed dos dados
Usar a ferramenta de insert para inserir os ~140 registros fornecidos, com `pendente_revisao = true` nos 6 registros indicados.

## 2. Edge Function: `generate-birthday-reminders`

- Executada via pg_cron (segunda-feira + diariamente as 08:00 BRT)
- Consulta aniversariantes do dia e da semana
- Insere notificacoes na tabela `notificacoes_aniversarios`
- Evita duplicatas verificando `referencia_data` + `tipo`

## 3. Paginas e Componentes

### Nova rota: `/aniversariantes`
Arquivo: `src/pages/Aniversariantes.tsx`

### Componentes em `src/components/aniversariantes/`:
- **`NextBirthdayCard.tsx`** -- Card topo com proximo aniversariante, DD/MM, "faltam X dias"
- **`TodayBirthdays.tsx`** -- Lista de aniversariantes de hoje com botao "Copiar mensagem"
- **`WeekBirthdays.tsx`** -- Proximos 7 dias, formato DD/MM -- Nome
- **`MonthBirthdays.tsx`** -- Aniversariantes do mes atual
- **`YearCalendar.tsx`** -- Calendario anual agrupado por mes (jan-dez)
- **`BirthdayNotifications.tsx`** -- Lista de notificacoes com marcar como lido
- **`BirthdayFilters.tsx`** -- Campo de busca + filtro departamento
- **`BirthdayFormDialog.tsx`** -- Dialog CRUD (criar/editar) com validacao de dia/mes
- **`BirthdayCard.tsx`** -- Card individual reutilizavel com badge "Revisar cadastro"

### Alteracoes existentes:
- **`src/pages/Index.tsx`** -- Adicionar card "Aniversarios da semana" com ate 5 nomes e botao "Ver todos"
- **`src/App.tsx`** -- Adicionar rota `/aniversariantes`
- **`src/components/layout/MobileBottomNav.tsx`** -- Adicionar item "Aniversariantes" no menu "Mais"
- **`src/components/layout/AppSidebar.tsx`** -- Adicionar item no sidebar desktop
- **`src/components/layout/MobileHeader.tsx`** -- Adicionar item na navegacao mobile

## 4. Regras de Negocio

- Aniversario e recorrente (somente dia/mes, sem ano)
- Ordenacao sempre por mes/dia
- "Proximo aniversariante" calcula dias ate o proximo DD/MM a partir de hoje (considerando virada de ano)
- Fuso America/Sao_Paulo para calculo de "hoje"
- Busca por nome filtra em tempo real (client-side)
- Filtro por departamento aplica em todas as secoes
- Registros com `pendente_revisao = true` exibem badge laranja "Revisar cadastro"
- Validacao: dia valido para o mes (1-28/29/30/31)
- Nomes duplicados com datas diferentes: mantidos, ambos marcados para revisao
- Copiar mensagem: "Hoje celebramos o aniversario de [nome]. Que Deus abencoe sua vida com graca, saude e paz."

## 5. Logica dos Lembretes

- Edge function `generate-birthday-reminders` invocada via pg_cron
- Cron diario as 08:00 BRT: gera lembrete tipo "diario" se houver aniversariante no dia
- Cron semanal (segunda 08:00 BRT): gera lembrete tipo "semanal" com lista dos proximos 7 dias
- Notificacoes salvas em `notificacoes_aniversarios`
- Badge de nao-lidas exibido no card da Home e na pagina de aniversariantes

## 6. Estrategia de Importacao

- INSERT direto via ferramenta de dados com os 140+ registros fornecidos
- Os 6 registros de Izabel, Gabriel e Sandra marcados com `pendente_revisao = true`

## 7. Estilo

- Usa componentes existentes: AppLayout, AppCard, PageHeader, Badge, Dialog, Input, Button, Tabs
- Icones: Cake, Calendar, Gift, Search, Copy (lucide-react)
- Cards arredondados, fundo claro, hierarquia clara
- Responsivo mobile-first
- Destaques discretos: verde para hoje, azul para semana, laranja para revisao

## 8. Arquivos Criados/Alterados

**Criados:**
- `src/pages/Aniversariantes.tsx`
- `src/components/aniversariantes/NextBirthdayCard.tsx`
- `src/components/aniversariantes/TodayBirthdays.tsx`
- `src/components/aniversariantes/WeekBirthdays.tsx`
- `src/components/aniversariantes/MonthBirthdays.tsx`
- `src/components/aniversariantes/YearCalendar.tsx`
- `src/components/aniversariantes/BirthdayNotifications.tsx`
- `src/components/aniversariantes/BirthdayFilters.tsx`
- `src/components/aniversariantes/BirthdayFormDialog.tsx`
- `src/components/aniversariantes/BirthdayCard.tsx`
- `src/hooks/useBirthdays.ts`
- `src/hooks/useBirthdayNotifications.ts`
- `supabase/functions/generate-birthday-reminders/index.ts`
- 1 migration SQL (tabelas + RLS)

**Alterados:**
- `src/App.tsx` (nova rota)
- `src/pages/Index.tsx` (card aniversarios da semana)
- `src/components/layout/MobileBottomNav.tsx` (menu item)
- `src/components/layout/AppSidebar.tsx` (menu item)
- `src/components/layout/MobileHeader.tsx` (menu item)
- `supabase/config.toml` (edge function config)

