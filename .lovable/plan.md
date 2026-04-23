Entendi a correção: não é para mexer na segunda tela de acompanhamento/projetor. A alteração é na urna (`/vote/:electionId`, especialmente quando abre com `mode=urna`).

## O que vou alterar na urna

- Manter o fluxo atual da urna:
  - votar
  - confirmar candidato/modelo
  - tocar o som
  - mostrar “VOTO CONFIRMADO”
  - depois reiniciar automaticamente para o próximo voto

- Remover da tela de confirmação o contador visual:
  - remover “Próximo votante em”
  - remover “15s / 14s / 13s...”

- Manter o reinício automático funcionando por trás, sem mostrar o tempo para o usuário.

## Reformulação visual da confirmação

- Trocar o fundo verde da confirmação por um fundo claro/branco, para não ficar “verde sobre verde”.
- Manter o “VOTO CONFIRMADO” bem grande e muito visível.
- Usar verde apenas como destaque no ícone/check e em detalhes, não como fundo inteiro.
- Criar um card central branco com boa sombra, contraste forte e leitura fácil.
- Deixar a tela responsiva para celular, tablet e urna fixa.

## Onde será feito

- `src/pages/VotePublic.tsx`
  - Ajustar o componente `SuccessScreen`.
  - Remover a exibição do cronômetro.
  - Preservar o `setTimeout` que reinicia a urna automaticamente.
  - Melhorar layout, cores e contraste da tela de voto confirmado.

## Resultado esperado

Na urna, depois de confirmar o voto, aparecerá algo como:

```text
┌─────────────────────────────┐
│        ícone de check       │
│                             │
│      VOTO CONFIRMADO        │
│  Seu voto foi registrado    │
│                             │
│  Aguarde o próximo votante  │
└─────────────────────────────┘
```

Sem mostrar quantos segundos faltam para reiniciar.