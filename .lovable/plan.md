

## Diagnóstico da página atual

Pelo print:
- **5 accordions empilhados** sem hierarquia clara — o usuário não sabe por onde começar
- O bloco "Votação" mostra **erros vermelhos longe do botão** que está desabilitado, sem indicar visualmente *o que já foi feito*
- O modo "Urna Fixa" é a opção padrão mas **"Dispositivos Fixos" está fechado abaixo** — desconecta a causa do efeito
- "Chamada de Presença" fica por último, mas é **pré-requisito** para iniciar
- Header é compacto demais e não comunica progresso geral

## Proposta de redesenho

Transformar a página em um **wizard guiado por etapas**, mantendo a flexibilidade de voltar a qualquer passo, mas com um indicador visual claro do progresso.

### 1. Header reformulado (mais presença)

```text
┌─────────────────────────────────────────────────┐
│ ← │  Diáconos                    [Rascunho]    │
│   │  Eleição de cargo                           │
│   │  ───────────────────────────────────────   │
│   │  ●━━━━○━━━━○━━━━○   Etapa 1 de 4: Candidatos
└─────────────────────────────────────────────────┘
```

- Stepper horizontal com 4 etapas: **Candidatos → Presença → Dispositivos → Iniciar**
- Cada etapa: ✓ verde (completa), ● azul (atual), ○ cinza (pendente)
- Subtítulo dinâmico mostra a próxima ação

### 2. Card único da etapa atual (em vez de 5 accordions abertos)

Mostrar **apenas o card da etapa atual em destaque**, com os outros como "linhas resumo" colapsadas:

```text
┌─ ✓ Candidatos (3 cadastrados)         editar ─┐
└────────────────────────────────────────────────┘

┌─ ● ETAPA ATUAL ─────────────────────────────────┐
│  👥 Chamada de Presença                         │
│                                                 │
│  [campo + botões grandes]                       │
│  Lista de membros com checkbox...               │
│                                                 │
│  [Confirmar Presença →]                         │
└─────────────────────────────────────────────────┘

┌─ ○ Dispositivos Fixos (pendente)               ─┐
└─────────────────────────────────────────────────┘

┌─ ○ Iniciar Votação (pendente)                  ─┐
└─────────────────────────────────────────────────┘
```

Etapas concluídas viram **linha fina verde com ✓ e contador**, clicáveis para reabrir.
Etapas futuras aparecem **cinza claro, desabilitadas**, mas visíveis para dar noção do todo.

### 3. Modo de votação em destaque visual

No card "Iniciar Votação":
- Cards de modo **maiores, com ilustração**, não só ícone pequeno
- Cada modo mostra **automaticamente** o que precisa: ao escolher "Urna Fixa", aparece logo abaixo "→ Cadastre 1 urna" com link direto para a etapa
- Os erros vermelhos viram **checklist verde/cinza** (✓ feito / ○ falta), posicionado **ao lado do botão**, não embaixo

### 4. Reordenar etapas conforme dependência lógica

Ordem nova (alinhada ao fluxo real):
1. **Candidatos** — sem isso nada acontece
2. **Chamada de Presença** — define quórum e total
3. **Dispositivos Fixos** — só aparece se modo for Urna/Ambos
4. **Iniciar Votação** — gateway final com checklist

### 5. Pequenos polimentos

- Badge "Rascunho" com ícone de lápis em vez de só texto
- Background do card ativo levemente destacado (`bg-primary/5`)
- Animação suave (`transition-all`) ao mudar de etapa
- No mobile, o stepper vira pontilhado compacto no topo

### Arquivos a alterar

- `src/pages/EleicaoDetalhe.tsx` — substitui Accordion por novo layout stepper + cards
- Novo componente `src/components/eleicoes/ElectionStepper.tsx` — indicador de progresso
- Novo componente `src/components/eleicoes/ElectionStepCard.tsx` — wrapper de cada etapa (ativa/concluída/pendente)
- Pequeno ajuste em `VotingPanel.tsx` — checklist verde/cinza no lugar dos erros vermelhos

### Resultado esperado

- Quem abre a página entende em 2 segundos **onde está e o que falta**
- Impossível tentar iniciar votação sem ver o que está bloqueando
- Visual mais leve (1 card ativo em vez de 5 abertos) e mais "guiado"

