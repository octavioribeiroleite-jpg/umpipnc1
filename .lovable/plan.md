

# Plano: Painel do Pastor Reorganizado com Navegacao Propria

## Visao Geral

Transformar o painel do pastor em um mini-app com menu lateral proprio e paginas dedicadas, permitindo ao pastor navegar por cada sociedade individualmente e ter uma visao organizada de toda a igreja.

---

## Estrutura do Novo Painel

```text
+-------------------+------------------------------------------+
|                   |                                          |
|  [Logo IPNC]     |   Conteudo da pagina selecionada         |
|  Pastor Ronne    |                                          |
|                   |                                          |
|  > Visao Geral   |   Dashboard com alertas e stats globais  |
|  > UMP           |   Dados especificos da UMP               |
|  > SAF           |   Dados especificos da SAF               |
|  > UPH           |   Dados especificos da UPH               |
|  > UPA           |   Dados especificos da UPA               |
|  > UCP           |   Dados especificos da UCP               |
|  > Calendario    |   Calendario unificado de todas           |
|  > Comunicados   |   Enviar avisos para sociedades           |
|  > Sugestoes     |   Ver respostas das diretorias            |
|                   |                                          |
|  [Sair]          |                                          |
+-------------------+------------------------------------------+
```

No celular: header com titulo + bottom nav com 5 itens (Geral, Sociedades, Calendario, Comunicados, Sugestoes), onde "Sociedades" abre submenu com as 5 sociedades.

---

## 1. Visao Geral (Dashboard)

Pagina principal com:
- Cards de estatisticas globais (saldo total, membros totais, tarefas)
- Resumo geral da IA (ja existe)
- **Nova secao: Alertas e Pendencias**
  - Tarefas atrasadas (vencidas e nao concluidas)
  - Reunioes sem ata
  - Eventos nos proximos 7 dias
  - Cada alerta com icone de urgencia (vermelho/amarelo)
- Cards resumo rapido de cada sociedade (nome, cor, saldo, tarefas pendentes)

---

## 2. Pagina por Sociedade (UMP, SAF, UPH, UPA, UCP)

Ao clicar em uma sociedade no menu, o pastor ve os dados filtrados daquela sociedade:
- Resumo da IA focado naquela sociedade (via edge function com filtro)
- Financas: saldo, entradas, saidas, mensalidades daquela sociedade
- Ultimas reunioes da sociedade
- Tarefas pendentes da sociedade
- Membros ativos da sociedade
- Formulario de sugestao direcionado a sociedade

---

## 3. Calendario Unificado

- Calendario mensal visual com eventos de todas as sociedades
- Eventos coloridos pela cor da sociedade (UMP=azul, SAF=rosa, UPH=verde, UPA=laranja, UCP=roxo)
- Lista dos proximos eventos abaixo do calendario

---

## 4. Comunicados

Canal de comunicacao do pastor para as sociedades:
- Formulario: titulo, mensagem, sociedades destinatarias (multi-select ou "Todas"), prioridade
- Historico de comunicados enviados
- Nova tabela `pastor_announcements` no banco
- Membros verao notificacao ao entrar no sistema

---

## 5. Sugestoes (ja existe, mover para dentro do layout)

Manter funcionalidade atual da pagina PastorSugestoes, mas renderizada dentro do PastorLayout.

---

## Detalhes Tecnicos

### Banco de Dados

Nova tabela `pastor_announcements`:
- `id` (uuid, PK)
- `title` (text, not null)
- `message` (text, not null)
- `priority` (text, default 'normal' - valores: 'normal', 'urgente')
- `target_societies` (uuid[] - array de society_ids, null = todas)
- `created_by` (uuid, FK auth.users)
- `created_at` (timestamptz, default now())
- `read_by` (jsonb, default '[]')

RLS: somente pastor/admin pode inserir e selecionar; membros autenticados podem selecionar (para ver notificacoes).

### Edge Function `summarize-for-pastor`

Atualizar para aceitar parametro `society_id`:
- Quando receber `society_id`, filtrar meetings, tasks, members, transactions por aquela sociedade
- Retornar resumo focado na sociedade especifica
- Cache separado por society_id na tabela `pastor_summaries`

### Novos Componentes

| Arquivo | Descricao |
|---------|-----------|
| `src/components/pastor/PastorLayout.tsx` | Layout com sidebar proprio do pastor |
| `src/components/pastor/PastorSidebar.tsx` | Menu lateral com items do pastor + sociedades |
| `src/components/pastor/PastorMobileNav.tsx` | Navegacao mobile para o pastor |
| `src/components/pastor/AlertsSection.tsx` | Secao de alertas e pendencias |
| `src/components/pastor/SocietyOverviewCard.tsx` | Card resumo de uma sociedade |

### Novas Paginas

| Rota | Arquivo | Descricao |
|------|---------|-----------|
| `/pastor` | `PainelPastor.tsx` (refatorar) | Dashboard com alertas |
| `/pastor/sociedade/:slug` | `PastorSociedade.tsx` (novo) | Dados de uma sociedade |
| `/pastor/calendario` | `PastorCalendario.tsx` (novo) | Calendario unificado |
| `/pastor/comunicados` | `PastorComunicados.tsx` (novo) | Criar/ver comunicados |
| `/pastor/sugestoes` | `PastorSugestoes.tsx` (mover) | Sugestoes dentro do layout |

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Tabela `pastor_announcements` + RLS |
| `src/App.tsx` | Novas rotas `/pastor/*` |
| `src/pages/PainelPastor.tsx` | Refatorar como dashboard com alertas |
| `supabase/functions/summarize-for-pastor/index.ts` | Filtro por `society_id` |

### Ordem de Execucao

1. Migracao SQL (tabela `pastor_announcements` + RLS)
2. Criar `PastorLayout`, `PastorSidebar`, `PastorMobileNav`
3. Refatorar `PainelPastor` como dashboard com alertas e cards por sociedade
4. Criar `PastorSociedade` (dados filtrados por sociedade)
5. Criar `PastorCalendario` (calendario unificado colorido)
6. Criar `PastorComunicados` (formulario + historico)
7. Mover `PastorSugestoes` para dentro do `PastorLayout`
8. Atualizar rotas no `App.tsx`
9. Atualizar edge function `summarize-for-pastor` com filtro por sociedade

