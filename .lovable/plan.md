
Vou adaptar o sistema de eleição para suportar eleição de diáconos com **3 vagas**, voto em até **3 pessoas**, voto em branco, apuração por escrutínios e remoção automática dos eleitos/mais votados entre rodadas.

## Regras confirmadas

- Serão **3 vagas para diácono**.
- Cada votante poderá escolher **até 3 pessoas** no mesmo voto.
- Também haverá opção de **voto em branco**.
- O voto em branco **conta no total** usado para calcular a maioria.
- Para alguém ser eleito, precisa ter **mais de 50% dos votos totais do escrutínio**.
- Se nem todas as vagas forem preenchidas no primeiro escrutínio, haverá segundo/terceiro escrutínio.
- A cada novo escrutínio:
  - quem já foi eleito sai da lista;
  - a quantidade de escolhas permitidas diminui conforme as vagas restantes;
  - exemplo: se 1 for eleito no primeiro, no segundo cada pessoa vota em até 2 nomes;
  - se 2 forem eleitos no primeiro, no segundo vota em até 1 nome.
- Na tela inicial da urna, antes de clicar em **Iniciar votação**, as fotos dos candidatos não devem aparecer.
- As fotos continuam aparecendo somente depois que a pessoa iniciar o voto.

## Ajustes no banco de dados

Será necessário atualizar a estrutura da eleição para suportar votos com múltiplas escolhas por cédula.

### 1. Eleições

Adicionar campos na tabela de eleições para controlar eleições com múltiplas vagas:

```text
seats_count              número total de vagas, padrão 1
max_choices_per_ballot   máximo de escolhas por voto, padrão 1
current_round            escrutínio atual, padrão 1
majority_rule            regra de maioria, usando "absolute_50"
```

Para a eleição de diácono, os valores serão:

```text
seats_count = 3
max_choices_per_ballot = 3
majority_rule = absolute_50
```

### 2. Votos

A tabela atual registra um voto por candidato. Para permitir uma cédula com até 3 nomes, vou ajustar os votos para terem:

```text
ballot_id      identificador da cédula
round_number   número do escrutínio
candidate_id   candidato votado, podendo ser vazio quando for voto em branco
is_blank       marca se foi voto em branco
```

Assim, uma pessoa que escolher 3 candidatos gera uma única cédula com 3 linhas de escolha, todas com o mesmo `ballot_id`.

Um voto em branco gera uma cédula com uma linha marcada como branco.

## Ajustes na criação da eleição

Na tela de criar eleição, vou adicionar uma configuração simples para eleição de cargo:

```text
Quantidade de vagas
Máximo de escolhas por voto
```

Com valores padrão:

```text
1 vaga
1 escolha
```

Para diácono, será possível configurar:

```text
3 vagas
até 3 escolhas
```

A interface continuará simples, mas permitirá criar eleições de múltiplas vagas sem precisar mexer no código novamente.

## Tela de votação da urna

Vou alterar `src/pages/VotePublic.tsx`.

### Antes de iniciar votação

Hoje a tela de “Urna pronta” mostra as fotos dos candidatos/modelos.

Vou remover essas fotos dessa tela.

Ela ficará mais discreta e segura:

```text
Urna pronta
Eleição de Diáconos
3 vagas disponíveis
Clique em iniciar votação
```

Sem fotos e sem nomes dos candidatos antes do início do voto.

### Depois de iniciar votação

A tela de escolha passará a permitir selecionar múltiplos candidatos quando a eleição tiver mais de uma vaga.

Para a eleição de diácono:

```text
Escolha até 3 candidatos
Selecionados: 0/3
```

Cada card de candidato terá:

- foto;
- nome;
- botão/estado visual de selecionado;
- numeração da seleção, se aplicável.

Exemplo:

```text
[ ] João
[1] Pedro
[2] Marcos
[ ] Lucas
```

### Voto em branco

Vou adicionar um botão destacado:

```text
Votar em branco
```

Comportamento:

- se clicar em branco, limpa candidatos selecionados;
- confirma como voto em branco;
- não permite misturar branco com candidatos;
- na confirmação, aparece claramente:

```text
Confirmar voto em branco?
```

### Confirmação do voto

Para voto em candidatos, a confirmação mostrará a lista selecionada:

```text
Confirma seu voto em:

1. João
2. Pedro
3. Marcos

Cancelar | Confirmar
```

Para voto em branco:

```text
Confirma seu voto em branco?

Cancelar | Confirmar
```

O som de confirmação e o retorno automático da urna serão preservados.

## Contagem de votos no painel administrativo

Vou ajustar `src/components/eleicoes/VotingPanel.tsx`.

Hoje o painel conta linhas de voto. Para eleição com múltiplas escolhas, isso ficaria errado.

Vou mudar para contar **cédulas únicas** por escrutínio:

```text
Total de presentes: 50
Cédulas recebidas: 50
```

Assim, mesmo se cada pessoa escolher 3 candidatos, o sistema continua conferindo corretamente se votaram exatamente os presentes.

## Resultado por escrutínio

Vou ajustar `src/components/eleicoes/ResultPanel.tsx`.

O resultado passará a considerar o escrutínio atual:

```text
1º escrutínio
Total de cédulas: 50
Maioria necessária: 26 votos
```

Cada candidato mostrará:

```text
João       32 votos   Eleito
Pedro      28 votos   Eleito
Marcos     21 votos
Lucas      12 votos
Branco      4 votos
```

Regra:

```text
Maioria necessária = metade do total de cédulas + 1
```

Exemplo:

```text
50 cédulas -> precisa de 26 votos
51 cédulas -> precisa de 26 votos
```

Como o voto em branco conta no total, ele aumenta a base de cálculo da maioria.

## Fluxo de segundo e terceiro escrutínio

Vou adicionar no painel administrativo uma área de controle de escrutínio.

Quando a votação de um escrutínio terminar, o sistema calculará:

```text
eleitos neste escrutínio = candidatos com mais de 50%
vagas restantes = 3 - total de eleitos acumulados
```

Se ainda faltarem vagas, aparecerá um botão:

```text
Iniciar próximo escrutínio
```

Ao iniciar o próximo escrutínio:

- a votação volta para aberta;
- o número do escrutínio aumenta;
- os eleitos anteriores saem da lista da urna;
- o limite de escolhas vira a quantidade de vagas restantes.

Exemplo:

```text
1º escrutínio:
3 vagas
vota em até 3
João eleito

2º escrutínio:
2 vagas restantes
vota em até 2
João não aparece mais
```

Se no segundo for eleito mais 1:

```text
3º escrutínio:
1 vaga restante
vota em até 1
eleitos anteriores não aparecem
```

Quando completar as 3 vagas, o painel permitirá concluir a eleição.

## Critério para candidatos que continuam no próximo escrutínio

Vou implementar inicialmente de forma segura e simples:

- eleitos saem;
- candidatos não eleitos continuam disponíveis;
- o administrador pode remover candidatos manualmente se quiser restringir a lista.

Como você mencionou “tirando o mais votado e colocando os menos votados”, vou tratar automaticamente quem atingiu a maioria como eleito e removido da próxima rodada. Os demais seguem para o próximo escrutínio, porque isso evita eliminar alguém indevidamente sem uma regra formal de corte.

## Compatibilidade com eleições antigas

As eleições simples atuais continuarão funcionando como antes:

- 1 vaga;
- 1 escolha;
- sem necessidade de múltipla seleção;
- resultado simples.

A nova lógica só muda o comportamento quando a eleição tiver mais de 1 vaga ou limite de escolha maior que 1.

## Arquivos que serão alterados

### Banco de dados

Criar migração para:

- adicionar campos de configuração na tabela `elections`;
- permitir `candidate_id` vazio em votos brancos;
- adicionar `ballot_id`, `round_number` e `is_blank` em `election_votes`;
- preservar os votos antigos como primeiro escrutínio.

### `src/pages/Eleicoes.tsx`

- Adicionar campos de quantidade de vagas e máximo de escolhas ao criar eleição.
- Validar para não permitir escolhas maiores que vagas.
- Melhorar texto para eleições como “Diáconos”.

### `src/pages/EleicaoDetalhe.tsx`

- Carregar os novos campos da eleição.
- Repassar informações de vagas, escolhas e escrutínio para os componentes.

### `src/pages/VotePublic.tsx`

- Remover fotos da tela “Urna pronta”.
- Implementar seleção de até N candidatos.
- Implementar voto em branco.
- Confirmar múltiplos nomes.
- Registrar uma cédula com múltiplas escolhas.
- Exibir somente candidatos ainda elegíveis no escrutínio atual.
- Manter som, retorno automático e segurança da urna.

### `src/components/eleicoes/VotingPanel.tsx`

- Contar cédulas, não linhas de voto.
- Mostrar escrutínio atual.
- Mostrar vagas totais, eleitos e vagas restantes.
- Permitir iniciar próximo escrutínio quando necessário.
- Ajustar conclusão para só finalizar quando as vagas forem preenchidas ou quando o administrador decidir encerrar.

### `src/components/eleicoes/ResultPanel.tsx`

- Apurar por escrutínio.
- Mostrar votos por candidato.
- Mostrar voto em branco.
- Calcular maioria absoluta com branco contando no total.
- Marcar eleitos.
- Separar resultado por 1º, 2º e 3º escrutínio.

## Validação

Depois da implementação, vou validar:

- criação de eleição para diácono com 3 vagas;
- seleção de até 3 candidatos;
- impedimento de selecionar mais de 3;
- voto em branco separado;
- branco contando no total da maioria;
- contagem por cédula igual ao total de presentes;
- apuração correta de maioria acima de 50%;
- início de novo escrutínio com menos vagas restantes;
- remoção dos eleitos da próxima votação;
- tela inicial da urna sem fotos;
- fotos aparecendo apenas após clicar em “Iniciar votação”.
