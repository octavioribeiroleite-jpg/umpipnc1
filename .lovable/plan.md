

# Entrada de Membros por Nome (sem senha)

## Visao Geral
Substituir o login com usuario/senha dos membros por um fluxo simples: selecionar sociedade, depois escolher o nome da lista de membros cadastrados. Sem autenticacao por senha.

## Fluxo proposto

```text
┌─────────────────────┐
│   Tela inicial      │
│   [Membros]  ←click │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Selecione sociedade │
│ [UMP] [SAF] [UPH]  │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Buscar seu nome     │
│ [_______________]   │
│ ○ João Silva        │
│ ○ Maria Santos      │
│ ○ Pedro Oliveira    │
│                     │
│ [Entrar]            │
└─────────────────────┘
```

Ao selecionar, o sistema salva o membro no localStorage para o "Voce e Fulano?" na proxima vez (igual ao fluxo diretoria).

## Mudancas tecnicas

### 1. `src/contexts/MembroSessionContext.tsx` (novo)
- Criar contexto similar ao `DiretoriaSessionContext`
- Armazena: `memberId`, `memberName`, `societyId`, `societyName`, `societyColor`
- Usado pelo `MembroHome` e componentes filhos para identificar o membro logado

### 2. `src/pages/Auth.tsx`
- Adicionar novo step `'membro'` com sub-steps: `'societies'` → `'name-select'` (e `'name-confirm'` para retorno)
- No step `name-select`: buscar membros ativos da sociedade selecionada (`supabase.from('members').select('*').eq('society_id', id).eq('active', true)`)
- Input de busca com filtro local na lista de membros
- Ao confirmar: setar `MembroSession` e navegar para `/membro`
- Remover o formulario de login com usuario/senha para membros

### 3. Autenticacao backend para membros
- Membros precisam de alguma sessao Supabase para acessar dados via RLS (eventos, cobrancas, comunicados)
- Reaproveitar o mesmo mecanismo do PIN da diretoria: ao selecionar o nome, fazer sign-in com a conta de servico da sociedade (`diretoria-{slug}@ipnc.local`) automaticamente
- Ou criar uma edge function `member-login` que retorna um token de sessao anonimo/limitado
- A tabela `members` ja e acessivel por quem tem role `visualizador` ou `diretoria` na sociedade, entao o service account da sociedade ja tem acesso

### 4. `src/pages/MembroHome.tsx`
- Ajustar para aceitar sessao via `MembroSessionContext` em vez de exigir `useAuth().user`
- Os componentes filhos (`MembroInicio`, `MembroPagamentos`, etc.) usam o `memberId` do contexto para filtrar dados

### 5. RLS / Seguranca
- Como membros compartilham a conta de servico da sociedade, os dados sao isolados por `society_id` via RLS (ja funciona)
- O filtro por `member_id` especifico e feito no frontend via contexto
- A tabela `members` ja tem RLS de leitura publica (anon pode ler para a lista de selecao na tela de login)... na verdade precisa verificar. Se nao tiver, adicionar policy SELECT para anon filtrado por `active = true` apenas campos `id, name, society_id`

### 6. Sobre vincular depois no admin
- Nao e necessario vincular — o membro ja existe na tabela `members` com `society_id`
- O admin cadastra membros na aba Membros do Financas, e eles ja aparecem na lista de selecao automaticamente

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/contexts/MembroSessionContext.tsx` | Criar (novo contexto) |
| `src/pages/Auth.tsx` | Adicionar fluxo membro: sociedade → busca nome → confirma |
| `src/pages/MembroHome.tsx` | Usar MembroSession em vez de auth obrigatorio |
| `src/App.tsx` | Registrar MembroSessionProvider |
| Migration SQL | Adicionar RLS policy para anon SELECT na tabela members (se necessario) |

