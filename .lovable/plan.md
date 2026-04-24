## Diagnóstico

Existem 2 estudos no banco, mas a UMP só vê 1:

| Título | society_id | Visível p/ UMP? |
|---|---|---|
| 1 Timóteo 4:12 | UMP ✅ | Sim |
| 2 Timóteo, 3-14. | **NULL** ❌ | **Não** |

A RLS de `study_notes` é correta: exige `society_id = sociedade do usuário`. O problema é que o segundo estudo foi salvo com `society_id = NULL` — provavelmente porque o `profile.society_id` do criador estava `null` no momento (perfil ainda carregando ou usuário sem sociedade vinculada na hora).

Como o `handleCreate` em `src/pages/Estudos.tsx` simplesmente envia `society_id: profile.society_id`, sem validar nem ter fallback, o estudo nasceu órfão e ninguém consegue vê-lo (nem o autor).

## Correções

### 1. Recuperar o estudo órfão

Atribuir "2 Timóteo, 3-14." à UMP via `UPDATE` direto:

```sql
UPDATE public.study_notes
SET society_id = 'a8432474-7803-466f-9ceb-d49227fa555b' -- UMP
WHERE id = '0a6179d6-7d08-4446-abf6-169ae97e21f4';
```

### 2. Garantir que todo estudo novo seja salvo com a sociedade correta

Em `src/pages/Estudos.tsx` → função `handleCreate`:

- Determinar a sociedade efetiva com fallback robusto:
  1. `profile.society_id` (caso normal); se ausente,
  2. Buscar a sociedade do usuário pela tabela `members` (relacionando `members.user_id = auth.uid()`); se ainda ausente,
  3. Bloquear a criação com toast claro: "Não foi possível identificar sua sociedade. Atualize a página e tente novamente."
- Só inserir após resolver `society_id`.

Isso evita novos estudos órfãos mesmo se o `profile` estiver desatualizado por um instante.

### 3. Garantir visibilidade para todos os membros da UMP

A RLS atual já cobre isso: qualquer usuário com `profile.society_id = UMP` vê todos os estudos com `society_id = UMP`. Sem alteração de policy necessária — basta que o passo 2 garanta o `society_id` correto na gravação.

### 4. Verificação

- Recarregar `/estudos` logado como membro da UMP → devem aparecer **2** estudos.
- Criar um novo estudo de teste → deve aparecer imediatamente para outros membros da UMP.
- Tentar criar com sessão sem sociedade → toast de erro, sem inserção.

## Detalhes técnicos

- Arquivo: `src/pages/Estudos.tsx` (apenas `handleCreate`).
- Migração de dados: 1 `UPDATE` filtrado por id (sem risco de safe-update, pois usa `WHERE id = ...`).
- Sem mudanças em RLS, schema ou outras telas.