

# Correcao do Calendario Mobile + Botoes de Tarefas

## Problema 1: Calendario Mobile
As melhorias mobile (bolinhas coloridas, seletor de visualizacao, nomes abreviados) nao aparecem porque usam `useIsMobile()` (JavaScript) que pode retornar `false` dependendo da largura do iframe. Solucao: usar classes CSS responsivas do Tailwind.

## Problema 2: Botoes de Tarefas
O erro "UPDATE requires a WHERE clause" persiste ao concluir, editar ou excluir tarefas, mesmo apos correcao do RLS. Solucao: criar funcoes RPC com SECURITY DEFINER que contornam o RLS e validam permissoes internamente.

---

## Secao Tecnica

### Parte 1: Calendario Mobile (`src/pages/Calendario.tsx`)

Substituir condicionais `isMobile` por classes CSS responsivas:

| Elemento | Antes (JS) | Depois (CSS) |
|---|---|---|
| Nomes dos dias | `isMobile ? day.charAt(0) : day` | Dois spans: `md:hidden` e `hidden md:inline` |
| Eventos na celula | `isMobile ? <dots> : <EventCards>` | Ambos renderizados com `md:hidden` / `hidden md:block` |
| Altura celulas | `isMobile ? '48px' : '80px'` | `min-h-[48px] md:min-h-[80px]` |
| Padding | `isMobile ? 'p-1' : 'p-2'` | `p-1 md:p-2` |

Manter `useIsMobile()` apenas para logica de calculo em `getVisibleDays`.

### Parte 2: Botoes de Tarefas

**Nova migracao SQL** - Criar 3 funcoes RPC com SECURITY DEFINER:

- `update_task_status(task_id uuid, new_status task_status)` - permite management OU assignee
- `update_task(task_id uuid, ...)` - permite management OU assignee
- `delete_task(task_id uuid)` - permite apenas management
- Incluir `NOTIFY pgrst, 'reload schema'` para forcar reload do cache

**Modificar `src/hooks/useTasks.ts`** - Trocar chamadas diretas por RPC:

- `useUpdateTaskStatus`: `supabase.rpc('update_task_status', { task_id, new_status })`
- `useUpdateTask`: `supabase.rpc('update_task', { task_id, ... })`
- `useDeleteTask`: `supabase.rpc('delete_task', { task_id })`

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Nova migracao SQL | Criar funcoes RPC + NOTIFY pgrst |
| `src/pages/Calendario.tsx` | Substituir condicionais JS por CSS responsivo |
| `src/hooks/useTasks.ts` | Alterar mutations para usar `.rpc()` |

