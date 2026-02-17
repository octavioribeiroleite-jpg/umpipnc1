
# Plano: Dashboard Inteligente com Dados Diretos e IA sob Demanda

## Problema Atual

Hoje, ao abrir o painel do pastor, o sistema chama a edge function `summarize-for-pastor` que:
1. Busca todos os dados do banco
2. Chama a IA para gerar resumos
3. Salva no cache

Isso significa que o carregamento e lento (espera a IA) e gasta creditos de IA desnecessariamente. Os numeros (saldo, membros, tarefas) nao precisam de IA - sao dados crus do banco.

## Nova Arquitetura

Separar em duas camadas:

### Camada 1: Dados diretos (sempre rapidos, sem IA)

O frontend busca os dados consolidados **diretamente do banco** via queries Supabase, sem passar pela edge function:

- Stats por sociedade (membros, tarefas, saldo)
- Stats globais (soma de todos)
- Alertas (tarefas atrasadas, reunioes sem ata, eventos proximos)
- Proximos eventos

Isso carrega **instantaneamente** ao abrir a pagina.

### Camada 2: Resumo da IA (sob demanda, com cache inteligente)

A IA so e chamada quando:
- Nao existe cache valido
- O pastor clica em "Atualizar Resumo" manualmente
- Dados mudaram desde o ultimo resumo (comparacao por hash/timestamp)

O resumo da IA fica em um card separado que pode carregar independentemente.

---

## Mudancas Especificas

### 1. PainelPastor.tsx - Buscar dados direto do banco

Remover a dependencia total da edge function para carregar a pagina. Em vez disso:

- Buscar sociedades + stats de cada uma diretamente via queries paralelas
- Calcular totais globais no frontend (soma dos stats por sociedade)
- Mostrar tudo imediatamente
- Buscar resumo IA separadamente (do cache ou gerar)

Nova ordem de carregamento:
1. Sociedades + stats diretos do banco (rapido)
2. Alertas diretos do banco (rapido)  
3. Resumo IA do cache (rapido se existir)
4. Se nao tiver cache: mostrar botao "Gerar Resumo com IA"

### 2. Edge Function - Separar dados de IA

A edge function passa a ter dois modos:

**Modo `stats_only` (novo, padrao)**: Retorna apenas dados crus agregados, sem chamar IA. Rapido e barato.

**Modo `with_ai` (so quando solicitado)**: Busca dados + gera resumo IA. So e chamado quando:
- Pastor clica "Gerar/Atualizar Resumo"
- Nao existe cache valido

Adicionar campo `data_hash` no cache para detectar se os dados mudaram. Se o hash dos dados atuais for igual ao do cache, retorna o resumo existente sem chamar a IA novamente.

### 3. AlertsSection.tsx - Incluir nome da sociedade

Atualizar as queries para incluir `society_id` e fazer join com `societies` para mostrar qual sociedade cada alerta pertence (ex: "Tarefa atrasada - UMP").

### 4. SocietyOverviewCard.tsx - Receber stats via props

Em vez de cada card fazer suas proprias queries (5 cards = 20 queries), o `PainelPastor` busca todos os dados uma vez e passa via props para os cards. Menos queries, mais rapido.

### 5. Novo layout da pagina

```text
+----------------------------------------------+
|  [Sparkles] Resumo Pastoral (IA)             |
|  "A UMP esta ativa com 9 tarefas..."         |
|  Atualizado em 17/02  [Atualizar Resumo]     |
+----------------------------------------------+
|  [!] Alertas (3 urgentes)                    |
|  - Tarefa atrasada (UMP) - venceu 15/02      |
|  - Reuniao sem ata (SAF) - 10/02             |
+----------------------------------------------+
|  Resumo Financeiro Consolidado               |
|  Saldo: R$ X | Entradas: R$ X | Saidas: R$ X |
+----------------------------------------------+
|  SOCIEDADES                                  |
|  [UMP] 18 membros | R$ 0 | 9/12 tarefas      |
|  [SAF]  0 membros | R$ 0 | 0/0 tarefas       |
|  ...                                         |
+----------------------------------------------+
|  Proximos Eventos                            |
|  - Culto Jovem (20/02)                       |
|  - Reuniao SAF (22/02)                       |
+----------------------------------------------+
```

---

## Detalhes Tecnicos

### PainelPastor.tsx

- Novo state: `statsLoaded` (dados diretos) separado de `aiLoaded` (resumo IA)
- Carregar stats direto: queries paralelas para members, tasks, transactions por society_id
- Carregar resumo IA: verificar cache primeiro, so chamar edge function se necessario
- Botao "Atualizar Resumo" chama edge function com `{ force: true }`
- Secao de proximos eventos: query direta em `events` com `gte(start_date, now)`

### Edge Function `summarize-for-pastor`

- Adicionar parametro `mode`: `'stats_only'` ou `'with_ai'` (default: `'with_ai'`)
- Calcular `data_hash` (hash simples dos contadores: membros+tarefas+saldo) antes de chamar IA
- Se `data_hash` do cache == `data_hash` atual: retornar cache sem chamar IA
- Adicionar coluna `data_hash` na tabela `pastor_summaries`
- No modo global (sem society_id), agrupar dados por sociedade no contexto da IA

### AlertsSection.tsx

- Adicionar `society_id` nas queries de tasks e meetings
- Buscar sociedades para mapear society_id -> nome
- Mostrar "(UMP)", "(SAF)" etc. no detalhe de cada alerta

### SocietyOverviewCard.tsx

- Receber `stats` como prop em vez de buscar internamente
- Adicionar barra de progresso de tarefas (done/total)
- Adicionar data da ultima reuniao

### Migracao SQL

Adicionar coluna `data_hash` na tabela `pastor_summaries`:
```text
ALTER TABLE pastor_summaries ADD COLUMN data_hash text;
```

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Adicionar `data_hash` em `pastor_summaries` |
| `src/pages/PainelPastor.tsx` | Buscar dados direto do banco, IA separada, novo layout |
| `src/components/pastor/AlertsSection.tsx` | Mostrar nome da sociedade nos alertas |
| `src/components/pastor/SocietyOverviewCard.tsx` | Receber stats via props, adicionar progresso |
| `supabase/functions/summarize-for-pastor/index.ts` | Hash de dados, modo stats_only, dados por sociedade |

### Ordem de Execucao

1. Migracao SQL (data_hash)
2. Atualizar edge function (hash + modo stats_only + dados por sociedade no prompt)
3. Refatorar PainelPastor (dados diretos + IA separada + novo layout)
4. Melhorar AlertsSection (nome da sociedade)
5. Melhorar SocietyOverviewCard (props + progresso)
