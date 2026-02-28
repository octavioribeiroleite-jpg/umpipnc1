

# Sistema de Secretaria — Escola Bíblica Dominical (EBD)

## Visão geral

Uma nova página `/secretaria` protegida por senha fixa (configurável na tabela `settings`). Ao acessar, exibe cards das turmas da EBD. Ao clicar numa turma, abre a lista de chamada do domingo atual. Um painel unificado mostra a porcentagem geral de presença do dia.

## Estrutura

### 1. Banco de dados — 3 novas tabelas

**`ebd_classes`** — Turmas da EBD
- `id` (uuid, PK), `name` (text), `order_index` (int), `active` (boolean, default true), `created_at`

**`ebd_students`** — Alunos por turma
- `id` (uuid, PK), `class_id` (uuid, FK ebd_classes), `name` (text), `active` (boolean, default true), `created_at`

**`ebd_attendance`** — Registro de presença
- `id` (uuid, PK), `student_id` (uuid, FK ebd_students), `class_id` (uuid, FK ebd_classes), `date` (date), `present` (boolean, default false), `marked_by` (uuid, nullable), `created_at`
- Unique constraint: `(student_id, date)` para evitar duplicatas

**RLS**: Acesso público para SELECT (a secretaria usa senha fixa, não login). INSERT/UPDATE restrito a autenticados ou via senha validada no app.

> Nota: Como o acesso é por senha fixa (sem login), as tabelas terão RLS com SELECT liberado para `anon` e INSERT/UPDATE também para `anon` — a proteção é feita pela senha no frontend. Alternativa mais segura: validar a senha via edge function.

### 2. Senha fixa
- Armazenada na tabela `settings` com key `secretaria_password` (ex: "1234")
- Configurável pelos admins na página de Configurações
- Validada no frontend ao entrar na página `/secretaria`

### 3. Nova página — `src/pages/Secretaria.tsx`

**Tela de senha**: Input simples com botão "Entrar"

**Tela principal (após senha)**:
- **Painel resumo do domingo**: card no topo mostrando data de hoje, total presentes / total alunos, porcentagem geral, barra de progresso
- **Grid de turmas**: cards com nome da turma, contador de presentes/total, porcentagem
- **Ao clicar numa turma**: lista de alunos com checkbox de presença, toggle rápido, auto-save

**Fluxo da chamada**:
1. Secretário acessa `/secretaria`, digita a senha
2. Vê as turmas do dia (domingo atual)
3. Clica numa turma, faz a chamada marcando presentes
4. O painel atualiza automaticamente os totais

### 4. Navegação
- Rota `/secretaria` no `App.tsx`
- Link no menu lateral e bottom nav com ícone `ClipboardList`
- Acessível a todos (a proteção é a senha)

### 5. Popular dados iniciais
- Após receber a lista de turmas e alunos do usuário, inserir via SQL no banco

### Arquivos criados/modificados
- Migração SQL (3 tabelas + RLS + setting da senha)
- `src/pages/Secretaria.tsx` (novo)
- `src/App.tsx` — nova rota
- `src/components/layout/AppSidebar.tsx` — menu item
- `src/components/layout/MobileHeader.tsx` — menu item
- `src/components/layout/MobileBottomNav.tsx` — menu item

