

## Entendendo o pedido

Durante a votação ao vivo, você quer **uma tela separada de apresentação** (para arrastar pro projetor) que mostre:

1. **Barra de progresso anônima** — votos aparecem em **lotes de 5** (delay), pra ninguém deduzir em quem alguém votou
2. **Contador grande**: X de Y votos recebidos
3. **Sem revelar candidatos** durante a votação
4. Ao **finalizar**, painel admin mostra botão **"Mostrar Resultado"** que revela ranking completo (quem ganhou, votos por candidato, %)

## Solução proposta

### 1. Nova rota pública de apresentação
**`/eleicao/:id/apresentar`** — tela cheia, fundo escuro, otimizada pra projetor:

- **Header**: nome da eleição + cargo
- **Card central gigante**: 
  - Número grande de votos confirmados (ex: "15 / 47")
  - Barra de progresso animada
  - Texto: "Aguardando votos..." ou "Votação encerrada"
- **Sem listagem de candidatos** durante votação
- **Status badge**: "🟢 Votação aberta" / "🔴 Encerrada"
- Atualiza via Supabase Realtime mas **com buffer de 5 votos**

### 2. Lógica de delay (lotes de 5)
- Hook `useBufferedVoteCount` que escuta votos em tempo real
- Mantém contador interno + contador "exibido"
- Só atualiza o exibido quando acumular 5 votos OU quando atingir o total de presentes OU quando votação for encerrada
- Garante que ninguém consegue cronometrar "fulano votou agora"

### 3. Botão de abrir apresentação no painel admin
No `VotingPanel.tsx`, durante votação ativa, adicionar botão:
- **"Abrir tela de apresentação"** (ícone Monitor + ExternalLink)
- Abre `/eleicao/:id/apresentar` em **nova aba** (`window.open`)
- Você arrasta essa aba pro projetor

### 4. Resultado só sob demanda
- Hoje: ao finalizar, `ResultPanel` aparece automaticamente
- Mudança: após finalizar, painel admin mostra botão **"Mostrar Resultado no Projetor"**
- Ao clicar, atualiza um campo `elections.show_result = true`
- A tela `/apresentar` escuta isso e troca para o **ranking completo** com:
  - 🏆 Pódio do vencedor (foto grande + nome)
  - Lista ranqueada com fotos, votos e %
  - Validação de votos (✓ Válido / ✗ Diferença)

### 5. Mudança de schema
Adicionar coluna em `elections`:
- `show_result BOOLEAN DEFAULT false` — controla se a tela de apresentação revela o ranking

### Arquivos afetados

- **Novo**: `src/pages/EleicaoApresentar.tsx` — tela pública de projeção
- **Novo**: `src/hooks/useBufferedVoteCount.ts` — buffer de 5 votos
- **Editar**: `src/components/eleicoes/VotingPanel.tsx` — botão "Abrir apresentação" + botão "Mostrar Resultado"
- **Editar**: `src/pages/EleicaoDetalhe.tsx` — esconder `ResultPanel` automático, mostrar só após `show_result=true` (ou manter visível só pro admin)
- **Editar**: `src/App.tsx` — adicionar rota `/eleicao/:id/apresentar` (pública, sem layout)
- **Migração SQL**: adicionar coluna `show_result` à tabela `elections`

### Resultado esperado

- Você abre a votação no notebook → clica **"Abrir apresentação"** → arrasta a aba pro projetor
- Plateia vê só **barra subindo de 5 em 5** e contador "X / Y"
- Impossível deduzir quem votou em quem pelo timing
- No fim, você decide quando revelar — clica **"Mostrar Resultado"** e o ranking aparece dramaticamente no projetor

