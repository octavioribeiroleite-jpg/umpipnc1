Aplicar correções na lógica de votação multi-vagas, escrutínios e exibição de Branco/Nulo, sem mexer em estrutura de banco.

## Regras consolidadas

1. Contagem de Branco/Nulo
- Cada marcação em branco conta como 1 (não por cédula).
- Brancos entram no total de cédulas para cálculo da maioria absoluta.

2. Apuração por escrutínio
- 1º escrutínio: maioria absoluta = `floor(total_cedulas / 2) + 1`.
- Eleitos no escrutínio acumulam e são removidos das próximas rodadas.
- Eleitos contam para `vagas_restantes`.

3. Limitação de candidatos no 2º+ escrutínio (fórmula confirmada)
```
vagas_restantes = seats_count - total_eleitos_até_agora
candidatos_exibidos = top (vagas_restantes + 1) candidatos mais votados da rodada anterior, excluindo já eleitos
```
Exemplos:
- 3 vagas, 1 eleito no 1º → 2º escrutínio mostra top 3 do 1º (excluindo o eleito).
- 3 vagas, 2 eleitos no 1º → 2º escrutínio mostra top 2 do 1º (excluindo eleitos).
- 3 vagas, 0 eleitos no 1º → 2º escrutínio mostra top 4 do 1º.

4. Voto parcial mantido
- Pode misturar candidatos + brancos/nulos até o limite do escrutínio atual.
- Pode votar em menos que o limite.

5. Detecção de empate (apenas sinalização nesta etapa)
- No 2º+ escrutínio, se o topo da apuração estiver empatado dentro da janela de `vagas_restantes + 1`, o painel exibirá alerta de empate.
- Não eleger automaticamente em caso de empate.
- Não criar coluna nova no banco. A decisão manual do Conselho fica para etapa futura com tabela própria `election_tiebreaks`.

6. Terminologia visual
- Trocar “Voto em branco” / “Votar tudo em branco” por “Branco / Nulo” na interface.
- Internamente segue usando `is_blank`.

## Arquivos a alterar

### `src/components/eleicoes/ResultPanel.tsx`
- Receber `majority_rule` da eleição (já recebe via prop) e aplicar `absolute_50` corretamente.
- Trocar contagem de brancos: `roundVotes.filter(v => v.is_blank).length`.
- Calcular eleitos por escrutínio respeitando `vagas_restantes` acumulado.
- Renomear rótulo para “Brancos / Nulos”.

### `src/pages/VotePublic.tsx`
- Ajustar `computeElectedIds` para acumular eleitos de todos os escrutínios anteriores ao atual (mantém comportamento; revisar limites).
- Carregar todos os votos da eleição (`allVotes`) — já é feito em `voteRows`. Reaproveitar para calcular top da rodada anterior.
- Substituir `eligibleCandidates`:
  - 1º escrutínio: candidatos não eleitos.
  - 2º+ escrutínio: aplicar `getTopForNextRound(allVotes, candidates, electedIds, currentRound - 1, vagasRestantes + 1)`.
- Reduzir `maxChoices` para `min(max_choices_per_ballot, vagas_restantes)` no escrutínio atual.
- Trocar textos para “Branco / Nulo” em:
  - botão “Votar tudo em branco” → “Votar tudo em Branco / Nulo”;
  - botão “Votar em branco” → “Votar em Branco / Nulo”;
  - confirmações “Voto em branco” → “Branco / Nulo”;
  - rótulo do contador “Brancos” → “Brancos / Nulos”.

### `src/components/eleicoes/VotingPanel.tsx`
- Manter contagem por cédulas únicas (já correto).
- Alinhar cálculo de eleitos com `ResultPanel` (`absolute_50` ou regra simples).
- Adicionar detecção de empate no escrutínio atual (top dentro de `vagas_restantes + 1` com mesma contagem que o último elegível).
- Exibir alerta amarelo:
  ```
  ⚠️ Empate detectado no Nº escrutínio
  O Conselho deve decidir manualmente o(s) candidato(s) eleito(s).
  ```
- Bloquear botão “Próximo escrutínio” / “Concluir” quando houver empate sem decisão? → Apenas avisar, sem bloquear, para não travar o fluxo. A decisão registrada virá em etapa futura.

## Checklist de validação após implementar

- [ ] `allVotes` em `VotePublic.tsx` cobre todos os escrutínios.
- [ ] `ResultPanel.tsx` aplica `majority_rule` recebido.
- [ ] Brancos/Nulos contados por marcação.
- [ ] Maioria absoluta = `floor(total/2) + 1`, com brancos no total.
- [ ] Eleitos removidos do próximo escrutínio.
- [ ] 2º+ escrutínio mostra exatamente top `vagas_restantes + 1`.
- [ ] `maxChoices` do escrutínio = `min(max_choices_per_ballot, vagas_restantes)`.
- [ ] Voto misto (candidatos + brancos) continua funcionando.
- [ ] Empate é apenas sinalizado, sem eleger automaticamente.
- [ ] Textos da interface usam “Branco / Nulo”.

## Etapa futura (não nesta entrega)

Criar tabela dedicada quando formos implementar decisão manual do Conselho:
```sql
CREATE TABLE election_tiebreaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid REFERENCES elections(id),
  round_number int,
  elected_candidate_id uuid,
  decided_by uuid,
  decided_at timestamptz DEFAULT now()
);
```