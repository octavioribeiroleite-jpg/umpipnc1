## Correções no `src/components/eleicoes/VotingPanel.tsx`

Três ajustes pontuais, sem mudar layout, estilos ou demais comportamentos.

### 1. `fetchVoteCount` — bloco `else` do loop de rounds (round > 1)

Hoje (linhas ~109-116) o código pega o `topN` (top `remaining` candidatos) e elege todos se não houver empate entre o 1º e o 2º. Será substituído por uma versão mais conservadora que elege **apenas o 1º colocado**, e somente se ele não estiver empatado com o 2º:

```ts
} else {
  const topCandidate = sorted[0];
  const secondCandidate = sorted[1];
  const hasTie = secondCandidate && topCandidate[1] === secondCandidate[1];
  if (!hasTie && topCandidate) {
    elected.add(topCandidate[0]);
  }
}
```

### 2. `useEffect` do resultado parcial — incluir `name` em `partialRows`

- Atualizar a tipagem do estado:
  ```ts
  const [partialRows, setPartialRows] = useState<{
    candidate_id: string;
    name: string;
    count: number;
    pct: number;
    elected: boolean;
  }[]>([]);
  ```
- Dentro do `.map` que monta `rows` (linhas ~224-235), adicionar:
  ```ts
  name: candidates.find(c => c.id === r.candidate_id)?.name || 'Desconhecido',
  ```

### 3. `diff` nunca negativo + comparações via `voteCount >= totalPresent`

- Linha 65: trocar
  ```ts
  const diff = voteCount - totalPresent;
  ```
  por
  ```ts
  const diff = Math.max(0, totalPresent - voteCount);
  ```
- Substituir todas as ocorrências `diff === 0` por `voteCount >= totalPresent` nas linhas 190, 375, 388, 403, 510, 539, 540, 544 (incluindo o `diff !== 0` da linha 190, que vira `voteCount < totalPresent`).

### O que não muda

- Nenhuma outra lógica, JSX, estilos, fases (`voting` / `apurando` / `resultado`), realtime, banco ou RLS.
- `ResultPanel`, `EleicaoDetalhe` e demais componentes ficam intactos.

### Observação

A inversão do sinal de `diff` (`totalPresent - voteCount` em vez de `voteCount - totalPresent`) é segura porque, após o passo 3, `diff` só é usado em contagens de pendentes/exibição — todas as condições binárias passam a usar `voteCount >= totalPresent`.
