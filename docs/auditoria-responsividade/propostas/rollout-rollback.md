# Proposta de implantação e reversão do guard EBD

Estado atual em 05/10/2026: **autorizada pelo proprietário, aplicada às 16:57:55 UTC e verificada às 16:58:16 UTC**. Somente `ipnc_private.guard_ebd_day()` foi substituída, na migration `20261005165755`, projeto `xhhfgnkpgtnzlvpvqjpl`. Nenhum registro de negócio real foi consultado ou modificado. O gate SQL está atendido; o deploy do frontend é confirmado separadamente pelo resultado nativo do Sites nesta tarefa.

O fechamento técnico anterior (`0311666`) registrava corretamente o patch ainda não autorizado/aplicado. Seus JSONs, SQL aprovado e resultados datados foram preservados. A autorização posterior foi “Publique todas as alterações feitas anteriormente”, em resposta ao fechamento que identificava este patch específico como único gate. [Registro da aplicação e pós-verificação](aplicacao-guard-20261005.json).

## Problema e escopo exato

O SQL atual permite que uma gravação autorizada de presença/visitante termine após outra sessão marcar a turma como `finalizada`. O guard atual verifica dia fechado e identidade; falta conferir a finalização da turma. O teste PGlite demonstra essa aceitação antes da proposta e sua rejeição depois dela.

Alvo confirmado pelo conector às 15:47:26 UTC de 05/10/2026: **Renovo IPNC**, projeto `xhhfgnkpgtnzlvpvqjpl`, região `sa-east-1`, `ACTIVE_HEALTHY`, PostgreSQL 17.6. A identidade deve ser reconferida imediatamente antes de qualquer escrita autorizada. Objeto único a substituir: `ipnc_private.guard_ebd_day()`, função trigger sem argumentos. Fonte aprovada: [guard-chamada-finalizada.sql](guard-chamada-finalizada.sql). Durante a homologação permaneceu fora de `supabase/migrations`. Após a aplicação autorizada, foi copiada sem alteração de bytes para `supabase/migrations/20261005165755_ipnc_guard_ebd_finalized_class_20261005.sql`, espelhando o ID/nome registrado remotamente. O espelho contém somente a definição portável; o [wrapper realmente executado](aplicacao-guard-20261005-wrapper.sql) conserva separadamente os asserts específicos do alvo. Ambos executam a mesma definição aprovada. O espelho não foi reaplicado; não executar push/replay histórico para esta entrega.

SHA-256 do arquivo proposto nesta revisão:

```text
6dda7555722caf4d3e343476515a21b85f6191e21e8b6c8331eeda56e8e3b1f6
```

A mudança consulta `ebd_call_status` para a turma/data e rejeita INSERT/UPDATE/DELETE de `ebd_attendance` e `ebd_class_visitor_entries` quando a turma está `finalizada`. O advisory lock existente por dia é obtido antes da leitura do status. O próprio UPDATE de `ebd_call_status` já usa o mesmo guard/lock; reabrir a turma continua permitido pelas policies existentes. Ausência de status continua com o comportamento anterior; a proposta não passa a exigir `aberta` para registros legados sem status.

São preservados: assinatura e OID da função, dono, ACL, `SECURITY DEFINER`, `search_path = ''`, lock por dia, regras de dia fechado, identidade imutável e correção administrativa de aluno transferido/inativo. A proposta não contém `GRANT`, `REVOKE`, criação/remoção de policy ou trigger, mudança de tabela/schema, abertura de turma/dia, alteração de sessão/PIN ou UPDATE/INSERT/DELETE de dados. Não modifica funções financeiras, fechamento/reabertura ou cálculos.

## Evidência local e preflight concluídos

Comando reproduzido:

```sh
node --experimental-strip-types --test tests/ebd-attendance.test.mjs tests/ebd-attendance-queue.test.ts tests/ebd-permissions-database.test.mjs tests/ebd-history-database.mjs tests/ebd-pdf-snapshot.test.mjs
```

Resultado atual: **54 testes aprovados, zero falhas/ignorados**, código 0. Log: [ebd-queue-database.log](../fundacao-checks/ebd-queue-database.log). O teste PostgreSQL usa DDL mínimo privado, bloco EBD original de 05/09, migration de sincronização de 20/09 e correção histórica de 27/09. Só depois aplica a proposta, na mesma instância efêmera. Confirma:

- RLS, turma/data, validade/revogação/renovação de sessão e isolamento mantidos.
- Rejeição de presença e visitante com turma finalizada, inclusive administrador.
- Reabertura explícita da turma permite alteração; dia fechado continua bloqueado.
- Correção histórica e totais/visitantes do fechamento preservados.
- OID, dono, ACL, `SECURITY DEFINER` e `search_path` iguais antes/depois.
- Rollback restaura `prosrc` exatamente ao baseline e conserva privilégios e registros de fechamento.

Após autorização específica para preparar um runtime portátil, foram executados **29 cenários aprovados** em PostgreSQL nativo 17.10, com duas conexões concorrentes e uma observadora; o cenário de três saves usa quatro atores. [Log integral](../fundacao-checks/ebd-postgres-concurrency.log), [resultados e locks observados](../fundacao-checks/ebd-postgres-concurrency.json), [script reproduzível](../../../scripts/test-ebd-postgres-concurrency.mjs), [fixture compartilhada](../../../tests/fixtures/ebd-database.mjs).

O ensaio constatou `pg_locks.granted=false`, chave `1869639283`, PID bloqueador e `wait_event=advisory` antes de soltar cada transação. Cobriu ambas as ordens de finalizar/escrever e fechar/escrever antes/depois do patch, COMMIT e ROLLBACK do primeiro ator, visitantes/fechamento, três presenças em voo, datas distintas, sessão expirada/inválida e outra turma, reabertura explícita, timeout da aplicação sem cancelamento, leitura autoritativa após resposta descartada e retry idempotente. Após COMMIT da finalização, o baseline aceitou a presença; a proposta retornou `P0001`/“Chamada finalizada” sem inserir linha. Fechamento aguardando write confirmado incorporou exatamente a presença/visitante.

O runtime comunitário [embedded-postgres](https://github.com/leinelissen/embedded-postgres), com binários derivados do upstream Zonky, foi obtido do registry npm com versões fixadas `@embedded-postgres/darwin-arm64@17.10.0-beta.17` e `pg@8.23.1`. Não é uma distribuição binária oficial do projeto PostgreSQL. Integridade SRI e origem constam em [postgres-portatil-proveniencia.json](postgres-portatil-proveniencia.json). Instalação limitada a `/tmp/ipnc-pg-concurrency-oo6viwdt`, sem alteração de dependências/lock do aplicativo, serviço global ou usuário de sistema. Scripts de instalação ficaram desabilitados; foi inspecionado e executado apenas o script que recria 17 symlinks internos. O servidor usou `127.0.0.1`, porta efêmera, SCRAM com senha aleatória e socket privado. O encerramento `pg_ctl -m fast -w stop`, ausência de PID e porta fechada estão registrados. A descoberta inicial sem PostgreSQL instalado continua como evidência histórica, não como bloqueio atual.

Reprodução com o runtime temporário existente:

```sh
node scripts/test-ebd-postgres-concurrency.mjs /tmp/ipnc-pg-concurrency-oo6viwdt
```

O script rejeita runtime fora de `/tmp`, não aceita connection string e sempre encerra o cluster no bloco `finally`. Somente registros sintéticos são criados. A perda de resposta é controlada: resultado descartado pela aplicação após COMMIT e socket encerrado antes do retry. Isso não reproduz perda arbitrária de pacote antes do acknowledgement de COMMIT, PostgREST, JWT emitido pelo Auth nem Realtime. O teste usa READ COMMITTED e versão local 17.10; o alvo inspecionado usa 17.6. Os corpos do guard/fechamento/reabertura e as 13 policies inspecionadas foram comparados à fixture nativa e são iguais.

## Preflight somente leitura

A inspeção autorizada já foi executada com transação `READ ONLY`; resumo em [preflight-confirmado.json](preflight-confirmado.json). O guard tem OID `25624`, dono `postgres`, ACL apenas `postgres=X/postgres`, definer e `search_path` vazio. Os quatro triggers esperados estão habilitados; as quatro tabelas têm RLS; as 13 policies coincidem com a fixture. Antes da implantação, repetir [preflight-guard-chamada-finalizada.sql](preflight-guard-chamada-finalizada.sql). O script abre transação somente leitura e consulta metadados/definições; não seleciona alunos, presença, PIN ou qualquer valor de cadastro.

Antes de aprovar a substituição, conferir:

1. Projeto correto e função existente, sem argumentos, retorno `trigger`, linguagem `plpgsql`, definer e `search_path` vazio.
2. Corpo equivalente ao guard da migration `20260927121700_ebd_historical_attendance.sql`. O MD5 de `prosrc` do baseline local é `13c4f019011f3d0e3f6c0f8b0b0eac8a`. MD5 aqui identifica texto, não é mecanismo de segurança. Qualquer diferença exige comparar a definição e integrar a mudança recente; não sobrescrever automaticamente.
3. Triggers `BEFORE INSERT OR UPDATE OR DELETE`, por linha, habilitados, nas quatro tabelas: `ebd_attendance`, `ebd_class_visitor_entries`, `ebd_day_closures`, `ebd_call_status`. Qualquer consumidor extra ou trigger ausente/desabilitado exige revisão.
4. RLS e policies atuais correspondentes preservadas. A função mantém seu ACL; não conceder acesso direto ao schema privado nem executar a função por cliente.
5. `ebd_close_day(date)` e o guard ainda usam a mesma chave `pg_advisory_xact_lock(1869639283, (data - date '2000-01-01')::integer)`. O fechamento mantém sua verificação administrativa e snapshot sob lock.

O backup integral desta inspeção está no diretório privado `/tmp/ipnc-pg-concurrency-oo6viwdt/preflight-private` (diretório 0700; arquivos 0600). `rollback-live-guard.sql` contém a definição exata retornada pelo alvo, com terminador SQL, SHA-256 `b54b66e01e14ac6ceace4ea936327e63bdcd8226fe3c96bd2817a1b5f1a41be2`. Uma cópia privada foi preservada em `/Users/octavioribeiroleite/.cache/ipnc-auditoria-responsividade/preflight-20261005T154726Z`, com o mesmo hash e permissões. Usar essa cópia na implantação; `/tmp` pode ser limpo pelo sistema. Não expor connection strings, tokens ou PINs.

Guardar novamente antes da escrita a saída **integral** de `pg_get_functiondef`, OID, dono, ACL, configurações, definições dos triggers e policies em artefato privado de implantação, com data/revisão. Não salvar conteúdo de `.env`, conexão, token ou PIN no repositório. A definição retornada pelo banco é a fonte de rollback do alvo; o arquivo local de rollback só é utilizável se sua equivalência ao alvo tiver sido verificada.

## Matriz de concorrência homologada localmente

O ensaio descrito acima usou banco descartável, definições/policies da fixture e sessões distintas, `lock_timeout=5s` e `statement_timeout=10s`. Nenhum banco remoto foi usado para ensaiar disputas ou writes.

Resultados obtidos antes e depois da proposta:

| Ordem controlada | Sessão A | Sessão B enquanto A não confirmou | Resultado observado depois da proposta |
|---|---|---|---|
| Finalizar primeiro | BEGIN; UPDATE status para `finalizada`; manter transação aberta | Tentar alterar presença da mesma turma/data | B aguarda o lock; após COMMIT de A, B recebe `P0001`/“Chamada finalizada” e não altera a linha |
| Escrever primeiro | BEGIN; alterar presença; manter transação aberta | Tentar finalizar mesma turma/data | B aguarda; após COMMIT de A, finalização é aceita e presença confirmada permanece |
| Fechar dia primeiro | BEGIN; `ebd_close_day(data)`; manter transação aberta | Tentar alterar presença/visitante | B aguarda; após COMMIT de A, escrita recebe “Dia fechado” |
| Escrever antes de fechar | BEGIN; alterar presença/visitante; manter aberta | `ebd_close_day(data)` | Fechamento aguarda e inclui a gravação que confirmou antes dele |
| Primeiro escritor aborta | Repetir cada caso, terminando A com ROLLBACK | Mesma tentativa de B | B respeita o estado realmente confirmado, sem supor que a ação abortada ocorreu |
| Datas distintas | Segurar lock/data A | Alterar presença/data B permitida pelo perfil | Ausência de bloqueio pelo advisory lock de outra data; observar outros locks separadamente |

As sessões de professor/admin, expiração/fingerprint inválido e isolamento de turma foram exercitados também no PostgreSQL nativo. A fixture PGlite cobre adicionalmente rotação/desativação do PIN e correção histórica. No cenário de três presenças em voo, a finalização primeiro fez as três aguardarem e serem recusadas; com as três writes enfileiradas antes, todas confirmaram antes da finalização. Timeout da aplicação não cancelou o comando PostgreSQL pendente.

## Implantação transacional executada após autorização

O novo preflight às 16:54:59 UTC confirmou baseline idêntico, OID `25624`, quatro triggers/RLS, 13 policies e funções de fechamento/reabertura sem divergência. Não havia locks EBD na fotografia. O backup exato foi salvo em `/Users/octavioribeiroleite/.codex/deployment-backups/ipnc/2026-10-05/20261005T165459Z`, diretório 0700 e arquivos 0600, mesmo SHA-256 `b54b66e01e14ac6ceace4ea936327e63bdcd8226fe3c96bd2817a1b5f1a41be2` para `rollback-live-guard.sql`.

A janela de escrita foi protegida mecanicamente: um único bloco `DO` obteve `SHARE ROW EXCLUSIVE NOWAIT` nas quatro tabelas, em ordem fixa, e recusaria advisory locks EBD de outra sessão. A fotografia do preflight não foi usada como garantia de exclusão. Não houve cancelamento de sessão nem retry automático. O bloco validou novamente o baseline e o fingerprint integral de metadados, executou os bytes exatos do SQL aprovado e verificou corpo/metadados antes de terminar. `transaction_timeout=5s` limita a operação no PostgreSQL 17; `lock_timeout=5s`, `statement_timeout=30s` e `idle_in_transaction_session_timeout=5s` foram locais. O timeout de statement configurado dentro do DO é suplementar, não a garantia temporal do statement já iniciado.

O DO não contém COMMIT próprio, preservando a transação externa do serviço de migrations. Atomicidade do DO, falha pós-DDL, rollback por timeout, leitor concorrente, writer prévio/novo e transação externa foram ensaiados localmente: [10/10 cenários](ensaio-wrapper/README.md). O conteúdo executado exato está no backup privado `apply-authorized-guard.sql`, SHA-256 `4d4e3334cdee3782c285ebdc50050b434d9f572748febe4f429c27605f45a9fe`. O comentário antigo “não aplicada” no SQL aprovado foi preservado para conservar seu hash; este registro datado documenta a aplicação.

A ferramenta `apply_migration` retornou sucesso e o histórico confirmou `20261005165755_ipnc_guard_ebd_finalized_class_20261005`. Pós-preflight somente leitura às 16:58:16 UTC: corpo exatamente igual ao patch, MD5 `617d4fa54312e7ee5305a2c44faa836f`; fingerprint de estrutura `70a3c96635467d78d1b8e48a4470c8e0` igual antes/depois, incluindo todos os atributos de `pg_proc` exceto `prosrc`, triggers, RLS, policies e definições de fechar/reabrir. Nenhum lock EBD residual. Não houve escrita de negócio para smoke test.

Os advisors repetidos após DDL mantiveram os mesmos achados; apenas `observed_at` mudou: cinco INFO de [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), dois WARN de [definer executável por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), cinco WARN de [definer executável por authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) e um WARN de [proteção de senha vazada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). São preexistentes; nenhuma correção fora do escopo foi aplicada.

A documentação atual de [Database Functions](https://supabase.com/docs/guides/database/functions), [CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html), [LOCK](https://www.postgresql.org/docs/17/sql-lock.html) e o [changelog de 25/09/2026](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) foram revisados. O alvo permaneceu 17.6; não houve upgrade de engine/extensões nem mudanças relacionadas aos itens do changelog.

### Roteiro original de homologação (histórico)

O exemplo abaixo registra a preparação inicial. Na execução pelo conector, o DO atômico descrito acima substituiu o envelope BEGIN/COMMIT para não terminar a transação externa do serviço.

Usar a conexão administrativa autorizada para esta escrita, sem expor credenciais, e executar uma única transação. Pelo conector Supabase, DDL deve usar `apply_migration` para esta substituição específica; o registro dessa migration no histórico é esperado, sem reaplicar o histórico inteiro. No `psql`, `\ir` abaixo resolve o arquivo no diretório deste roteiro; por API SQL, enviar o conteúdo integral do arquivo entre `BEGIN` e `COMMIT` na mesma transação. Não usar `supabase db push` nem reaplicar migrations históricas.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- Confirmar existência/baseline novamente na conexão de implantação.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = to_regprocedure('ipnc_private.guard_ebd_day()')
      AND md5(prosrc) = '13c4f019011f3d0e3f6c0f8b0b0eac8a'
  ) THEN
    RAISE EXCEPTION 'Guard divergente do baseline revisado; interromper e reconciliar.';
  END IF;
END;
$$;
\ir guard-chamada-finalizada.sql
COMMIT;
```

Não alterar grant/owner para fazer o comando passar. Se houver timeout, divergência ou erro, a transação deve terminar em ROLLBACK; inspecionar o motivo antes de qualquer nova tentativa. Se a definição vigente diferir legitimamente do baseline, preparar e revisar outro patch com rollback correspondente antes de substituir esse roteiro.

Após COMMIT, repetir o preflight somente leitura e comparar OID/dono/ACL/configuração/triggers/policies com o backup; a única diferença prevista é o corpo do guard. Nenhum dado real deve ser alterado como teste de fumaça. Validar a interação de reabertura/erros em homologação e conferir a versão UI publicada pelo fluxo próprio; o sucesso deste SQL não equivale a deploy do Site.

## Rollback exato e riscos

[rollback-guard-chamada-finalizada.sql](rollback-guard-chamada-finalizada.sql) contém apenas a definição original do guard extraída literalmente de `20260927121700_ebd_historical_attendance.sql`. O teste verifica igualdade do `prosrc` após aplicá-la. SHA-256 do arquivo:

```text
952da3f1ca52afe4922fcf6dbc55e48f2d62379f7d4a61b5d1f9e860d9880306
```

Se o preflight confirmou esse baseline, o rollback autorizado é:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
\ir rollback-guard-chamada-finalizada.sql
COMMIT;
```

Se o alvo tinha definição diferente, usar o **backup exato de `pg_get_functiondef` do alvo** em vez do rollback local. Antes da reversão, confirmar que nenhuma mudança posterior foi aplicada à função; não apagar uma evolução mais recente. Repetir metadados somente leitura depois de COMMIT.

Rollback não desfaz presenças nem reabre dias/turmas. Ele reintroduz a lacuna que permite escrita em turma finalizada; reduzir a fila de três para uma não elimina essa lacuna. Enquanto revertido, não alegar proteção entre sessões e evitar liberar o fluxo como integralmente validado.

A mudança exige uma ação explícita **Reabrir chamada da turma**, inclusive no histórico após reabrir o dia; `ebd_reopen_day` preserva o status existente (inclusive `aberta`) e cria `finalizada` apenas quando não havia registro da turma/data. A turma que já estava finalizada continua exigindo reabertura explícita. A UI já oferece a reabertura de turma, mas esse percurso precisa ser homologado. Writes já em voo podem ser recusados depois que a finalização confirmar; a UI deve reverter só o aluno afetado e manter os demais. A proposta não cria protocolo de armazenamento offline nem resolve conflitos de última escrita entre duas sessões quando a turma permanece aberta.

**Gate SQL atendido:** autorização, novo preflight, backup durável, aplicação do único guard e verificação dos metadados concluídos em 05/10/2026. A proteção é a mesma homologada localmente; não houve teste autenticado com registros reais. A confirmação do frontend corresponde ao deploy nativo do Sites nesta tarefa. Para rollback futuro, preferir o backup exato de implantação acima e conferir ausência de alterações posteriores; a reversão reintroduz a lacuna descrita neste documento.
