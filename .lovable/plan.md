
Objetivo: corrigir o erro “UPDATE requires a WHERE clause” ao confirmar gasto no login Daniel Moreira.

1) Ajustar função de invalidação no backend (migração SQL)
- Arquivo novo em `supabase/migrations/` com `CREATE OR REPLACE FUNCTION public.invalidate_pastor_cache()`.
- Trocar:
  - `UPDATE public.pastor_summaries SET invalidated = true;`
- Por:
  - `UPDATE public.pastor_summaries SET invalidated = true WHERE invalidated = false;`
- Manter `RETURN COALESCE(NEW, OLD);`.

2) Validar que os triggers existentes continuam apontando para essa função
- Confirmar triggers em `transactions` (e demais tabelas) sem recriar estrutura.

3) Melhoria de resiliência no fluxo de gasto (frontend)
- Em `src/components/financas/GastosTab.tsx`, no `handleWizardSubmit`, guardar o caminho do arquivo enviado.
- Se o `insert` da transação falhar após upload, remover o arquivo recém-enviado no `catch` para evitar comprovantes órfãos.

4) Verificação funcional
- Testar ponta a ponta com o usuário Daniel:
  - Finanças → Gastos → Novo gasto (com comprovante) → Confirmar.
  - Confirmar: sem toast de erro, registro criado em histórico, comprovante abrindo corretamente.
- Repetir sem comprovante (se permitido no fluxo atual) para garantir que não houve regressão.

Detalhes técnicos
- Causa raiz confirmada: trigger `invalidate_cache_transactions` chama `invalidate_pastor_cache`, e essa função faz `UPDATE` sem `WHERE`.
- Como o ambiente aplica proteção de safe-update, qualquer mutação em `transactions` dispara esse erro mesmo com o `insert` do gasto correto no frontend.
