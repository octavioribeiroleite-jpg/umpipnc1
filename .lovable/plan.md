
# Plano: Isolamento de Dados por Sociedade

## Problema Atual

Nenhuma tabela de dados (reunioes, tarefas, membros, financas, arquivos, camisas) possui `society_id`. Isso significa que todas as sociedades veem os mesmos dados. Apenas a tabela `profiles` tem `society_id` hoje.

## O que precisa mudar

Adicionar `society_id` a todas as tabelas de dados e filtrar automaticamente com base na sociedade do usuario logado. O calendario (tabela `events`) permanece unificado.

---

## 1. Migracao do Banco de Dados

Adicionar coluna `society_id` (uuid, FK para `societies.id`) nas seguintes tabelas:

| Tabela | Descricao |
|--------|-----------|
| `meetings` | Reunioes |
| `tasks` | Tarefas |
| `members` | Membros financeiros |
| `transactions` | Transacoes financeiras |
| `charges` | Cobrancas |
| `files` | Arquivos |
| `financial_settings` | Config. financeiras |
| `financial_categories` | Categorias financeiras |
| `shirt_inventory` | Estoque de camisas |
| `shirt_purchases` | Compras de camisas |
| `shirt_sales` | Vendas de camisas |

**NAO** adicionar em:
- `events` (calendario unificado)
- `profiles` (ja tem)
- `user_roles` (global)
- `plenaries` / `plenary_attendance` (global)
- `pastor_summaries` / `pastor_feedback` (global pastor)

Tambem criar indices para performance em todas as colunas `society_id` adicionadas.

---

## 2. AuthContext - Fornecer society_id globalmente

O `AuthContext` ja armazena `society` e `profile.society_id`. Os hooks e paginas usarao esse valor para filtrar queries.

Para admin/pastor (sem society_id), ao acessar paginas de dados, verao dados de todas as sociedades (ou selecionam uma via `selectedSocietyId`).

---

## 3. Hooks - Filtrar por society_id

### useMeetings.ts
- Receber `societyId` do AuthContext
- Adicionar `.eq('society_id', societyId)` na query de meetings
- Admin/pastor: sem filtro (ve tudo)

### useTasks.ts
- Adicionar filtro `.eq('society_id', societyId)` na query principal
- Ao criar tarefa, salvar `society_id` do usuario

### useFiles.ts
- Adicionar filtro `.eq('society_id', societyId)` na query
- Ao fazer upload, salvar `society_id`

### useEvents.ts
- **NAO ALTERAR** - calendario e unificado

---

## 4. Paginas de Financas

### MembrosTab.tsx
- Filtrar `members` por `society_id`
- Ao criar membro, salvar `society_id` do usuario logado

### CobrancasTab.tsx
- Filtrar `members` e `charges` por `society_id`

### GastosTab.tsx / MensalidadesTab.tsx
- Filtrar `transactions` por `society_id`
- Ao criar transacao, salvar `society_id`

### CamisasTab.tsx
- Filtrar estoque, compras e vendas por `society_id`

### ConfiguracoesTab.tsx
- Filtrar `financial_settings` por `society_id`

### RelatoriosTab.tsx
- Filtrar dados por `society_id`

### Financas.tsx (stats)
- Filtrar `transactions` e `charges` por `society_id` nos cards de estatisticas

---

## 5. Paginas de Reunioes

### NovaReuniao.tsx
- Salvar `society_id` ao criar reuniao
- Filtrar participantes pela mesma sociedade

### ReuniaoDetalhe.tsx
- Os dados ja vem filtrados pela reuniao especifica (sem mudanca necessaria)

---

## 6. Pagina de Tarefas

### Tarefas.tsx
- Filtrar tarefas pelo `society_id` do usuario
- Ao criar tarefa, salvar `society_id`

---

## 7. Pagina de Arquivos

### Arquivos.tsx
- Filtrar arquivos pelo `society_id`
- Ao fazer upload, salvar `society_id`

---

## 8. Pagina Index (Dashboard)

- Filtrar dados do dashboard (reunioes recentes, tarefas pendentes, proximos eventos) pelo `society_id`
- Eventos permanecem sem filtro (unificados)

---

## Detalhes Tecnicos

### Migracao SQL

```text
ALTER TABLE meetings ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE tasks ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE members ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE transactions ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE charges ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE files ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE financial_settings ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE financial_categories ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE shirt_inventory ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE shirt_purchases ADD COLUMN society_id uuid REFERENCES societies(id);
ALTER TABLE shirt_sales ADD COLUMN society_id uuid REFERENCES societies(id);

+ Indices em cada coluna society_id
```

### Logica de Filtragem nos Hooks

Padrao a seguir em todos os hooks:

```text
const { profile, isAdmin, isPastor } = useAuth();
const societyId = profile?.society_id;

// Na query:
if (societyId && !isAdmin && !isPastor) {
  query = query.eq('society_id', societyId);
}
```

### Logica de Insercao

Ao criar qualquer registro, incluir `society_id`:

```text
society_id: profile?.society_id || null
```

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Adicionar `society_id` em 11 tabelas |
| `src/hooks/useMeetings.ts` | Filtrar e salvar por sociedade |
| `src/hooks/useTasks.ts` | Filtrar e salvar por sociedade |
| `src/hooks/useFiles.ts` | Filtrar e salvar por sociedade |
| `src/components/financas/MembrosTab.tsx` | Filtrar e salvar por sociedade |
| `src/components/financas/CobrancasTab.tsx` | Filtrar por sociedade |
| `src/components/financas/GastosTab.tsx` | Filtrar por sociedade |
| `src/components/financas/MensalidadesTab.tsx` | Filtrar por sociedade |
| `src/components/financas/CamisasTab.tsx` | Filtrar por sociedade |
| `src/components/financas/ConfiguracoesTab.tsx` | Filtrar por sociedade |
| `src/components/financas/RelatoriosTab.tsx` | Filtrar por sociedade |
| `src/pages/Financas.tsx` | Filtrar stats por sociedade |
| `src/pages/NovaReuniao.tsx` | Salvar society_id na reuniao |
| `src/pages/Tarefas.tsx` | Filtrar por sociedade |
| `src/pages/Arquivos.tsx` | Filtrar por sociedade |
| `src/pages/Index.tsx` | Filtrar dashboard por sociedade |

### Ordem de Execucao

1. Executar migracao SQL (adicionar society_id + indices em 11 tabelas)
2. Atualizar hooks (useMeetings, useTasks, useFiles)
3. Atualizar componentes de financas (6 tabs + stats)
4. Atualizar NovaReuniao (salvar society_id)
5. Atualizar paginas restantes (Tarefas, Arquivos, Index)
