# Ensaio local do wrapper de implantação

05/10/2026, concluído às 16:56:20 UTC. A autorização específica de aplicação foi comunicada pela coordenação; este subagente executou apenas o ensaio local. O operador remoto Astra Ultra posteriormente confirmou aplicação/pós-verificação em [registro próprio](../aplicacao-guard-20261005.json). Este ensaio preserva seu alcance local e não constitui essa confirmação. Nenhum arquivo de produção foi editado neste ensaio.

**10/10 cenários aprovados** no PostgreSQL portátil 17.10 já autorizado, em novo cluster descartável, loopback, SCRAM e dados sintéticos. O processo foi encerrado e a porta fechada. O script exato está arquivado em `script-local.mjs.txt`; a cópia executada foi `/tmp/ipnc-pg-concurrency-oo6viwdt/test-wrapper.mjs`. Usa fixture do aplicativo por caminho absoluto desta tarefa. Logs/resultados: `wrapper.log`, `wrapper-resultados.json`.

- Writer já em transação: `SHARE NOWAIT` recusou com `55P03`; função intacta e writer pôde confirmar.
- Leitor `SELECT` já aberto: continuou consultando durante o wrapper.
- Writer novo: aguardou `RowExclusiveLock` observado em `pg_locks`, terminou depois do commit e manteve uma linha.
- Baseline divergente: abortou antes do DDL.
- Falha deliberada depois de `CREATE OR REPLACE`: rollback restaurou corpo, OID, owner, ACL, configuração, triggers, policies e RLS.
- Dois `SHARE` coexistem; dois `SHARE ROW EXCLUSIVE` não coexistem. O segundo SRX/NOWAIT recusou imediatamente.
- **DO único com SRX/NOWAIT**, sem BEGIN/COMMIT internos: erro posterior ao DDL reverteu a transação implícita inteira.
- O mesmo DO dentro de transação externa não publicou prematuramente: outra conexão só viu o novo corpo depois do COMMIT externo.
- `transaction_timeout` local configurado **dentro do DO** foi efetivo: 100 ms + pausa artificial de 300 ms retornou `25P04`, encerrou a conexão e reverteu o DDL. A pausa só existe nesse teste sintético.

Corpo baseline MD5 `13c4f019011f3d0e3f6c0f8b0b0eac8a`; corpo proposto MD5 `617d4fa54312e7ee5305a2c44faa836f`. O SQL aprovado foi embutido integralmente em dollar quote para `EXECUTE`. SHA-256 do arquivo aprovado permanece `6dda7555722caf4d3e343476515a21b85f6191e21e8b6c8331eeda56e8e3b1f6`. Os fingerprints de metadados do cluster local contêm OIDs/owner locais e **não podem ser usados como fingerprint do alvo**.

## Revisão do protocolo

`SHARE` basta para impedir DML, pois conflita com `ROW EXCLUSIVE`; SRX acrescenta exclusão com outro SHARE/SRX e permite SELECT simples. O lock-count anterior é uma fotografia: o gate é o `NOWAIT` obtido dentro da transação. Quatro tabelas são travadas na ordem attendance, call_status, class_visitor_entries, day_closures. PostgreSQL adquire a lista nessa ordem e libera no fim da transação. Não esperar advisory locks por data depois desse lock de implantação. [Modos de lock](https://www.postgresql.org/docs/17/explicit-locking.html), [LOCK/NOWAIT](https://www.postgresql.org/docs/17/sql-lock.html).

Novos writers podem aguardar até o wrapper terminar; não se promete interferência zero ou duração de milissegundos em produção. `statement_timeout` vale por statement, enquanto `transaction_timeout` limita a duração da transação e encerra a sessão. O teste usou lock 250 ms, statement 2 s, transaction 5 s e idle 3 s. Um timeout/falha não autoriza repetição automática nem continuar a mesma transação; conferir corpo/histórico por leitura antes de nova tentativa. [Timeouts do PostgreSQL 17](https://www.postgresql.org/docs/17/runtime-config-client.html).

O conector `apply_migration` deve ser usado para DDL. A implementação pública MCP encaminha name/query à Management API e não documenta aqui o envelope transacional interno desse serviço. Por isso foi validado DO único sem COMMIT interno: mantém atomicidade do statement e não encerra eventual transação externa de registro da migration. [Implementação primária Supabase MCP](https://github.com/supabase/mcp/blob/main/packages/mcp-server-supabase/src/platform/api-platform.ts).

`CREATE OR REPLACE` conserva owner/ACL, mas demais propriedades recebem os valores declarados ou implícitos. Conferir antes/depois os metadados completos da função, triggers, policies e RLS; o fingerprint de invariantes deve excluir somente o corpo que mudará. Outro operador que altere diretamente a função sem respeitar o wrapper não é serializado pelos locks das tabelas; manter operador único. [CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html).

Este teste não chamou apply_migration remoto, não leu dados reais e não prova seu transporte HTTP ou registro no histórico. O operador deve fazer postflight apenas de metadados/histórico, sem uma presença real de teste. O aplicativo segue com o mesmo manifesto validado antes deste ensaio; estes arquivos são evidência documental adicional.
