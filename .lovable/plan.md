

# Secretaria EBD — Reestruturação com Abas, Histórico e Gestao

## Estrutura

Refatorar `Secretaria.tsx` em 3 abas (usando o componente `Tabs` existente):

### Tab 1 — Chamada (melhorada)
- Cards de turma sem truncamento (1 coluna mobile, 2 colunas tablet+)
- Badge de "chamada completa" quando todos alunos foram marcados (presente ou ausente)
- Ranking visual: turmas ordenadas por % de presença
- Cores dinâmicas nos cards (verde >70%, amarelo 40-70%, vermelho <40%)

### Tab 2 — Historico
- Seletor de periodo: 4 semanas / 3 meses / todo periodo
- Grafico de linha (recharts) com evolucao da presenca geral por domingo
- Grafico de barras comparativo entre turmas (media de presenca)
- Tabela resumo por domingo: data, presentes/total, %
- Metricas-destaque: media ultimos 4 domingos, melhor/pior domingo, turma com maior/menor frequencia
- Lista de alunos 100% presenca (destaques) e 0% presenca (alerta)

### Tab 3 — Turmas (gestao)
- Lista de turmas com contagem ativos/inativos
- Ao clicar: duas secoes — Ativos e Inativos
- Acoes: adicionar aluno, desativar (move para inativos), reativar
- Transferir aluno entre turmas
- Criar nova turma, renomear turma

## Componentes

- `src/pages/Secretaria.tsx` — shell com Tabs, senha, estado compartilhado
- `src/components/secretaria/ChamadaTab.tsx` — chamada atual melhorada
- `src/components/secretaria/HistoricoTab.tsx` — graficos + metricas
- `src/components/secretaria/TurmasTab.tsx` — gestao de turmas e alunos

## Banco de dados

Nenhuma alteracao necessaria. Tabelas `ebd_classes`, `ebd_students` (campo `active` ja existe), `ebd_attendance` ja suportam tudo.

Para historico: query `ebd_attendance` sem filtro de data (ou com range), agrupada por `date`.

## Detalhes tecnicos

- Recharts ja instalado — usar `LineChart` e `BarChart`
- Alunos inativos: `ebd_students` com `active = false` (query separada na aba Turmas)
- INSERT/UPDATE de alunos via anon (RLS ja permite para `ebd_students` via management role) — como secretaria usa senha fixa sem login, as acoes de gestao precisam de politica anon para INSERT/UPDATE em `ebd_students` e `ebd_classes`, ou alternativamente restringir gestao apenas para usuarios logados

### Ajuste de RLS necessario
Adicionar politicas anon para INSERT/UPDATE em `ebd_students` e `ebd_classes` para que a gestao funcione via senha fixa (sem login). Alternativa: mostrar aba Turmas como somente-leitura para quem nao esta logado.

## Arquivos criados/modificados
- `src/components/secretaria/ChamadaTab.tsx` (novo)
- `src/components/secretaria/HistoricoTab.tsx` (novo)
- `src/components/secretaria/TurmasTab.tsx` (novo)
- `src/pages/Secretaria.tsx` (refatorado)
- Migracao SQL: adicionar politicas anon para INSERT/UPDATE em `ebd_students` e `ebd_classes`

