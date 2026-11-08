# Contagem exata da votação

O frontend confere novamente a chamada e as cédulas antes de apurar, confirmar o resultado, avançar escrutínio, encerrar e preparar o próximo cargo. Exige `total_present > 0`, quantidade real de `election_attendance.present = true` igual a `total_present` e quantidade de `ballot_id` distintos do escrutínio igual à chamada. Todas as páginas de votos e presença são lidas. Erro, falta, excesso ou divergência bloqueiam o fluxo. Início exige chamada conferida e rascunho sem votos.

## Banco aplicado e verificado

A migration `supabase/migrations/20261108132815_election_exact_count_gate.sql` foi aplicada em **08/11/2026**, no projeto IPNC `xhhfgnkpgtnzlvpvqjpl`, branch `main` de produção. O conector Supabase não autorizava esse projeto; a aplicação ocorreu pelo SQL Editor do Chrome, na sessão autenticada do proprietário. Schema e registro no histórico foram confirmados na mesma transação. O frontend continua usando consultas e updates existentes; não exige RPC novo.

A conferência posterior consultou somente catálogos e histórico de migrations, sem leitura ou alteração de votos, chamadas ou eleições reais para testes:

- Histórico: versão `20261108132815`, nome `election_exact_count_gate`, MD5 do corpo `9e2dc7a91fd41c3395cbfc8545bd7d93`, correspondente ao arquivo validado.
- Três triggers habilitados (`O`): `election_exact_count_transition`, `election_attendance_count_lock`, `election_votes_count_lock`.
- Duas funções `SECURITY INVOKER`, `search_path` vazio, sem EXECUTE direto para `anon`/`authenticated`. MD5 dos corpos: guard `c0cd5c59443b128d22e30a2b8556bc91`; child lock `144b993f2fc54cb0edd901cd6ffb3907`.
- Dois índices de contagem presentes; as quatro policies das três tabelas correspondem ao preflight. Nenhum grant/policy foi alterado.

A migration foi criada pela CLI oficial Supabase (`migration new election_exact_count_gate`). O SQL aplicado usa triggers `SECURITY INVOKER`, sem novos grants de tabela ou alteração de RLS. Trava cada escrita de voto/chamada na mesma linha de eleição já travada pelo RPC `cast_ipnc_ballot`. Uma transição só passa com contagem exata; voto antigo que chega após encerramento/avanço é rejeitado. Chamada e total confirmado ficam imutáveis após início, conforme o bloqueio já existente na interface. Resultados encerrados não podem ser reabertos. Não há alteração de maioria, desempate, dados ou resultados existentes.

## Reaplicação e conferência de metadados

1. Inspecionar as definições e triggers existentes para confirmar que correspondem ao schema versionado. Não testar com eleição ou voto real.
2. Executar os testes locais `tests/election-exact-count-database.test.mjs` e os demais checks do projeto.
3. Aplicar `supabase/migrations/20261108132815_election_exact_count_gate.sql` como transação pelo acesso administrativo autorizado. Registrar sua aplicação no histórico de migrations usando o fluxo Supabase da equipe.
4. Executar a conferência **somente de metadados** abaixo e os advisors. Não criar chamada, voto ou eleição real como teste.

```sql
select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where not t.tgisinternal and t.tgname in
 ('election_exact_count_transition','election_attendance_count_lock','election_votes_count_lock');

select n.nspname, p.proname, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='ipnc_private' and p.proname in
 ('guard_election_count_transition','lock_election_count_child_write');
```

Esperado: três triggers habilitados, duas funções com `prosecdef = false` e `search_path` vazio. A aplicação não modifica registros históricos divergentes: eles continuam visíveis, mas não permitem preparar o próximo cargo pela interface até revisão autorizada.

## Validação isolada

TypeScript, build de produção e os 573 testes do projeto passaram. Os testes específicos cobrem 15/16, 16/16, 17/16, chamada divergente, zero presentes, 48 linhas de candidatos representando 16 cédulas, paginação acima de mil linhas, falhas de leitura, avanço de escrutínio, próximo cargo e preservação dos resultados.

Sete testes de banco executam o SQL real em PGlite com dados fictícios, incluindo as duas ordens serializadas de voto versus encerramento/avanço. PGlite oferece uma única conexão: isso não foi apresentado como teste de contenção com múltiplas conexões. A garantia no banco usa o bloqueio da mesma linha de eleição em todas essas escritas. A verificação em produção foi limitada a metadados, sem emitir votos de teste.

`ROLLBACK_exact_count_gate.sql` remove os guards e índices sem alterar registros de negócio. Seu uso é emergencial e reabre a janela de concorrência; não foi executado. Uma eventual reversão também exige reconciliar o histórico da migration.
