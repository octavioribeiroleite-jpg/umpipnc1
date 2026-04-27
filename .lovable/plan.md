## Atualização do VotingPanel.tsx — Lógica de escrutínios com desempate por idade

Aplicar as 6 alterações solicitadas no arquivo `src/components/eleicoes/VotingPanel.tsx` (o componente está em `eleicoes/`, não `elections/`) e adicionar o campo `birth_date` à tabela de candidatos.

### Mudanças no banco de dados

A tabela real é `election_candidates` (não `candidates`). Migration:

```sql
ALTER TABLE public.election_candidates 
  ADD COLUMN IF NOT EXISTS birth_date date;
```

Sem alteração de RLS (políticas existentes cobrem o novo campo).

### Mudanças em `src/components/eleicoes/VotingPanel.tsx`

1. **Interface `Candidate`** (linha 31): adicionar `birth_date?: string | null`.

2. **Lógica de apuração em `fetchVoteCount`** (linhas ~90-118): substituir o bloco `for (let round = 1; round <= currentRound; ...)` pela nova lógica com:
   - `MAX_ROUNDS = 3`
   - 1º escrutínio: maioria absoluta (se regra) com verificação de empate na posição de corte
   - 2º escrutínio: top candidatos disputam; bloqueia eleição se houver empate na posição de corte
   - 3º escrutínio: desempate automático pelo `birth_date` mais antigo (mais velho)

3. **Botão "Próximo escrutínio"** (linhas ~566-577): adicionar condição `currentRound < 3` e renomear label para `${currentRound + 1}º escrutínio →`.

4. **Mensagem de máximo de escrutínios atingido**: adicionar novo bloco logo após o botão para o caso `currentRound >= 3` com vagas ainda não preenchidas, explicando que o desempate foi por idade.

5. **Label do escrutínio no painel parcial** (linhas ~416-420): substituir o `<span>` para refletir três casos (1º = maioria, 2º = top 3 disputam, 3º = empate por idade).

6. **Necessário também ajustar a query do Supabase** em `fetchVoteCount` para incluir `birth_date` ao buscar candidatos? — Não. Os candidatos já vêm via prop `candidates` de `EleicaoDetalhe.tsx`, que faz `select('*')` em `election_candidates`. Após a migration, o campo virá automaticamente. A interface `Candidate` em `EleicaoDetalhe.tsx` (linha 35) também deve ganhar `birth_date?: string | null` para tipagem consistente.

### Observações

- Não adiciono UI para editar `birth_date` neste passo (não foi pedido). O campo ficará disponível no banco e tipado; o cadastro virá em prompt futuro caso necessário.
- Sem alterações em outros componentes além do `VotingPanel.tsx` e tipagem mínima em `EleicaoDetalhe.tsx`.
- Layout, estilos e demais comportamentos permanecem inalterados.
