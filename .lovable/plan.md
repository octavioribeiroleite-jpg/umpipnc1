
# Votacao Individual por Celular + QR Code Expandivel

## 1. Novo modo de votacao: Individual por dispositivo

### Problema atual
O modo atual usa um unico dispositivo (urna compartilhada) onde cada pessoa vota na vez dela. O usuario quer uma opcao onde cada membro abre o link no proprio celular e vota, mas limitado a 1 voto por dispositivo.

### Solucao

**Banco de dados - Migration:**
- Adicionar coluna `voting_mode` na tabela `elections`:
  - `'shared'` (padrao) = modo atual, urna compartilhada
  - `'individual'` = cada um vota no proprio celular, 1 voto por dispositivo
- Adicionar coluna `device_id` na tabela `election_votes` para rastrear o dispositivo

```sql
ALTER TABLE elections ADD COLUMN voting_mode text NOT NULL DEFAULT 'shared';
ALTER TABLE election_votes ADD COLUMN device_id text;
```

**VotePublic.tsx - Modo individual:**
- Gerar um identificador unico do dispositivo usando `localStorage` (fingerprint simples: gerar UUID na primeira visita e salvar em `localStorage`)
- Ao carregar a pagina, verificar se ja existe voto com aquele `device_id` para aquela eleicao
- Se ja votou: mostrar tela "Voce ja votou nesta eleicao" (sem revelar em quem)
- Se nao votou: mostrar candidatos normalmente, gravar o `device_id` junto com o voto
- No modo `individual`, NAO mostrar a tela de pre-votacao ("Iniciar Votacao") nem o reset automatico apos votar -- simplesmente mostrar "Voto computado" e ficar nessa tela
- No modo `shared` (atual): manter o comportamento existente sem mudancas

**VotingPanel.tsx - Escolha de modo:**
- No status `draft`, adicionar selector para escolher o modo de votacao (Urna Compartilhada / Voto Individual)
- Salvar o `voting_mode` na tabela `elections`
- No modo individual, o QR Code e link funcionam igual, mas cada celular so pode votar 1 vez

**EleicaoDetalhe.tsx:**
- Passar o `voting_mode` como prop para o VotingPanel

## 2. QR Code expandivel

**VotingPanel.tsx:**
- Adicionar um botao (icone de expandir/Maximize2) ao lado do QR Code
- Ao clicar, abrir um Dialog/modal fullscreen com o QR Code grande (ocupando a tela toda)
- Incluir o nome da eleicao e o link abaixo do QR expandido
- Botao para fechar o modal

### Arquivos afetados

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Adicionar `voting_mode` em elections, `device_id` em election_votes |
| `VotingPanel.tsx` | Seletor de modo no draft, botao expandir QR, modal fullscreen QR |
| `VotePublic.tsx` | Logica de device fingerprint, bloqueio de voto duplicado, fluxo diferente para modo individual |
| `EleicaoDetalhe.tsx` | Passar `voting_mode` como prop |

### Controle de 1 voto por dispositivo (detalhes tecnicos)

O controle sera feito em duas camadas:
1. **Client-side (localStorage):** ao votar, salvar `voted_{electionId} = true`. Na proxima visita, verificar antes de mostrar candidatos
2. **Server-side (device_id):** gravar o `device_id` (UUID gerado e salvo no localStorage) junto com o voto. Antes de inserir, consultar se ja existe voto com aquele `device_id`. Isso impede que limpem o localStorage e votem de novo (pois o UUID muda, mas a segunda camada do server tambem ajuda)
3. Para seguranca extra, a consulta server-side verifica se aquele `device_id` ja votou naquela eleicao antes de permitir o insert
