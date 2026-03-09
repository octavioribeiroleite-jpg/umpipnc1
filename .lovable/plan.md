

# Ajustes no Historico EBD

## Mudancas em `src/components/secretaria/HistoricoTab.tsx`

### 1. Filtrar apenas domingos
Na construcao de `dayRecords`, filtrar datas cujo `getDay() === 0` (domingo). Isso garante que dias de teste ou erros nao aparecem.

### 2. Porcentagem baseada no total de membros
Atualmente: `presentStudents / totalStudents` onde `totalStudents` = registros de attendance daquele dia.
Corrigir para: `presentStudents / students.length` (total de alunos cadastrados no sistema).
Isso aplica tanto na lista de cards quanto na view de detalhe e nos graficos/metricas.

### 3. Preencher espaco vazio com resumo informativo
Entre os cards de dias e os graficos, adicionar um card de "Resumo geral" com:
- Total de domingos registrados
- Total de alunos cadastrados
- Media geral de presenca (todos os domingos)
- Turma com melhor media
- Aluno(s) destaque (100% presenca) — se houver

Isso substitui/complementa os 4 cards de metricas atuais, ficando mais visual e preenchendo o espaco.

### Arquivo modificado
- `src/components/secretaria/HistoricoTab.tsx`

