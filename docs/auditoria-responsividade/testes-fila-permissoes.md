# Testes locais da fila e das permissões EBD

05/10/2026. Os testes descritos usam Node e PostgreSQL efêmero/PGlite, com identificadores e registros sintéticos. Não houve gravação de presença real. Em etapa posterior e autorizada, a coordenação aplicou somente o guard no projeto identificado; preflight e pós-verificação leram metadados/definições, sem registros de negócio ou credenciais. Consulte a [evidência de aplicação e pós-verificação](propostas/aplicacao-guard-20261005.json).

## Resultado executado

```sh
node --experimental-strip-types --test tests/ebd-attendance.test.mjs tests/ebd-attendance-queue.test.ts tests/ebd-permissions-database.test.mjs tests/ebd-history-database.mjs tests/ebd-pdf-snapshot.test.mjs
```

Resultado atual, incluindo reversão: **54 testes aprovados, zero falhas/ignorados**, código 0. Saída integral: `fundacao-checks/ebd-queue-database.log`. O arquivo histórico executável conta como um teste no runner, embora contenha várias asserções. Os tempos do runner não medem toque, pintura, RPC real, INP nem p50/p95.

`tests/ebd-attendance-queue.test.ts` executa a fila real com promises controladas. Cobre feedback de estado síncrono antes da resposta, marcar/desmarcar com ID persistido, limite de três saves simultâneos, fila dos demais alunos, recusa de clique repetido do mesmo registro, independência de data/turma, rejeição de somente um aluno, resposta perdida consultada sem novo save, consulta inconclusiva/falha, timeout sem cancelamento implícito, descarte dos não enviados no dispose, ausência de callback de confirmação para a tela desmontada, barreira para fechamento/relatório e cancelamento dos não enviados após observar finalização remota.

A reconciliação cobre leituras iniciadas antes/durante/depois da escrita, leitura nova terminando antes da antiga e alteração remota posterior prevalecendo sem ser desfeita por uma resposta antiga. Os tickets são usados como valores opacos; os testes verificam a lista resultante. A suite da fila testa a barreira de domínio; a suite adicional `ebd-pdf-snapshot.test.mjs` executa os geradores PDF reais em memória.

`tests/ebd-attendance.test.mjs` executa o helper real de persistência com cliente isolado. Além das verificações anteriores de UUID, autoria, `student_id,date` e filtros de update histórico, agora cobre troca de usuário/token e logout entre a captura da sessão e a validação, ausência de save se validar sessão falhar, distinção entre rejeição explícita SQL/auth e confirmação desconhecida, resposta sem dados e nenhuma notificação de sucesso em erro. Tokens desse teste são strings sintéticas, não credenciais.

`tests/ebd-pdf-snapshot.test.mjs` tem 20 testes: jsPDF real com save interceptado, bytes/texto conferidos, barreiras nas três entradas e leitura antes/durante/depois de escrita. Executa callbacks de `readEbdDay`, `fetchHistory`, `Secretaria.readData`, cálculo de `dayRecords` e handlers de período/trimestre extraídos do código fonte real por AST. Usa promises/cliente/setters controlados, sem render React. PDF antigo é recusado mesmo após fila vazia; dados recentes mantêm 1/1=100%; alteração durante consulta de visitantes bloqueia relatório; escopo renovado/desmontado não publica dados/arquivo; evento Realtime observado invalida antes do debounce; resposta antiga não reabre status/dia. Reproduções pré-correção: seis falhas PDF, uma Realtime e duas Secretaria. Registro/hashes: `fundacao-checks/ebd-pdf-snapshot.json`. Não prova layout/download no navegador nem snapshot transacional diante de alteração remota ainda não observada.

## Integração PostgreSQL e limites da fixture

O teste antigo `tests/ebd-history-database.mjs` usa `ebd_is_admin()` substituído por uma configuração de teste e policy administrativa genérica. Continua útil para contagem/histórico/reabertura, mas não demonstrava autorização de professor ou validade da sessão PIN.

O novo `tests/ebd-permissions-database.test.mjs` cria DDL mínimo compatível, habilita RLS como pré-requisito do baseline privado e executa:

1. O bloco original de sessão/EBD de `20260905111555_portal_sessions_and_compatibility.sql`, sem modificar seus helpers, grants, policies ou triggers. O bloco termina antes de `-- Birthday names/month/day`; demais módulos da migration são explicitamente excluídos.
2. `20260920152545_ebd_live_sync.sql`, integral.
3. `20260927121700_ebd_historical_attendance.sql`, integral.

Não são reaplicadas migrations históricas com policies públicas nem o baseline inteiro que exige 49 tabelas. Schemas Auth e claims simulam o gateway confiável; o teste não assina JWTs, não executa PostgREST, Edge Function de PIN, bcrypt ou rate limit. `extensions.digest` usa SHA-256 nativo do PGlite para o fingerprint. A biblioteca Auth, a renovação HTTP e PIN errado precisam de integração separada; fingerprint incompatível não equivale a teste da tela/endpoint de PIN errado.

O teste confirma negação anônima, professor restrito à turma e ao dia atual, outra turma invisível/imutável, sessão expirada, fingerprint inválido, namespace errado, perfil inativo, claims somente em `user_metadata` sem acesso, rotação/desativação do PIN revogando a sessão anterior, renovação sem ampliar turma, unicidade e identidade histórica imutável. Fechamento retorna totais coerentes; escrita posterior é negada; professor só recebe a projeção restrita do fechamento; reabertura exige administrador e ID atual.

A documentação oficial de [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) foi consultada para distinguir privilégio de tabela, SELECT/UPDATE e contexto de funções. O [changelog](https://supabase.com/changelog) de 01/10/2026 e o aviso de [PostgreSQL 15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) foram inspecionados; não houve alteração de versão/extensão no projeto. O conjunto de testes isolados não incluiu advisor remoto; a aplicação específica e sua pós-verificação de metadados estão registradas separadamente abaixo.

## Limitação do baseline, homologação e aplicação específica

**No baseline anterior à aplicação, finalizar uma turma não bloqueava uma gravação direta autorizada.** O teste da fase baseline marca `ebd_call_status='finalizada'` e comprova a aceitação do upsert. O guard original protegia dia fechado e identidade, mas não lia a finalização da turma. Essa falha preexistia à fila; a fase posterior do teste e a aplicação descrita abaixo usam o guard corrigido.

O limite de três saves aumenta o máximo de operações já enviadas desse cliente em relação ao bloqueio global anterior de uma. Se outra sessão finalizar a turma, até três operações já enviadas podem alcançar o servidor antes da UI observar o evento. Reduzir para uma diminuía a quantidade, mas mantinha a lacuna do guard original. Cancelar a fila só impede os ainda não enviados; abortar a requisição não cancela uma escrita já aceita no servidor.

A proposta `propostas/guard-chamada-finalizada.sql`, inicialmente fora de `supabase/migrations` e depois espelhada na migration `20261005165755`, acrescenta a verificação de `finalizada` ao guard existente, mantendo o mesmo advisory lock por dia. Na etapa inicial, ela foi aplicada **somente em PGlite e PostgreSQL nativo locais descartáveis**; a aplicação remota específica ocorreu depois da autorização e está registrada abaixo. O teste então confirma rejeição de presença e visitante após finalização para professor e administrador, reabertura explícita da turma permitindo alteração, exclusão de visitante bloqueada enquanto finalizada, correção histórica de aluno transferido/inativo preservada e snapshot de fechamento coerente.

Também foi testado o rollback literal do guard baseline, mantendo OID, dono, ACL, definer, `search_path` e registros de fechamento. O plano revisável, preflight somente leitura concluído, backup privado e ensaio PostgreSQL nativo estão em `propostas/rollout-rollback.md`.

O dia já possui lock comum para escrita e fechamento. Além das duas ordens sequenciais no PGlite, foram executados **29 cenários com conexões PostgreSQL nativas simultâneas**, com dados sintéticos e runtime somente em `/tmp`. O script `scripts/test-ebd-postgres-concurrency.mjs` compartilha o setup de `tests/fixtures/ebd-database.mjs`, usa READ COMMITTED, confirma espera real por `pg_locks` e encerra o servidor em `finally`. Cobertura e JSON: `fundacao-checks/ebd-postgres-concurrency.{log,json}`. Baseline aceita write após finalização; proposta rejeita após espera. COMMIT/ROLLBACK do primeiro ator, fechamento/presença/visitante nas duas ordens, três saves em voo, datas distintas, outra turma, sessão expirada/inválida, reabertura e rollback exato aprovados. O encerramento limpo e porta fechada foram verificados.

O ensaio de timeout mantém o comando SQL pendente, libera o lock, confirma a persistência por outra conexão e descarta o resultado na camada de aplicação; depois encerra o socket e repete o upsert desejado. O ID permanece o mesmo e há uma linha. Isso prova idempotência e recuperação do estado no caso controlado; não reproduz transporte HTTP/PostgREST nem perda de pacote antes do acknowledgement do COMMIT.

Preflight autorizado às 15:47:26 UTC: projeto Renovo IPNC `xhhfgnkpgtnzlvpvqjpl`, PostgreSQL 17.6. A fixture nativa usa 17.10. Naquele preflight inicial, guard/fechamento/reabertura tinham corpos idênticos ao baseline da fixture; 13 policies foram comparadas iguais, com quatro triggers habilitados e quatro tabelas com RLS. O alvo permanecia inalterado nessa etapa de leitura. Resumo e hash do backup privado estão em `propostas/preflight-confirmado.json`; origem/SRI do runtime em `propostas/postgres-portatil-proveniencia.json`.

Reabertura do dia preserva qualquer status existente e cria `finalizada` apenas se não existia. Uma turma previamente finalizada continua exigindo sua reabertura explícita; uma que estava aberta permanece aberta. Os testes não atribuem à proposta uma alteração dessa regra.

**Gate SQL atendido após aplicação autorizada.** A migration `20261005165755`, nome `ipnc_guard_ebd_finalized_class_20261005`, concluiu às 16:57:55.949 UTC de 05/10/2026. A pós-verificação às 16:58:16.066463 UTC confirmou corpo MD5 `617d4fa54312e7ee5305a2c44faa836f` idêntico ao aprovado e estrutura MD5 `70a3c96635467d78d1b8e48a4470c8e0` inalterada: OID 25624, owner/ACL/configuração, quatro triggers, quatro tabelas com RLS e 13 policies preservados. Nenhum dado de negócio foi movimentado para validar a aplicação. Veja a [evidência de aplicação e pós-verificação](propostas/aplicacao-guard-20261005.json).

Antes da aplicação, o wrapper adicional aprovou **10/10 cenários locais**, incluindo DO único/SRX NOWAIT, writer existente recusando lock, writer novo aguardando, leitores permitidos, erro após DDL com rollback, transação externa preservada e transaction_timeout eficaz dentro do DO. O servidor foi encerrado e a porta fechada; `propostas/ensaio-wrapper/`. Esses dez cenários são distintos dos 29 testes nativos de comportamento e dos 54 testes dirigidos Node/PGlite. A garantia decorre do guard aplicado e de seu lock comum; concorrência igual a um, isoladamente, continuaria sendo mitigação parcial.

## Pendências explícitas

- Navegador: a coordenação mediu toque/feedback em fixture e aprovou unknown após renovação/remontagem (`evidencias/chamada-orfa-renovacao.json`). Leitor de tela, telefone/tablet físico e todas as combinações de perfil/data/turma não são provados pelos testes Node.
- Serviço real isolado: PIN errado, JWT emitido/renovado, revogação durante HTTP, PostgREST e Realtime com perfis legítimos sintéticos.
- Transporte/API: perda real de resposta HTTP, renovação Auth e eventos Realtime continuam fora do ensaio de sockets/SQL local; a concorrência PostgreSQL real já foi coberta.
- Publicação do frontend: o coordenador confirma o deploy pela ferramenta de status do Sites nesta tarefa. Os testes isolados e a aplicação SQL documentada não substituem essa confirmação.
