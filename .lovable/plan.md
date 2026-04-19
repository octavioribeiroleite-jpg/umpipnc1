
Usuário quer simplificar a tela de apresentação (`/eleicao/:id/apresentar`) durante a votação — remover tudo exceto o contador.

## Remover da tela durante votação:
- Badge "Acompanhamento anônimo • atualiza a cada 5 votos"
- Texto "Votos confirmados"
- Texto "X% concluído"
- Texto "Aguardando votos…" / "Votação encerrada…"

## Manter:
- Header (logo + nome eleição + badge status)
- Contador grande "X / Y"
- Barra de progresso

## Arquivo
- `src/pages/EleicaoApresentar.tsx` — simplificar bloco "PROGRESS VIEW" (linhas ~227-267)

Tela de resultado (após "Mostrar Resultado") permanece igual.
