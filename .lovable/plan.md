## Exibir resultado parcial no VotingPanel quando todos votarem

Adicionar um painel inline de **resultado parcial do escrutínio atual** dentro do `VotingPanel.tsx`, visível somente quando `diff === 0` (todos votaram), posicionado **antes** dos botões "Próximo escrutínio" / "Concluir". Assim o admin tem contexto para decidir se avança ou conclui.

### Arquivo alterado
- `src/components/eleicoes/VotingPanel.tsx`

### Mudanças

**1. Imports do `lucide-react`**
Acrescentar `BarChart2` e `Medal` à linha de import existente (preservando os ícones já usados: `Play`, `RotateCcw`, `CheckCircle`, `Loader2`, `Link as LinkIcon`, `Copy`, `Maximize2`, `X`, `Smartphone`, `Monitor`, `Check`, `Circle`, `ExternalLink`, `Eye`).

**2. Novos estados**
```ts
const [partialRows, setPartialRows] = useState<{ candidate_id: string; count: number; pct: number; elected: boolean }[]>([]);
const [partialBlanks, setPartialBlanks] = useState(0);
const [partialNeeded, setPartialNeeded] = useState(0);
```

**3. Novo `useEffect`** — recalcula resultado parcial sempre que `diff === 0` (e zera quando volta a haver pendências). Deps: `[diff, currentRound, electionId, election?.majority_rule]`.

Lógica:
- Busca todos os votos da eleição
- Filtra pelo `currentRound`
- Conta cédulas únicas (`ballot_id`), brancos, e votos por candidato
- Calcula `needed = floor(totalBallots/2) + 1`
- Marca `elected = true` se `majority_rule === 'absolute_50'` ⇒ `count >= needed`; caso contrário `true` (regra simples — apuração final é feita no avanço de escrutínio)
- Ordena por `count` desc

**4. Bloco JSX de resultado parcial**
Inserido **logo após** o bloco do `tieAlert` e **antes** da barra de Progresso (`{/* Progress */}`). Renderiza apenas quando `diff === 0 && partialRows.length > 0`.

Conteúdo:
- Cabeçalho com ícone `BarChart2`, título "Resultado parcial — Nº escrutínio" e "Maioria necessária: X votos"
- Lista de candidatos com:
  - `Medal` no 1º colocado
  - Nome (destaque para o líder)
  - Badge verde "✓ Eleito" quando `r.elected && currentRound === 1`
  - Contagem e percentual
  - Mini barra de progresso colorida (verde p/ eleito, primary p/ líder, muted p/ demais)
- Linha "Brancos / Nulos: N" se houver
- Rodapé condicional:
  - `electedCount >= seatsCount` → "✅ Todas as N vaga(s) preenchidas."
  - senão → "⚠️ X de Y vaga(s) preenchida(s). Avance para o Nº escrutínio."

### O que NÃO muda
- Lógica de votação, contagem de cédulas, regras de empate, navegação de escrutínios, botões existentes ("Próximo escrutínio", "Concluir", "Reiniciar", "Abrir tela de apresentação")
- `ResultPanel.tsx`, `EleicaoDetalhe.tsx`, banco de dados, RLS
- Estilo visual dos contadores compactos (Presentes/Cédulas/Aguardando voto)

### Resultado esperado
Ao todos votarem em uma eleição multi-vaga (ou única), o admin vê **inline** um resumo ordenado dos votos por candidato + brancos + maioria necessária + status das vagas, antes mesmo de clicar em "Próximo escrutínio" ou "Concluir".