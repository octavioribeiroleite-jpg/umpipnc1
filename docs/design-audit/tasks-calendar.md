# Auditoria visual — tarefas e calendário

Implementação local em 28/09/2026. Skill e checklist visual lidos na etapa financeira. Propriedade desta etapa: `pages/Tarefas.tsx`, `pages/Calendario.tsx`, `components/tarefas/*`, `components/calendario/*`. Nenhum hook, contrato, dado, regra de status ou permissão foi alterado; nenhuma ação real foi executada.

| Tela / evidência anterior | Alteração de apresentação | Cobertura |
| --- | --- | --- |
| Tarefas: colunas com mínimos 320/260/260 px; skeleton com três mínimos de 280 px a partir de 768 px | Grade fluida em uma coluna no tablet e três no desktop amplo, com `min-w-0`; skeleton usa o mesmo princípio | A fazer, Em andamento, Concluída; carregamento, vazio e busca sem resultado |
| Tarefas: quatro cards numéricos, filtros de 32 px e ações de 28 px | Cards adaptam a uma coluna estreita, duas intermediárias e quatro largas; filtros/ações com 44 px; busca nomeada e seleção de prioridade com `aria-pressed` | Contagens, pesquisa e Todas/Alta/Média/Baixa |
| TaskCard compacto era `div` clicável e texto 9–10 px; responsável escondido no card completo móvel | Botão com foco nativo no compacto, labels >=12 px, responsável completo no card principal, nomes/descritivos quebram linhas; checkbox com nome acessível e alvo ampliado | Completo/compacto, atrasada/hoje, detalhes, mudança de status, editar/excluir |
| TaskDialog: dois campos fixos por linha mesmo em telas estreitas | Campos em uma coluna móvel e duas a partir de 640 px; modal/drawer com rolagem e 90dvh | Novo/editar, prioridade/status, data/popover/responsável, exclusão |
| Calendário: próximo eventos ocupava 1/4 da tela em 1024 px e sumia no celular | Calendário e próximos eventos empilhados até desktop amplo, depois grade com coluna lateral mínima legível; próximos visíveis também no celular | Visão mensal, semana/15 dias móvel, anterior/próximo, lista mensal e próximos |
| Calendário: evento compacto `div` truncado dentro de dia `div` clicável | Dia com botão nativo de fundo nomeado por data e contagem, evento com botão separado; evita propagação do clique para abertura simultânea de dia e evento, sem mudar os callbacks | Teclado/foco preparados no JSX; execução interativa ainda pendente |
| Calendário e EventCard: nomes/locais truncados, badges 10 px | Títulos e locais completos com quebra; horários/locais envolvem linhas; alvos de 44 px; rótulos Concluído/Não realizado acrescentados à apresentação de estados já suportados | Evento compacto/completo, confirmado/pendente/cancelado/concluído/não realizado |
| EventCompletionList: ações e texto pequenos espremeriam título em linha | Conteúdo e ações quebram em linhas; texto >=12 px; botões 44 px | Aguardando conclusão, próximos, realizados, permissões existentes preservadas |
| EventDialog e DayDetailDrawer | Rolagem interna com limite 90dvh, pares de data/hora empilhados no celular e texto com quebra | Criar/editar, visualização somente leitura, dia inteiro, vínculo com reunião, detalhes do dia |

## Validação

- ESLint direcionado das duas páginas e todos os componentes destas pastas: **0 diagnósticos antes e 0 depois**.
- Finanças: teste legado `tests/layout-readability.test.mjs` atualizado para as classes semânticas, mantendo `white-space: normal`, `overflow-wrap: anywhere`, ausência de ellipsis/nowrap/corte, e verificando uso pelos componentes reais; **3 testes passaram**.
- Typecheck, suíte global e build coordenados pela tarefa principal após integração.
- Inspeção desta etapa é de código. Não houve navegador, screenshots, sessão autenticada ou manipulação de registros. Regras foram preparadas para 375/390/768/1024/1440 px; estas larguras não foram conferidas visualmente por este agente. Não houve servidor nem publicação.
