# Reuniões, plenárias e histórico EBD — implementação de 05/10/2026

Escopo: pranchas 10 e 34–39 do projeto visual. Implementado no worktree de integração; este registro não comprova deploy nem validação em produção.

## Alterações

- Reunião abre no registro, com pauta de apoio e navegação de seções compartilhada. Editores visitados ficam montados ao alternar seções ou largura. A troca de reunião reinicia o estado por identidade.
- Autosave de notas serializa as gravações e distingue o último texto confirmado do rascunho. Falha mantém o texto; processamento/finalização aguardam confirmação. Cancelar pauta ou ata não publica o rascunho.
- Criação em três blocos (identidade, agenda, participantes), filtros visíveis e listagens com nomes completos. Plenária divide chamada, anotações e ata; presença tem rótulo textual. Quórum mantém a regra existente, agora explicada.
- Histórico EBD tem filtros independentes de período/turma antes dos resultados. Consulta, exportação e edição administrativa têm áreas próprias e data explícita. A seleção da turma no diálogo de frequência continua separada do filtro.
- Agregados filtrados usam `classSummary` histórico. Relatório completo usa o total de cada turma/data salvo no fechamento, e estatísticas nominais usam `buildDayRoster` e a turma da presença gravada. O filtro alcança os relatórios. Fila, guardas de snapshot e APIs de fechamento/reabertura foram preservadas.

## Evidência automatizada

- TypeScript: `tsc -p tsconfig.app.json --noEmit` passou.
- `meeting-draft.test.mjs`: 5 cenários passaram (gravação A/B concorrente, falha/retry, atualização externa, leitura e desmontagem, resposta de rota antiga).
- `ebd-pdf-snapshot.test.mjs`: 22 cenários passaram, incluindo bloqueio de PDF desatualizado, renovação de escopo, fechamento filtrado e aluno transferido/inativo.
- `layout-readability.test.mjs`: 3 cenários passaram. `git diff --check` passou.
- Nenhum dado real, IA externa, presença, mensagem ou operação financeira foi usado. O teste do hook usa ciclo de vida determinístico; não substitui inspeção de foco, toque ou viewport.

## Inspeção integrada

A raiz da tarefa conduz o navegador exclusivo nas fixtures isoladas 8083/8092. Casos entregues: digitar A, salvar e digitar B durante a resposta; alternar registro/pauta/ata e redimensionar; cancelar pauta/ata; editar título enquanto o registro salva; alternar anotações/chamada; filtro histórico com fechamento e transferidos. Confirmar essas interações no relatório integrado antes da publicação.

Limite histórico preservado: não há uma tabela nova de matrícula por data. Alunos sem marcação usam a elegibilidade já definida por `buildDayRoster`; os totais agregados de dias fechados continuam pertencendo ao snapshot do fechamento.
