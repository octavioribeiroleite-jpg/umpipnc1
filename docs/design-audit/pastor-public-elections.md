# Pastor, portal público e eleições — auditoria de apresentação

Data: 28/09/2026. Alvo informado e confirmado pela coordenação: Aplicativo IPNC, repositório `octavioribeiroleite-jpg/umpipnc1`, site Renovo IPNC. Esta etapa altera a apresentação local. Não houve servidor, acesso ao banco, mudança de RLS ou publicação por este agente.

## Evidência e correções

| Superfície | Antes (evidência no código) | Implementação |
|---|---|---|
| `PastorLayout` | Dois `{children}`, dentro de árvores desktop/mobile simultaneamente montadas; ambas ocultavam overflow horizontal | Uma única árvore de conteúdo, sem recorte horizontal no layout. Navegações condicionadas por CSS, largura compartilhada, áreas seguras e link para pular ao conteúdo. Redirecionamento de papel inadequado usa `Navigate` em vez de chamada de navegação durante renderização |
| Painel pastoral | Cabeçalho próprio, microtexto de 10 px, ações em quatro colunas mesmo no celular | `PageHeader` compartilhado, resumo em uma coluna no celular/três a partir de sm; ações em duas/quatro; sociedades em uma/duas colunas |
| Cartão de sociedade | Três métricas apertadas com saldo na coluna intermediária | Contagens em duas colunas e saldo em uma linha própria no celular; três colunas em telas maiores. Fórmula e conteúdo do saldo preservados |
| Calendário pastoral | Cabeçalho com largura mínima do mês e controles de 28–32 px; cards de evento sem padding | Removida largura mínima rígida; ações de 44 px, `aria-label`, dias selecionados anunciados. Cards de eventos com padding, texto completo, filtros e ações de 44 px |
| Comunicados/sugestões | Cabeçalhos próprios, drawer amplo sem limite de leitura, campos dependentes de placeholder e ações de 28 px | Cabeçalhos comuns; drawer limitado por `dvh`, conteúdo rolável e largura máxima. Título/mensagem rotulados; ações com nomes acessíveis e espaço de toque; mensagens quebram linhas |
| Resumo IA e notificações | Datas/badges de 10 px e cabeçalhos sem quebra; aviso comprimido | Texto secundário 12 px, cabeçalhos flexíveis, drawer de leitura com largura máxima e scroll. Lógica de geração e cache preservada |
| Portal `/igreja` | Cabeçalho fixed com deslocamento fixo do conteúdo, colunas inferiores dimensionadas por padding, nomes longos comprimiam ações | Header sticky com altura natural, grid inferior de quatro frações e área segura; largura comum com o app. Menu nomeado, título comum nas abas, formulário de identificação com opções tocáveis. Todas as etapas de identificação permanecem |
| Visitantes | Três resumos estreitos; tabela estendia margens negativas | Resumos uma/três colunas; tabela mantém todas as colunas em região própria rolável e nomeada, sem alargar a página; rótulos 12 px e nomes completos |
| Lista/detalhe de eleições | Cards em branco fixo, título e badge em linha rígida; controles de retorno 32 px | Tokens de card/borda do app, título de 24 px, ações de 44 px, listagem uma/duas colunas, cabeçalhos que quebram linha |
| Etapas da eleição | Labels de 10 px, larguras intrínsecas concorrentes | Frações iguais com `min-w-0`, rótulos de 12 px que quebram, etapa ativa anunciada. Mesmas etapas e regras de disponibilidade |
| Candidatos/modelos | Três candidatos por linha pequena, nomes truncados, remover foto dependia de hover | Duas colunas no celular (modelos uma), nomes completos, controles de 44 px e exclusão de foto visível em toque/foco |
| Presença eleitoral | Nome truncado, checkbox sem vínculo ao nome, excluir 24 px | Lista com região de scroll interna, label ligada a checkbox, nomes completos, ações de 44 px, mesmos handlers otimistas |
| Dispositivos/QR | Cadastro em linha rígida, ações de 28–32 px, fullscreen QR com cálculo pela janela e close duplicável | Cadastro reorganizado por breakpoint, controles de 44 px, QR proporcional e diálogo rolável com título e um fechamento nativo |
| Resultados | Nomes cortados ao lado de placares/badges | Quebra do cabeçalho e nomes completos, cores semânticas e números preservados |
| `/vote/:electionId` | Foto e indicadores minúsculos; nome de prévia com altura fixa/overflow; botão de candidato continha outros botões | Indicadores de 44 px em grupo com `flex-wrap`, `max-w-full` e contêiner com `min-w-0`, todas as fotos mantidas. Nome completo. Card envolve botão real de seleção; navegação das fotos mantém `stopPropagation`, mesma seleção e confirmação de voto |
| Apresentação da eleição | Cartões de ranking em duas colunas no celular e contador em 22vw | Ranking uma coluna móvel/até quatro grandes, título flexível, contador com escala móvel menor; apresentação de projeção permanece ampla em desktop. Nenhuma apuração alterada |

## Matriz de cobertura de código

| Rotas/área | Estados/abas examinados | Acesso preservado | Validação nesta etapa |
|---|---|---|---|
| `/pastor` | loading, erro/repetir, resumo diário, calendário/dia, sociedades, IA, avisos | Pastor/admin | Fonte + teste renderizado do layout |
| `/pastor/sociedade/:slug` | loading, resumo, indicadores, reuniões, tarefas, membros, sugestão | Pastor/admin | Fonte e typecheck |
| `/pastor/calendario` | filtros, modos, calendário, próximos eventos, diretrizes, detalhes/form de evento | Pastor/admin | Fonte e typecheck; componentes de evento compartilhados mantidos |
| `/pastor/comunicados` | lista, loading, vazio, expandir, drawer de criação/destinatários | Pastor/admin | Fonte e typecheck |
| `/pastor/sugestoes`, aliases | não lidas/lidas, responder, excluir/confirmação, vazio | Mesma escolha PastorLayout/AppLayout e guardas | Fonte e typecheck |
| `/visitantes` | filtro de data, domingos, totais, tabela, recorrentes/loading/vazio | Admin/pastor | Fonte e typecheck |
| `/igreja` | identificação, visitante novo, confirmação de retorno; Início, Programações, Avisos, Dízimos/PIX | Público com fluxo de identificação existente | Fonte e typecheck; nenhum registro de visita artificial criado |
| `/eleicoes` | Cargos/Camisas, vazio/loading, cadastro/excluir | Mesma guarda admin/pastor e AppLayout | Fonte e typecheck |
| `/eleicoes/:id` | Candidatos/Modelos, Presença, Dispositivos, Votação/Resultado, QR, edição e confirmações | Mesmo canManage/disabled/status | Fonte e typecheck |
| `/vote/:electionId` | loading, link inválido, indisponível, encerrada, já votou, urna pronta, seleção, confirmação, branco/nulo, sucesso | Mesma lógica de dispositivo/voto/rodada | Fonte + renderização real do componente de fotos (8 fotos) |
| `/eleicao/:id/apresentar` | progresso anônimo, resultado liberado, ranking/validação | Sem alterar liberação de resultado | Fonte e typecheck |

## Verificação executada

- `tests/pastor-layout-render.test.mjs`: **4 testes passaram**. Renderiza o componente real do layout com fronteiras de autenticação/navegação controladas: exatamente uma instância da página, um formulário e um input para pastor e admin; nenhum conteúdo para papel inadequado, visitante e loading. Também renderiza o componente real de fotos com oito imagens e verifica todos os oito controles de 44 px em grupo de largura limitada com quebra. Os testes não acessam API/banco.
- TypeScript global após as alterações: somente os dois diagnósticos anteriores de `src/pages/Secretaria 2.tsx` (linhas 709 e 854; propriedades de callbacks ausentes). Não há diagnóstico novo nestas áreas.
- Lint comparado com `git show HEAD:<arquivo>`: rodada final em 47 arquivos alterados resultou em 141 erros preexistentes antes/depois e nenhum diagnóstico novo. Build de integração conduzido pela coordenação.
- `git diff --check`: passou na verificação realizada.

## Limites e validação pendente

Esta é evidência de fonte e renderização de markup, **não inspeção visual de navegador**. As larguras 375, 390, 768, 1024 e 1440 px guiaram os breakpoints, mas não foram medidas/renderizadas por este agente. Faltam a inspeção interativa autenticada de cada papel, foco/teclado móvel, redimensionamento com formulário aberto, overlays, estados com dados e versão publicada. Nenhum resultado de build substitui essas verificações. A coordenação acompanha as limitações da prévia/publicação e as evidências de navegador que conseguir obter.
