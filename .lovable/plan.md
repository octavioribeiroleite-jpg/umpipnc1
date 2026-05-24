## O que muda

### 1. Revisar turmas antes de fechar o dia
Hoje, depois de "Finalizar Chamada" de uma turma, ao tocar no card ela abre só em modo leitura. Vamos permitir abrir qualquer turma (iniciada, em andamento ou finalizada) e revisar/editar livremente enquanto o **dia** não estiver fechado.

- Card da turma na grade continua clicável em qualquer status.
- Na tela de detalhe da turma:
  - Se status = `finalizada` e o dia ainda está aberto → mostrar botão "Revisar / Editar" que volta para `aberta` (sem perder dados).
  - Adicionar contador "X de Y turmas finalizadas" no topo da grade para o admin saber quando pode fechar o dia.
  - Botão "Fechar Dia" continua só para Admin/Secretaria, agora com aviso se ainda houver turmas não finalizadas.

### 2. Visitantes com nome (opcional)
Em vez de apenas um contador, cada visitante pode ter um nome. O contador continua existindo (= quantidade de nomes + visitantes anônimos).

UI no detalhe da turma (substitui o stepper atual):
- Lista compacta de visitantes adicionados, cada um com nome (ou "Visitante" se vazio) e botão de remover.
- Botão "+ Adicionar visitante" abre input inline para digitar o nome (Enter confirma; campo vazio = anônimo).
- Total da turma e total do dia continuam somando todos.

No fechamento do dia e no histórico, o resumo passa a listar os nomes dos visitantes por turma (quando houver), além da contagem.

## Detalhes técnicos

**Banco** (migration nova):
- Trocar `ebd_class_visitors` (count agregado) por `ebd_class_visitor_entries`:
  - `id`, `class_id`, `date`, `name text` (nullable = anônimo), `created_at`, `marked_by`.
- Migrar dados existentes: para cada linha com `visitor_count = N`, criar N entradas anônimas.
- Manter as policies abertas equivalentes às atuais (`anon` insert/update/delete/select).

**Frontend**:
- `src/pages/Secretaria.tsx`:
  - `classVisitors` passa a ser `Record<string, { id: string; name: string | null }[]>`.
  - `handleUpdateClassVisitor` vira `addClassVisitor(classId, name)` e `removeClassVisitor(entryId)`.
  - `handleCloseDay` grava no `class_summary` os nomes (`visitors: [{name}]`) além do total.
- `src/components/secretaria/ChamadaTab.tsx`:
  - Substituir o bloco do stepper por lista + input "Adicionar visitante".
  - Permitir reabrir uma turma `finalizada` enquanto o dia estiver aberto (botão "Revisar / Editar").
  - Header da grade: mostrar "X/Y turmas finalizadas".
  - Diálogo de "Fechar Dia": se houver turmas não finalizadas, exibir aviso ("Ainda há turmas em andamento. Fechar mesmo assim?").
- `src/components/secretaria/HistoricoTab.tsx`:
  - Mostrar nomes dos visitantes (quando houver) no breakdown por turma, mantendo a contagem.

Sem mudanças em PDF/relatórios nesta etapa (podem ser feitas depois se necessário).
