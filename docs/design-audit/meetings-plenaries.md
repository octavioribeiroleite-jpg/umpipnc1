# Reuniões e plenárias — auditoria de apresentação

Data: 28/09/2026. Fonte local atual do IPNC. Edição estritamente de layout, classes, rótulos/acessibilidade e navegação por teclado. Sem alteração de handlers, consultas, regras de aprovação/IA, quórum, presença, auto-save ou permissões.

## Evidência antes e resultado implementado

| Área | Achado de código | Correção |
|---|---|---|
| `/reunioes` e pastas por dia | Pasta consumia mais 32 px de largura no celular; cabeçalho/título e badge disputavam linha; controles sem nome acessível | Recuo de pasta somente em sm; cabeçalhos que quebram, card com padding comum, título completo e exclusão nomeada |
| Filtros de reunião | Busca apenas com placeholder; ícone de filtros e selects sem nomes específicos | Nomes acessíveis de busca, status, mês e filtros; estados/callbacks preservados |
| `/reunioes/nova` e edição | Data/hora em duas colunas móveis; seleção de participante com alvo pequeno | Campos empilhados no celular; labels dos participantes com 44 px e nomes completos; ação final ocupa largura móvel |
| `/reunioes/:id` | Conteúdo interno ocultava overflow; seis ferramentas em duas colunas móveis; cards só respondiam ao mouse | Conteúdo sem recorte; ferramentas uma/duas/três colunas; card acessível por Enter/Espaço; cabeçalho e botão voltar no padrão comum |
| Pauta | Editor espremido entre índice e botões; título/descrição dependentes de placeholder | Grupos quebram por breakpoint; `min-w-0`, ações à direita ou linha seguinte, labels persistentes para criação/edição e descrição completa |
| Registro/Resumo IA | Campo de registro sem nome acessível, fonte monoespaçada em texto extenso; categorias rígidas | Rótulo de registro, leitura proporcional, categorias com quebra e texto que respeita largura |
| Ata e comunicação WhatsApp | Título concorria com ações em linha; texto longo sem quebra explícita | Cabeçalhos/ações flexíveis; corpo com quebra e entrelinha; campos da ata nomeados |
| Contribuições/IA | Revelação e botões em linha rígida; texto longo e campo sem nome | Quebra de ações, campo nomeado por seção e contribuições com texto completo; conteúdo oculto permanece condicionado às mesmas regras |
| `/plenarias` | Metadata/status rígidos e formulário com labels sem vínculo | Lista uma/duas colunas; metadata flexível; labels ligados a título/data; exclusão nomeada |
| Membros de plenária | Nomes truncados e botões comprimindo a linha | Cards empilhados no celular, nome completo, controle de exclusão 44 px, busca nomeada e label de cadastro ligada ao campo |
| `/plenarias/:id` | Chamada em duas colunas no celular; remoção 20 px só aparecia em hover, sobrepondo canto do card | Chamada uma coluna no celular; ação de remoção fora do card, visível ao toque e nomeada; presença com `aria-pressed`. Cabeçalhos/ações reorganizam em espaço curto |
| Notas/ata de plenária | Editores sem nome, texto final podia ultrapassar largura | Nome acessível de cada editor e texto final com quebra/entrelinha |

## Cobertura

| Rota | Estados/fluxos conferidos por fonte |
|---|---|
| `/reunioes` | loading, vazio/primeira reunião, agrupamento por dia, busca/status/mês, aberta/fechada, acessar/finalizar/excluir com mesma guarda |
| `/reunioes/nova` | título/data/horário, participantes, moderador, loading e envio |
| `/reunioes/:id` | Registro, Resumo IA, Ata, WhatsApp, Pauta, Ações; não encontrada, carregando, encerrada/só consulta, texto não processado; editar/reabrir/excluir com guardas existentes |
| `/plenarias` | abas Plenárias/Membros, lista/vazio/loading, criar/excluir, ativos/inativos, buscar/criar/excluir membro |
| `/plenarias/:id` | presença não iniciada/chamada/quórum/busca/sincronização/remoção, expandir/recolher, notas/auto-save, processamento IA, ata organizada/edição e PDF |

## Verificação e limites

- Typecheck global depois da implementação: apenas os dois erros preexistentes em `src/pages/Secretaria 2.tsx`, sem erros novos neste escopo.
- Lint comparado ao HEAD nos arquivos desta etapa junto ao primeiro conjunto: nenhum diagnóstico novo na comparação executada; erros preexistentes foram preservados e informados à coordenação.
- `git diff --check` passou. Build/testes de integração finais são feitos pela coordenação.
- Não foram criadas reuniões, plenárias, membros, contribuições ou presenças reais. Nenhuma chamada de IA/PDF foi disparada por este agente.
- Não houve navegador/servidor nesta etapa. A validação em 375, 390, 768, 1024 e 1440 px, teclado/foco, dados extensos, autosave visível e arquivos/PDF gerados continua dependendo da conferência interativa. Fonte e typecheck não comprovam apresentação visual final nem operação ao vivo.
