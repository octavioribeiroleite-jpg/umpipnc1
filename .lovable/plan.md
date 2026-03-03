

# Adicionar opção "Pastor" na grade de sociedades da Diretoria

## Problema
Na tela de Diretoria → "Selecione a sociedade", só aparecem SAF, UCP, UMP, UPA e UPH. Não há card para o Pastor, que também acessa via PIN.

## Solução
Adicionar um card "Pastor" na grade de seleção da Diretoria. O Pastor não é uma sociedade real, então será tratado como uma entrada virtual.

### Mudanças

**1. Banco de dados** — Criar setting `diretoria_pin_pastor` para que o edge function `validate-diretoria-pin` consiga validar o PIN do pastor (o admin configurará o valor).

```sql
INSERT INTO settings (key, value) VALUES ('diretoria_pin_pastor', '000000')
ON CONFLICT (key) DO NOTHING;
```

**2. `src/pages/Auth.tsx`**
- Na grade de sociedades da Diretoria, após os cards das sociedades reais, adicionar um card fixo "Pastor" com ícone de cruz/igreja e cor específica (ex: `#1e3a5f` azul escuro)
- Ao clicar, setar `selectedDiretoriaSociety` com um objeto virtual: `{ id: 'pastor', name: 'Pastor', slug: 'pastor', color: '#1e3a5f' }`
- O fluxo de PIN já funciona pois o edge function busca `diretoria_pin_pastor` na tabela settings
- Após validação, o `finishDiretoriaLogin` navegará para `/pastor` em vez de `/` quando o slug for `pastor`

**3. `supabase/functions/validate-diretoria-pin/index.ts`**
- O fluxo já busca `diretoria_pin_{slug}` — para `pastor` buscará `diretoria_pin_pastor`, que é o setting criado acima
- Precisa ajustar a criação da conta de serviço: quando `society_slug === 'pastor'`, não buscar society no banco — criar conta de serviço `diretoria-pastor@ipnc.local` sem `society_id`

| Arquivo | Ação |
|---|---|
| Migration SQL | Inserir `diretoria_pin_pastor` em settings |
| `src/pages/Auth.tsx` | Adicionar card "Pastor" na grade da Diretoria + navegar para `/pastor` |
| `supabase/functions/validate-diretoria-pin/index.ts` | Tratar caso `pastor` sem society obrigatória |

