

# Plano: Importar Cronograma Q1 2026 no Calendario

## O que sera feito

Criar uma edge function que insere todos os eventos do cronograma do 1o trimestre 2026 diretamente na tabela `events`, com cores e responsaveis mapeados corretamente. Alem disso, criar uma pagina de "Planejamento" acessivel a todas as sociedades com as diretrizes e o tema anual.

---

## Eventos a serem inseridos

Mapeamento de cores por responsavel (baseado nas sociedades cadastradas):

| Responsavel | Cor | Society ID |
|---|---|---|
| UMP | #3b82f6 (azul) | a8432474... |
| SAF | #ec4899 (rosa) | aebcf3b2... |
| UPH | #10b981 (verde) | 290efdc8... |
| UPA | #f97316 (laranja) | 801d599e... |
| UCP | #8b5cf6 (roxo) | 72d1a5fa... |
| IPNC / EBD / Conselho | #6b7280 (cinza) | sem society |

Total: ~40 eventos cobrindo Janeiro, Fevereiro e Marco de 2026.

---

## Abordagem

### 1. Edge Function `seed-calendar-events`

Criar uma edge function que:
- Recebe um array de eventos estruturados do cronograma
- Verifica se ja foram importados (evitar duplicatas via titulo + data)
- Insere na tabela `events` com campos corretos:
  - `title`: nome do evento
  - `start_date`: data e horario (usar 18:45 para momentos de oracao, 09:00 para eventos matutinos, dia inteiro para folgas/semanas)
  - `all_day`: true para eventos sem horario especifico
  - `color`: cor baseada no responsavel/sociedade
  - `status`: 'confirmado'
  - `origem`: 'manual'
  - `description`: incluir responsavel e contexto quando relevante
- Retorna resumo do que foi inserido

### 2. Pagina de Diretrizes/Planejamento

Adicionar uma secao no painel do pastor (ou como card informativo no calendario) com:
- Tema anual: "RENOVO" - Isaias 40.31
- Enfases trimestrais (meses 1-3: No silencio, No altar, Da historia)
- 6 diretrizes de planejamento do PDF

### 3. Chamar a edge function uma vez

Apos criar a edge function, chama-la para popular o calendario. Os eventos ficam permanentes no banco e visiveis para todas as sociedades no calendario unificado e no calendario do pastor (ja implementado com filtro por sociedade).

---

## Lista completa de eventos

### Janeiro 2026

| Data | Evento | Responsavel | Horario |
|---|---|---|---|
| 04/01 Dom | Ceia do Senhor na Sede | IPNC | Dia inteiro |
| 04/01 Dom | EBD Especial | EBD | 09:00 |
| 04/01 Dom | Plenaria UCP / Momento de Oracao | UCP | 18:45 |
| 05-09/01 | Semana de Intercessao | Sociedades | Dia inteiro (5 dias) |
| 09/01 Sex | Abertura da Congregacao | IPNC | 19:00 |
| 10/01 Sab | Folga Familia | IPNC | Dia inteiro |
| 11/01 Dom | Momento de Oracao | UPA | 18:45 |
| 18/01 Dom | Momento de Oracao UMP | UMP | 18:45 |
| 25/01 Dom | Momento de Oracao / Plenaria SAF | SAF | 18:45 |
| 25/01 Dom | Plenaria UPH | UPH | 18:45 |

### Fevereiro 2026

| Data | Evento | Responsavel | Horario |
|---|---|---|---|
| 01/02 Dom | Plenaria da UMP | UMP | 18:45 |
| 01/02 Dom | Plenaria da UPA | UPA | 18:45 |
| 06/02 Sex | Abertura UPA | UPA | 19:00 |
| 06/02 Sex | Departamental da SAF | SAF | 19:00 |
| 07/02 Sab | Abertura FEDUPA | UPA | 09:00 |
| 08/02 Dom | Momento de Oracao | UPH | 18:45 |
| 08/02 Dom | Dia do Homem Presbiteriano | SAF | Dia inteiro |
| 14/02 Sab | Culto de Acao de Gracas (Izabel) | IPNC | 19:00 |
| 15/02 Dom | Dia da Mulher Presbiteriana | UPH | Dia inteiro |
| 15/02 Dom | Ceia do Senhor na Sede | IPNC | Dia inteiro |
| 21/02 Sab | Reuniao Ordinaria do PRCC (19-21h) | Conselho | 19:00 |
| 21/02 Sab | Abertura das Programacoes UMP | UMP | 09:00 |
| 21/02 Sab | Abertura das Programacoes UCP | UCP | 09:00 |
| 22/02 Dom | Ceia do Senhor na Congregacao | IPNC | Dia inteiro |
| 24/02 Ter | Retorno do PG | IPNC | 19:00 |
| 27/02 Sex | Estudo UMP | UMP | 19:00 |
| 28/02 Sab | Abertura das Programacoes UPH | UPH | 09:00 |

### Marco 2026

| Data | Evento | Responsavel | Horario |
|---|---|---|---|
| 01/03 Dom | Almoco | IPNC | 12:00 |
| 01/03 Dom | Ceia do Senhor na Sede | IPNC | Dia inteiro |
| 07/03 Sab | Dia Internacional da Mulher | SAF | Dia inteiro |
| 07/03 Sab | Aniversario da Igreja | IPNC | 09:00 |
| 08/03 Dom | Aniversario da Igreja | IPNC | 09:00 |
| 14/03 Sab | Folga Familia | IPNC | Dia inteiro |
| 20/03 Sex | Estudo da UMP | UMP | 19:00 |
| 21/03 Sab | Aniversario da UPA | UPA | 09:00 |
| 22/03 Dom | Almoco da Congregacao | IPNC | 12:00 |
| 28/03 Sab | Aniversario da Congregacao | IPNC | 09:00 |
| 29/03 Dom | Ceia do Senhor EBD Congregacao | IPNC | 09:00 |
| 29/03 Dom | Aniversario da Congregacao | IPNC | 09:00 |

---

## Detalhes Tecnicos

### Edge Function `seed-calendar-events`

- Recebe `{ action: 'seed_q1_2026' }` no body
- Contem array hardcoded com todos os eventos acima
- Faz `upsert` ou verifica duplicatas antes de inserir
- Usa `service_role` key para inserir (bypass RLS)
- Retorna `{ inserted: N, skipped: N }`

### Diretrizes no App

Adicionar card informativo no `PainelPastor.tsx` ou criar secao em `PastorCalendario.tsx` com:
- Tema anual e texto basico
- Enfase do trimestre atual
- Link para PDF original (armazenar no storage)

### Arquivos

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/seed-calendar-events/index.ts` | Nova edge function com dados do cronograma |
| `src/pages/PastorCalendario.tsx` | Adicionar card de tema/diretrizes acima do calendario |

### Ordem de Execucao

1. Criar edge function `seed-calendar-events` com todos os eventos mapeados
2. Executar a edge function para popular o banco
3. Adicionar card de tema anual e diretrizes no calendario do pastor
4. Verificar visualizacao no calendario unificado

