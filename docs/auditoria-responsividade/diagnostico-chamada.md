# Diagnóstico da chamada EBD

05/10/2026. Este documento separa o diagnóstico de código, os ensaios isolados e as medições de navegador registradas pela coordenação. Nenhuma presença, turma ou fechamento real foi alterado. O preflight e a pós-verificação remotos consultaram somente metadados. Após autorização específica, o operador Astra Ultra aplicou a substituição do guard; [evidência de aplicação e pós-verificação](propostas/aplicacao-guard-20261005.json).

## Causa observada e mudança

Antes, a chamada aguardava validação de sessão e gravação para trocar a marcação, enquanto um estado global de salvamento bloqueava os demais alunos. A fixture controlada usa 150 ms de validação e 450 ms de escrita. A marcação anterior demorava aproximadamente 606–615 ms, embora algum feedback de botão aparecesse antes. Isso caracteriza espera por I/O no caminho de percepção do toque; não prova lentidão do Supabase publicado.

Agora o clique aceito registra imediatamente uma intenção `queued`/`saving`, com o valor desejado e texto de pendência. A lista de presença e os totais continuam usando somente registros confirmados. Até três alunos por instância de fila avançam em paralelo; os demais aguardam em memória. Outro clique no mesmo aluno/data é recusado enquanto qualquer fila desta aba tem uma operação pendente, inclusive após desmontar a tela ou renovar o acesso. A identidade única do banco é aluno/data; mudar de turma não deve permitir uma segunda requisição simultânea dessa identidade.

Não há fila offline durável, localStorage de intenções nem sincronização entre abas. Trocar de tela descarta intenções ainda não enviadas, mas não cancela requisições já enviadas. O limite de três é por fila: durante troca de escopo, operações antigas e novas de alunos diferentes podem coexistir. A barreira global conserva operações antigas até que seu resultado seja conhecido; isso não equivale a um teto global de três conexões.

## Caminho dos dados

| Ponto | Responsabilidade |
| --- | --- |
| `src/components/secretaria/ChamadaTab.tsx` | Intenção visual por aluno, marcação acessível, pendência/rejeição, desativação do aluno pendente, conferência explícita e ações de finalizar/fechar/PDF. |
| `src/hooks/useEbdAttendanceQueue.ts` | Uma fila por escopo; callbacks só atualizam o escopo ainda correspondente; cleanup descarta não enviados. |
| `src/lib/ebd-attendance-queue.ts` | Estados, concorrência, timeout sem supor cancelamento, leitura de confirmação, barreiras globais, deduplicação e reconciliação por tickets de leitura. |
| `src/lib/ebd-day.ts` | Sessão e autoria UUID, upsert desejado ou update histórico com todos os filtros; classificação rejeitada/desconhecida; leitura autorizada e helpers de fechar/finalizar/reabrir. |
| `src/pages/Secretaria.tsx` | Escopo por acesso/turma/expiração/data; leitura completa protegida contra troca de escopo e merge de presenças confirmadas. |
| `src/components/secretaria/HistoricalChamada.tsx` | Componente remontado com chave sessão/data; sincronização do dia histórico, revisão contra leitura anterior a mudança de status e fila própria. |
| `src/hooks/useEbdSync.ts` | Refetch serializado, evento local/Realtime, foco/online/visibilidade e reconciliação periódica de dez segundos. |
| `src/utils/generateEbdPDF.ts` | Barreira síncrona nas três entradas de PDF para as datas incluídas e conferência do ticket capturado no início da leitura. Não converte consultas separadas em transação no servidor. |

Uma resposta de escrita com linha persistida confirma o aluno. Erro SQL/auth explicitamente classificado como rejeição conserva o valor confirmado anterior e afeta apenas aquele aluno. Falha de transporte ou resposta sem confirmação vira `unknown`: não é sucesso, não é cancelamento e não libera repetição cega. Quando a requisição terminou no cliente, uma leitura autorizada pode confirmar o valor desejado. Leitura diferente ou falha mantém a pendência; não há descarte automático da intenção baseado apenas na ausência temporária da linha.

Tickets `{revision, sequence}` impedem que uma leitura iniciada antes da confirmação desfaça essa confirmação, e que uma leitura antiga entregue depois de uma nova recupere um snapshot ultrapassado. Uma leitura nova iniciada após a confirmação pode refletir uma edição posterior de outro dispositivo. Só linhas confirmadas entram no merge; nenhuma intenção vira registro persistido com ID inventado.

## Falhas reproduzidas na revisão adversarial e corrigidas

1. **Timer de escrita invadia a leitura de confirmação.** Após erro de rede, a consulta automática podia continuar lenta; outra consulta confirmava o registro, mas o timer antigo mudava `confirmed` de volta para `unknown`. O timer agora termina assim que a escrita falha. Uma resposta atrasada de verificação também não confirma duas vezes nem substitui uma leitura posterior. Teste falhou antes e passou depois.
2. **Nova presença durante validação de fechamento.** A barreira era consultada antes de `await ensureEbdSession()`. Uma intenção aceita durante esse await escapava da verificação. Finalização e fechamento agora repetem a barreira imediatamente antes de enviar a operação. Teste executa os helpers reais e comprova ausência de envio.
3. **Duplicata entre filas após renovação/desmontagem.** A instância nova aceitava o mesmo aluno ainda pendente na antiga. A recusa agora usa a barreira global por aluno/data. Outros alunos continuam independentes. Snapshot de pendências permite mostrar/conferir operações antigas somente quando data e IDs de aluno/turma pertencem à tela atual. Linhas retornadas pela conferência só atualizam o componente ainda montado no mesmo escopo.

4. **PDF com snapshot anterior à escrita.** Mesmo com a fila vazia, os três geradores aceitavam dados lidos antes/durante uma gravação e já ultrapassados. Seis testes falharam antes da correção. Agora exigem um ticket capturado antes da leitura, além da barreira de pendências. `readEbdDay` fornece o ticket; a chamada relê o dia antes de gerar; histórico guarda o ticket de seus agregados. Período/trimestre recusam a geração e atualizam dados se o ticket mudou. Consultas de visitantes também verificam erro; nenhuma fórmula de presença ou percentual mudou.
5. **Evento remoto antes do refetch.** Um evento Realtime observado só agendava leitura após 150 ms; nesse intervalo um PDF antigo ainda era aceito. `useEbdSync` invalida o ticket imediatamente. `markEbdDataChanged` apenas incrementa um número; não despacha evento nem causa recursão. Leitura não chama `notifyEbdChange`.
6. **Refetch antigo reabria visualmente status/fechamento.** O callback real de `Secretaria.readData` entregava `aberta`/dia aberto após a confirmação de finalização/fechamento. Dois testes reproduziram a regressão. A leitura captura o ticket antes de iniciar e confere antes de qualquer setter; resposta atravessada por alteração observada é descartada, e o refetch seguinte obtém dados atuais.

A pendência global não fornece nomes: o nome apresentado continua vindo da lista autorizada da tela. A verificação de uma fila antiga usa o cliente/sessão atual e os filtros aluno/turma/data; se o acesso não puder consultar esse registro, ele não é tratado como confirmado. Nenhuma credencial ou regra RLS foi relaxada para recuperar pendências.

Os 20 testes de snapshot/PDF executam jsPDF real em memória, verificam bytes `%PDF-`, texto e preservação de 1/1 = 100%. Também executam callbacks e cálculo de `dayRecords` extraídos do código real por AST TypeScript com promises controladas: leitura antes/durante/depois, agregados de período/trimestre, espera por visitantes e renovação/desmontagem. Isso não é render React nem teste de download/layout. Escopo antigo não publica relatório ou histórico após renovar/desmontar. Fontes, hashes e reproduções: `fundacao-checks/ebd-pdf-snapshot.{json,log}` e logs `*-before.log`.

## Medições locais registradas

Fonte: `evidencias/resumo-latencia.json`; dez amostras por grupo, navegador local com backend substituído. As amostras finais são `chamada-final-8.json` e `chamada-final-150.json`, viewport 390×844 e zoom restaurado com META+0. Percentis usam nearest rank (p95 corresponde ao máximo com n=10). `markMs` mede mudança de `aria-pressed` pelo MutationObserver; `feedbackMs` mede rAF agendado após mutação. São aproximações de resposta visual, não INP de campo nem timestamp físico de apresentação da tela. O baseline já tinha feedback de desabilitação rápido, mas a marcação desejada esperava a escrita.

| Turma | Antes: marcação p50 / p95 | Depois: marcação p50 / p95 | Depois: feedback p50 / p95 | Depois: persistência simulada p50 / p95 |
| --- | --- | --- | --- | --- |
| 8 alunos | 606,3 / 609,2 ms | 1,7 / 2,1 ms | 10,0 / 11,6 ms | 607,2 / 607,7 ms |
| 150 alunos | 613,1 / 614,9 ms | 6,5 / 7,1 ms | 11,6 / 13,5 ms | 611,6 / 613,6 ms |

A meta de 100 ms refere-se à percepção local da intenção, não à persistência remota. Esses registros atendem a meta na fixture medida. A persistência continua sujeita à rede/servidor e não ficou instantânea. São dados de desenvolvimento, sem estatística de produção nem dispositivos móveis reais.

A repetição final inclui a subscription global de pendências e o caminho de relatório atualizado. Foram 33 renders observados em cada série; duração máxima por render de 3,2 ms para 8 alunos e 9,3 ms para 150. `useEbdSync`/`Secretaria.readData` não são montados nessa fixture específica; suas proteções adicionais têm testes de callback, e não uma medição de latência nessa fixture.

## Evidência de integridade e gate

- **Bateria geral congelada:** tipos, 193/193 testes, build e diff-check aprovados. Lint permanece com 298 erros/65 avisos (baseline 316/63); novos avisos só nas fixtures. Fonte e logs em `final-checks/results.json`.
- **54 testes Node/PGlite**, zero falhas: fila/promises, helper de persistência, policies/sessões, histórico, geradores PDF/snapshots, proposta SQL e rollback. Log: `fundacao-checks/ebd-queue-database.log`.
- **29 cenários PostgreSQL nativo**, conexões reais concorrentes e `pg_locks`: baseline/proposta, ambas as ordens de finalizar/escrever e fechar/escrever, primeiro ator abortando, visitantes, três alunos em voo, datas distintas, timeout sem cancelamento, confirmação/retry e reversão. Servidor encerrado e porta fechada. Log/JSON: `fundacao-checks/ebd-postgres-concurrency.*`.
- **Preflight remoto somente leitura:** guard, close/reopen e 13 policies iguais à fixture nativa; quatro triggers habilitados e quatro tabelas com RLS. `propostas/preflight-confirmado.json`.

No baseline anterior à aplicação, a falha de backend já existia: turma `finalizada` sozinha não bloqueava presença autorizada, embora dia fechado bloqueasse. A concorrência de três aumenta a quantidade potencial de writes já enviados frente ao antigo bloqueio de um. Reduzir para um não eliminava essa lacuna entre clientes. O patch homologado `propostas/guard-chamada-finalizada.sql` usa o mesmo lock por dia e acrescenta a recusa de presença/visitante em turma finalizada, inclusive admin, preservando a reabertura explícita e correção histórica.

**Gate SQL atendido.** Após os ensaios locais e a autorização específica, a migration `20261005165755` (`ipnc_guard_ebd_finalized_class_20261005`) concluiu às 16:57:55.949 UTC de 05/10/2026 no projeto Renovo IPNC. A pós-verificação às 16:58:16.066463 UTC confirmou corpo MD5 `617d4fa54312e7ee5305a2c44faa836f`, idêntico ao patch aprovado; a estrutura permaneceu `70a3c96635467d78d1b8e48a4470c8e0`, com OID 25624, owner/ACL/configuração, quatro triggers, quatro tabelas com RLS e 13 policies preservados. Nenhum registro de negócio foi alterado para testar a implantação. Consulte a [evidência de aplicação e pós-verificação](propostas/aplicacao-guard-20261005.json).

O wrapper foi ensaiado em dez cenários locais adicionais: DO único com `SHARE ROW EXCLUSIVE NOWAIT`, recusa diante de writer existente, espera de writer novo, leitores preservados e rollback por erro/timeout (`propostas/ensaio-wrapper/`). Escopo, backup privado e rollback exato continuam em `propostas/rollout-rollback.md`. A confirmação do deploy do frontend é responsabilidade do coordenador, pela ferramenta de status do Sites nesta tarefa; aplicação SQL e deploy do frontend são evidências distintas.

## Limites e próximos cenários de navegador

A renovação/remontagem com pendência órfã foi conferida no navegador: `evidencias/chamada-orfa-renovacao.json`. A tela manteve o aluno e finalizar/fechar bloqueados, depois conferiu 1/8 presentes com uma única gravação; a leitura anterior de 5 segundos não desfez a confirmação. É renovação sintética da fixture, sem autenticação real. As provas de promises/SQL e essa interação não cobrem todos os cenários de navegação/leitor de tela. Permanecem como complementos visuais:

- Abrir o histórico do mesmo dia enquanto a chamada atual salva; segundo clique do mesmo aluno deve continuar bloqueado entre filas. Trocar para outra data deve manter dados/pendências separados.
- Desmontar com três em voo e outros aguardando: somente os enviados podem completar; os aguardando não devem reaparecer como writes.
- Exibir no navegador principal o descarte de leitura atrasada de **status/fechamento**. A regressão do callback real está reproduzida e corrigida em Node; a fixture de latência não monta esse callback.
- Conferir o download/layout do PDF e o aviso de atualização em interação completa; os geradores e agregados antigos atravessando gravação já são recusados pelos testes isolados reais.
- Confirmar foco e anúncio acessível de “aguardando”, “não salvo” e “sem confirmação”, inclusive com zoom, teclado virtual e orientação paisagem.

A fixture de latência substitui chamadas de PIN/status/fechamento; não demonstra JWT emitido, PostgREST, Realtime ou PIN incorreto contra serviço isolado legítimo. A indisponibilidade real de transporte antes do acknowledgement de COMMIT também não foi reproduzida; a perda de resposta no PostgreSQL local foi controlada e documentada.

A revisão local é uma versão da aba incrementada por mutações locais e eventos remotos observados. Não é snapshot MVCC do servidor nem garante detectar alteração remota sem evento entregue antes da geração. As consultas continuam sujeitas ao isolamento e às permissões existentes; o lock de fechamento/finalização é uma garantia distinta, descrita na proposta SQL.
