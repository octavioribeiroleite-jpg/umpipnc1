# Chamada e Secretaria EBD — revisão de 11/10/2026

A chamada foi revisada no código, em testes isolados, no navegador e por conferência somente leitura das regras e da consistência agregada do banco implantado. Os defeitos reproduzidos foram corrigidos na fonte em validação: denominador de presenças após transferência/inativação, visitante repetido após resposta perdida, atualização tardia de outro acesso, duplo toque que liberava controles antes da conclusão e divergência do resumo fechado com os cadastros atuais.

Alvo: Aplicativo IPNC, revisão inicial `16b241ec6e3582407358d09c50e3aa77f43a9264`, projeto Sites existente e URL `https://renovo-ipnc.octavioribeiroleite.chatgpt.site`. A logo foi preservada. Este relatório registra a validação da alteração; não confirma, por si só, um deploy concluído. Commit, sincronização das duas fontes, versão publicada e status nativo `succeeded` devem ser confirmados na entrega pelo coordenador.

## Abas revisadas

| Aba | Cobertura desta revisão |
| --- | --- |
| Início | Indicadores, resumo do encontro, acesso à chamada, navegação e dados do encontro separados do total de alunos ativos. |
| Chamada | Resumo geral, seleção de turma, não iniciada/em andamento/finalizada, consulta do dia fechado, presença/ausência, fila e confirmação, visitantes, finalizar/revisar, fechar/reabrir e PDF diário. |
| Histórico | Períodos e turma, encontros abertos/fechados, detalhes, responsáveis, resumo por turma, indicadores de frequência, edição administrativa e relatórios diário/período/completo. |
| Turmas | Listagem, contagens e controles no layout compartilhado da Secretaria. |
| Aniversariantes | Lista, filtros e controles com a mesma navegação, largura e tema do app. Não foi enviada mensagem como teste. |
| Alunos | Planilha, contagens, busca, filtros e controles no layout compartilhado. Cadastros reais não foram alterados. |
| Senhas das salas | Layout das configurações e controles de acesso. Nenhum PIN real foi lido ou modificado. |
| Acessos | Lista de acessos e disposição dos controles. Nenhuma sessão produtiva foi criada como teste. |

As oito abas foram inspecionadas. As mudanças de apresentação concentram-se na chamada, histórico e edição histórica; as demais mantêm as mesmas primitivas, logo e shell compartilhados.

## Padronização e correções

- Cards de filtros, resumo, exportação e ações administrativas usam `Card`, `CardHeader` e `CardContent`, com hierarquia, separação e espaçamento comuns ao aplicativo.
- Nome da turma, data, totais e estado ficam juntos. Seletores desabilitados repetidos no detalhe do histórico foram removidos, mantendo a identificação da consulta.
- Status usam tokens `info`, `success` e `warning` nos temas claro e escuro. Botões e campos de visitantes usam os tamanhos compartilhados e o nome opcional tem rótulo persistente.
- A barra de finalizar/revisar passou de posição fixa em toda a janela para posição sticky dentro da chamada, limitada à largura da lista. Na medição de 375px ela ficou entre x=16 e x=344, y=642 e y=716; a navegação inferior começava em y=747. Não houve sobreposição nessa conferência.
- Presenças do encontro usam o roster da data e a atribuição de turma salva na marcação. Inativação ou transferência posterior não produz mais o resultado reproduzido de 2 presentes para 1 aluno, ou 200%.
- Visitantes recebem UUID estável por tentativa e podem ser confirmados por leitura do mesmo ID após resposta desconhecida. Uma tentativa repetida enquanto o app permanece aberto ou renova o PIN conserva esse ID. Respostas de acesso antigo não alteram o estado, refetch ou mensagem do acesso atual.
- Travas síncronas protegem status, fechar/reabrir, visitante e geração de PDF antes do próximo render. A segunda tentativa não limpa o busy da primeira. A marcação não entra na fila durante mudança de status.
- O dia fechado usa os totais, visitantes e nomes das turmas registrados no fechamento. Turmas novas que não pertencem ao resumo não aparecem nele, e o resumo não introduz turmas fora do escopo autorizado da tela.
- O PDF diário usa a parcela do fechamento correspondente ao filtro. O relatório explicita que os nomes individuais vêm do cadastro consultado e informa diferença entre lista nominal e totais congelados. O esquema atual não congela nomes de alunos.
- Se RLS permite a marcação, mas oculta o cadastro do aluno, o registro autorizado é preservado com nome indisponível e apenas para consulta. Nenhum nome/matrícula oculto é buscado, inventado ou liberado. Sem uma marcação autorizada esse registro não é criado na lista.

## Navegador e responsividade

Foi usada uma fixture local com os componentes reais e SDK/transporte substituídos por dados sintéticos. A configuração de teste aplica CSP e bloqueia transporte de produção; não é a configuração publicada do app.

Foram registradas **80 medições**: oito abas × cinco larguras × dois temas. Larguras: **375, 390, 768, 1024 e 1440px**. As medições registradas não apresentaram overflow horizontal. Os JSONs compactos preservam apenas aba, largura, tema e métricas, sem texto de usuários ou credenciais:

- [Medições no tema claro](attendance-2026-10-11/viewports.json).
- [Medições no tema escuro](attendance-2026-10-11/dark-viewports.json).

O navegador também exercitou presença/ausência, visitante e exclusão, finalizar/revisar turma, fechar/reabrir encontro, consulta e filtros do histórico e PDF. Carregamento de listas foi observado separadamente da medida de largura; ausência de overflow não é comprovação de toda operação de cadastro ou administração.

No cenário sintético de professor, a presença de aluno cujo cadastro está oculto foi mantida em **1/5** com a linha desabilitada e nome indisponível. Marcar um aluno ativo levou a **2/5**. Esses valores são fictícios e verificam apresentação/contagem sem ampliar permissão. Foram gerados e inspecionados PDFs diário, de período e completo (duas páginas) com pessoas fictícias. O PDF diário preservou 4/8 e 50%, além das parcelas 3/5 e 1/3 do fechamento. O ranking passou a usar ordinal Helvetica legível, sem o emoji que saía corrompido. As três exportações usam verde/creme e conservam as cores semânticas de presença/ausência. Uma tentativa de relatório completo revelou a falta da tabela legada ebd_class_visitors apenas no transporte da fixture; após completar esse stub, a exportação pela interface concluiu. Não era defeito reproduzido do backend produtivo.

## Testes e verificações técnicas

A suíte completa final passou: **536/536 testes**, zero falhas e zero ignorados. A verificação de tipos e a compilação de produção também passaram. O build mantém advertências preexistentes de tamanho de chunk e importação dinâmica de sonner; elas não impedem a compilação. Lint dos helpers/PDF passou e os componentes de chamada mantêm duas advertências preexistentes de hooks. Secretaria.tsx conserva nove erros legados de tipagem any no lint (eram treze na base); nenhum novo erro de lint foi introduzido.

Testes novos:

- `tests/ebd-attendance-screen.test.mjs`: handlers reais, visitantes idempotentes, resposta perdida, troca/renovação de acesso, dados do encontro e fechamento limitado do professor.
- `tests/ebd-attendance-report.test.mjs`: gerador real de PDF, resumo fechado, filtro por turma e identificação das limitações nominais.
- `tests/ebd-attendance-summary.test.mjs`: cálculos reais da tela em encontro aberto/fechado, mudança de cadastro, limite de turmas autorizadas e reabertura.
- `tests/ebd-attendance-action-locks.test.mjs`: callbacks reais com promessas controladas, duplo toque, trava compartilhada de fechar/reabrir, erro/retry, PDF e registro sem nome somente para consulta.

Os testes existentes de fila/persistência, snapshots do PDF, histórico e permissões também foram executados. O teste isolado `tests/ebd-history-database.mjs` passou em PGlite com dados fictícios. A prova de duplo callback comparou o handler real da revisão inicial ao novo: antes foram duas chamadas ao pai e o busy terminou em `false` enquanto a primeira estava pendente; depois houve uma chamada e o busy permaneceu `true` até sua conclusão.

Fixture da conferência visual: `tests/fixtures/attendance/bootstrap.ts`, `backend.ts` e `main.tsx`, com `tests/vite.attendance.config.ts`. Atualizações em `tests/ebd-login-performance.test.mjs` e `tests/ebd-pdf-snapshot.test.mjs` mantêm as asserções existentes com os helpers e o setter de fechamento atuais.

## Banco implantado: somente leitura

A conferência do Supabase encontrou **10/10 corpos SQL iguais** à última definição correspondente na fonte, nove tabelas EBD com RLS, dezenove políticas destinadas a `authenticated`, quatro triggers de proteção do dia ativos e vinte e três constraints validadas. As funções conferidas negam execução a `anon`; o professor continua limitado à turma e à sessão válida, sem receber o resumo de outras salas.

No instante da leitura havia **2.602 presenças, 120 visitantes, 23 estados de chamada e 22 fechamentos**. As verificações agregadas retornaram zero duplicidades aluno/data, registros órfãos, estados inválidos, identidades nulas, totais negativos/invertidos e inconsistências internas entre totais de fechamento e suas parcelas por turma. Nenhum nome, PIN, JWT, ID individual ou data de presença foi retornado. Isso confirma consistência estrutural e interna dos snapshots, não a correção pedagógica de uma presença real.

Os logs disponíveis não mostraram 5xx na amostra de borda e não houve ERROR/FATAL PostgreSQL na janela conferida. A amostra não continha requisição EBD identificável pelo caminho; portanto não demonstra uso produtivo de cada fluxo. Duas categorias de advertência transacional não foram atribuídas à chamada sem consultar conteúdo de logs.

O comentário inicial “PROPOSTA NÃO APLICADA EM PRODUÇÃO” em `20261005165755_ipnc_guard_ebd_finalized_class_20261005.sql` está obsoleto: o catálogo e o histórico remoto confirmam o guard forte implantado. A migração não foi alterada nesta revisão. Parte dos testes antigos primeiro documenta o guard histórico de setembro e depois aplica o guard forte; essa comparação não deve ser descrita como teste exclusivo do catálogo final.

## Limites e evidências

Não foi autenticada a interface de produção com um PIN/sessão real. Nenhuma presença, visitante, turma, fechamento, senha, movimentação financeira ou outro dado real foi criado/alterado para validação. Não houve envio de mensagens. Não foram testados aparelho físico, gesto Android, indisponibilidade real de rede, offline físico ou binários do PWA já instalado no celular. O UUID de visitante não é uma fila persistida entre reinícios completos do app.

A logo e o diretório `security-reports` do proprietário foram preservados. Não houve mudança de RLS ou concessão de permissões para a fixture.

Evidências locais desta rodada:

- `/tmp/ipnc-attendance-visual-20261011.md`: implementação visual e travas do componente.
- `/tmp/ipnc-attendance-functional-20261011.md`: revisão funcional, correções e testes de regras.
- `/tmp/ipnc-attendance-catalog-20261011.md`, `/tmp/ipnc-attendance-catalog-20261011.json` e `/tmp/ipnc-attendance-parity-20261011.json`: catálogo, agregados e paridade sem PII.
- `/tmp/ipnc-attendance-functional-repro-20261011.json` e `/tmp/ipnc-attendance-action-lock-repro-20261011.json`: defeitos reproduzidos com transporte sintético.
- `/tmp/ipnc-attendance-qa-20261011/`: medições originais, capturas das abas e PDFs renderizados.
- `/tmp/ipnc-attendance-tests-delivery-20261011.log`: suíte final de 536 testes.
- `/tmp/ipnc-attendance-build-publish-20261011.log`: compilação de produção validada.
- [Chamada no celular — dados fictícios](attendance-2026-10-11/chamada-mobile.png).
- [Chamada no computador — dados fictícios](attendance-2026-10-11/chamada-desktop.png).

A conclusão da entrega depende da revisão final exata, do build validado e da confirmação nativa do deploy no Site existente. Este documento não declara essa publicação concluída.
