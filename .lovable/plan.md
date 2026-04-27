## Atualização do VotePublic.tsx — Alinhar lógica de escrutínios com VotingPanel/ResultPanel

A urna pública (`src/pages/VotePublic.tsx`) ainda usa a lógica antiga de apuração (top-1 simples no 2º+ escrutínio, sem desempate por idade, sem limite de 3 escrutínios). Isso causa divergência com o que admin e resultados mostram: a urna pode liberar candidatos errados na cédula do 2º/3º escrutínio.

Vamos sincronizar a lógica e a tipagem, **sem alterar layout, sons, fluxo de autenticação de urna ou comportamento de UI**.

### Mudanças no arquivo `src/pages/VotePublic.tsx`

**1. Interface `Candidate`** — adicionar `birth_date`:
```ts
interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  photo_urls?: string[];
  display_order: number;
  birth_date?: string | null;
}
```

**2. Substituir `computeElectedIds`** pela mesma lógica de `ResultPanel.tsx`/`VotingPanel.tsx`:
- `MAX_ROUNDS = 3`
- 1º escrutínio: maioria absoluta (se `majority_rule === 'absolute_50'`); empate na posição de corte → só elege quem está claramente acima do empate.
- 2º escrutínio: maioria absoluta entre os top candidatos restantes; empate na posição de corte bloqueia eleição (vai para o 3º).
- 3º escrutínio (final): se houver empate na posição de corte, desempata pelo `birth_date` mais antigo (mais velho).
- Itera apenas até `currentRound - 1` (apura rodadas já finalizadas).

**3. Atualizar `getTopForNextRound`** para considerar empates corretamente:
- Manter "top N candidatos" baseado nos votos da rodada anterior.
- **Incluir todos os candidatos que estão empatados na posição de corte** (para que ninguém fique de fora indevidamente no 2º/3º escrutínio). Ex.: se `topN=3` e o 3º e 4º colocados empatam, exibir os 4 na cédula.

**4. `eligibleCandidates`** — manter a estrutura atual (1º round mostra todos; 2º+ usa `getTopForNextRound`), mas garantindo que use a nova lógica e que o cálculo de `remainingSeats` continue baseado no novo `electedIds`.

**5. Bloqueio após 3º escrutínio**: se `currentRound > 3`, exibir tela informando que o número máximo de escrutínios foi atingido (mesmo padrão visual da tela "Votação Indisponível"), evitando que a urna aceite mais cédulas. Texto: "Número máximo de escrutínios atingido. Aguarde o admin para encerrar a eleição."

**6. Realtime** — nenhuma mudança estrutural. O canal já reage a `current_round`/`status` e recarrega votos via `computeElectedIds`. Apenas garantir que passe `majority_rule` (já passa).

### Não muda

- Layout, classes Tailwind, sons (`primeAudio`, `playUrnaSound`, fallback beep), fluxo de autenticação de urna, modo individual/compartilhado, persistência de `device_id`, telas de confirmação, carrossel de fotos, tela de sucesso, tela de "já votou".
- Não há mudanças de banco de dados (campo `birth_date` em `election_candidates` já foi adicionado em migration anterior).
- Tipagem em outros arquivos não muda (já foi atualizada em `EleicaoDetalhe.tsx` e `VotingPanel.tsx`).

### Resultado esperado

A urna passa a respeitar exatamente as mesmas regras de apuração do painel admin e do painel de resultados, evitando que candidatos já eleitos apareçam na cédula ou que a urna libere uma cédula no 4º escrutínio.
