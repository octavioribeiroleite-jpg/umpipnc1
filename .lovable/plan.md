

# Fechamento de Dia e Historico com Cards de Resumo

## Objetivo
Permitir que o administrador "feche o dia" da chamada EBD, persistindo o resumo no banco. A aba Historico passa a exibir cards por domingo fechado com as informacoes principais.

## Mudancas

### 1. Nova tabela `ebd_day_closures`
```sql
CREATE TABLE ebd_day_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  closed_by text NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  total_students int NOT NULL DEFAULT 0,
  present_students int NOT NULL DEFAULT 0,
  class_summary jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ebd_day_closures ENABLE ROW LEVEL SECURITY;
-- Mesmas politicas das outras tabelas EBD (anon pode ler, management gerencia)
```
`class_summary` guarda array JSON: `[{ classId, className, total, present, percentage }]`

### 2. `src/components/secretaria/ChamadaTab.tsx`
- Receber nova prop `onCloseDay: () => Promise<void>` e `dayIsClosed: boolean`
- Quando `dayIsClosed`, mostrar badge "Dia Fechado" no resumo e desabilitar edicoes
- Botao "Fechar Dia" (admin only) no card de resumo geral — abre confirmacao, chama `onCloseDay`
- Botao "Reabrir Dia" (admin only) se ja fechado

### 3. `src/pages/Secretaria.tsx`
- Fetch `ebd_day_closures` para o dia atual junto com os outros dados
- Implementar `handleCloseDay`: calcula stats por turma, insere em `ebd_day_closures`
- Implementar `handleReopenDay`: deleta registro de `ebd_day_closures`
- Passar `dayIsClosed` e `onCloseDay` / `onReopenDay` para ChamadaTab

### 4. `src/components/secretaria/HistoricoTab.tsx` — Cards de resumo por dia
- Fetch de `ebd_day_closures` ordenado por data desc
- Substituir a tabela simples por cards visuais para cada domingo fechado:
  - Data formatada (titulo)
  - Presentes/Total + percentual (destaque)
  - Mini lista das turmas com % (do class_summary)
  - Badge de status (Fechado)
  - Botao para baixar PDF daquele dia
- Manter graficos e metricas existentes abaixo dos cards

### 5. RLS da nova tabela
- SELECT: anyone (true) — mesmo padrao das outras tabelas EBD
- INSERT/UPDATE/DELETE: anon + authenticated (mesmo padrao permissivo das tabelas ebd_*)

## O que NAO muda
- Nenhuma logica de auth, login por PIN, ou fluxo de professor
- Tabelas existentes (ebd_attendance, ebd_classes, ebd_students) intactas
- PDF existente continua funcionando

