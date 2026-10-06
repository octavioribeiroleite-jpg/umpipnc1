# PIN EBD em tela única — 06/10/2026

QA independente aprovada na fixture isolada `8086`, com componentes produtivos, dados fictícios e transporte remoto/escritas bloqueados. Base `90aa3529774205a85fd87b80755104ef173bd93a`; o código final em revisão está identificado por SHA-256 em [source-revision.json](source-revision.json). Nenhuma fonte produtiva foi alterada pelo auditor.

O baseline tinha título e X externos, PIN compacto e workspace visível atrás do popup. A solução final mantém o workspace montado e o foco do Radix, mas apresenta uma página opaca de ponta a ponta, sem moldura nem navegação duplicada. A referência real da Diretoria foi aberta pela Home e pela seleção de UMP: em 390×844, as duas telas têm logo de 118,16px, 6 slots, 12 teclas e Confirmar de 44px em y=682,16 até 726,16. A arte e o arquivo oficial da logo permaneceram byte-idênticos à base.

## Medidas finais

Todos os casos abaixo passaram em claro e escuro, alternados sem recarregar. [matrix.json](matrix.json) contém os 18 resultados completos. Com seis dígitos, há uma única página PIN e um único título visual; todos os controles medem pelo menos 44px e ficam dentro das áreas seguras fictícias 44/34/18/18. Overflow horizontal e do diálogo: 0.

| Viewport | Claro/escuro | Final do Confirmar |
| --- | --- | --- |
| 320×640 | PASS/PASS | 563,11px |
| 390×844 | PASS/PASS | 726,16px |
| 390×640 | PASS/PASS | 563,11px |
| 768×1024 | PASS/PASS | 929,34px |
| 768×640 | PASS/PASS | 563,11px |
| 1024×768 | PASS/PASS | 686,61px |
| 1024×640 | PASS/PASS | 563,11px |
| 1440×900 | PASS/PASS | 762,57px |
| 1440×640 | PASS/PASS | 563,11px |

Também foram conferidos PIN vazio, espera da resposta fictícia, erro real do handler e professor na entrada normal/renovação em 320×640. Na espera, navegação e submissão ficam desabilitadas. Com erro e seis dígitos, Confirmar termina 581,36px, abaixo do limite útil 606px. Em telas curtas, a redução remove apenas decoração; logo, instrução, slots e controles continuam visíveis. A placa compartilhada de Home corrigiu o contraste sobre o SVG: botão habilitado 11,99:1 no claro e 15,45:1 no escuro, calculados dos estilos finais em [home-contrast.json](home-contrast.json).

## Comportamento

- Oito Tabs nativos permaneceram no PIN/Radix; a árvore de acessibilidade não expôs o workspace oculto. Abertura automática focou o card do PIN; seis teclas individuais preencheram 1→6 slots e Enter confirmou o acesso fictício.
- Rascunho de visitante preenchido antes de `reauthAfter=15000`, com turma fictícia previamente aberta por `callStarted=1`, permaneceu no mesmo input, view e turma após renovação. O foco retornou ao input anterior. Voltar também preservou rascunho e foco. Nada foi salvo: [draft-renewal.json](draft-renewal.json), [draft-close.json](draft-close.json).
- Voltar do navegador fechou a renovação e manteve a Secretaria/Professor. “Voltar para a Home” conservou a legenda completa e abriu `/auth?home=1`.
- Regressão do outro PIN em diálogo, na tesouraria: seis teclas e Enter abriram apenas o caixa fictício; fechar após reabertura devolveu foco a “Acessar tesouraria”. Nenhuma movimentação financeira foi feita: [treasury-keyboard.json](treasury-keyboard.json).

## Evidências e verificações

Oito imagens representativas foram mantidas; estados intermediários de correção foram descartados após a prova final.

| Evidência | Arquivo |
| --- | --- |
| Baseline do popup | [baseline 390](baseline-dialog-light-390x844.jpg) |
| EBD final preenchido, celular | [390 claro](reauth-admin-filled-light-390x844.jpg) |
| EBD final preenchido, celular curto | [320×640 claro](reauth-admin-filled-light-320x640.jpg) |
| Erro real, celular curto | [320×640 escuro](reauth-admin-error-dark-320x640.jpg) |
| Referência real Diretoria | [Diretoria 390](diretoria-filled-light-390x844.jpg) |
| EBD final preenchido, tablet | [768 escuro](reauth-admin-filled-dark-768x1024.jpg) |
| EBD final preenchido, desktop | [1440 claro](reauth-admin-filled-light-1440x900.jpg) |
| Rascunho após renovar, com foco | [Rascunho 390](draft-after-renewal-dark-390x844.jpg) |

Verificações do root, sobre a fonte final: tipos PASS; 429/429 testes; build PASS, com avisos preexistentes de chunk/sonner; lint pertinente PASS, exceto 13 `no-explicit-any` preexistentes de Secretaria, idênticos à base; diffcheck PASS. PWA v24. [summary.json](summary.json) agrega o resultado da QA.

## Limites

As áreas seguras e os temas foram emulados no navegador; não houve instalação ou teste físico de iOS/Android, splash nativo, teclado virtual ou sinais do sistema operacional. Não foram usados PINs, sessões ou dados reais. A fixture bloqueia Supabase remoto e todas as escritas.

O toast global preexistente pode cruzar a região de Confirmar durante os 500ms do erro, antes de o PIN ser limpo; a captura conserva esse estado transitório. `document.scrollHeight` inclui o workspace que permanece montado atrás da tela, com rolagem externa bloqueada; a medida relevante de fit é o diálogo, cujo overflow permanece 0.

Na fixture, navegar na Secretaria troca a URL para `?view=...` e remove parâmetros de cenário. Reproduções novas exigem abrir novamente a URL completa, em vez de recarregar a URL já normalizada. O cenário de stress compacto antigo não foi usado, pois representa a composição anterior.
