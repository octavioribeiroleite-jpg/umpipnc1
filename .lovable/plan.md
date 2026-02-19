

# Correcao dos Botoes de Tarefas e Edicao de Eventos

## Problema Raiz

As politicas de seguranca (RLS) nas tabelas `tasks` e `events` estao configuradas como **RESTRICTIVE** (restritivas). No PostgreSQL, isso causa dois problemas criticos:

1. **Politicas restritivas exigem que TODAS passem** - Na tabela `tasks`, a politica "Management can update" e "Assignees can update" sao ambas restritivas. Um usuario de gestao que nao e o responsavel falha na segunda, e um responsavel que nao e gestao falha na primeira. Resultado: ninguem consegue atualizar.

2. **Sem politica permissiva, ninguem tem acesso** - O PostgreSQL exige ao menos uma politica PERMISSIVE para conceder acesso. Se todas forem RESTRICTIVE, o acesso e negado por padrao.

Isso explica o erro "UPDATE requires a WHERE clause" nas tarefas e falhas ao salvar eventos.

## Solucao

Recriar as politicas das tabelas `tasks` e `events` como **PERMISSIVE** (padrao do PostgreSQL), onde basta **UMA** politica passar para conceder acesso.

## Secao Tecnica

### Migracao SQL

Uma unica migracao para corrigir ambas as tabelas:

**Tabela `tasks`** - Recriar as 6 politicas como PERMISSIVE:
- SELECT: "Tasks viewable by authenticated" (USING true)
- SELECT: "Management can view all tasks" (USING has_management_role)
- INSERT: "Management can create tasks" (WITH CHECK has_management_role)
- UPDATE: "Management can update all tasks" (USING/WITH CHECK has_management_role)
- UPDATE: "Assignees can update their tasks" (USING/WITH CHECK auth.uid() = assignee_id)
- DELETE: "Management can delete all tasks" (USING has_management_role)

**Tabela `events`** - Recriar as 2 politicas como PERMISSIVE:
- SELECT: "Events viewable by authenticated" (USING true)
- ALL: "Management can manage events" (USING has_management_role)

### Nenhuma alteracao de codigo necessaria

O codigo do frontend (TaskCard, EventDialog, useEvents, useTasks) esta correto. O problema e exclusivamente no banco de dados.
