# Integridade temporal da reserva de per capita

Revisão de 06/10/2026, a partir da fonte `113f1ab3dafad5f68808b6671a00040f232a6239`. A reprodução e os testes usam somente dados fictícios em PGlite. Não foram realizadas movimentações, correções de dados, aplicação de migration ou publicação em produção nesta etapa.

## Defeito confirmado

O guard anterior conferia a soma de todos os lançamentos confirmados da sociedade, sem considerar a data contábil. Uma entrada de reserva em 2026 podia permitir uma retirada retroativa em 2025, mesmo sem reserva disponível em 2025. O relatório anual já limita os lançamentos à data final do ano, por isso a combinação gerava reserva negativa e saldo disponível maior que o saldo contábil.

Reprodução isolada: entrada sem reserva de R$ 100,00 em 01/01/2025; entrada com reserva de R$ 10,00 em 01/01/2026; saída que consome R$ 10,00 da reserva em 01/06/2025. A versão anterior aceita os três lançamentos e retorna, para 2025, saldo de R$ 90,00, reserva de −R$ 10,00 e disponível de R$ 100,00. Os valores são fictícios.

As mesmas condições ocorrem ao adiar, diminuir, devolver ou transferir uma entrada de reserva que sustentava uma retirada anterior. O acesso continua administrativo: esta revisão não identificou ampliação de autorização.

Referências da fonte anterior:

- `supabase/migrations/20261005142735_treasury_society_pin_access.sql`: guard com validação da soma total da reserva.
- `supabase/migrations/20261005140755_treasury_approval_reconciliation.sql`: `treasury_report` com corte pela data final do ano.
- `src/lib/treasury-report.ts`: cálculo do disponível a partir do saldo e da reserva do relatório, também utilizado pelo PDF.

## Correção aplicada

`supabase/migrations/20261006162227_treasury_reserve_timeline.sql` acrescenta ao guard existente a conferência acumulada da reserva por sociedade e dia contábil. A projeção substitui o lançamento alterado pelo novo estado e verifica as sociedades de origem e destino. Se qualquer dia terminar com reserva negativa, a operação é rejeitada com `23514` e mensagem que identifica o histórico.

Entradas do mesmo dia podem cobrir saídas daquele dia; a ordenação não depende do horário de criação nem do UUID. A reserva de anos anteriores continua disponível nos anos seguintes. A proteção abrange inserção confirmada, confirmação de pendência, alteração da data, mudança de sociedade, redução de reserva e reversão do crédito para pendente ou devolvido.

A validação adicional roda somente quando a projeção de uma reserva confirmada muda. Histórico eventualmente inconsistente não é reescrito pela migration; edição apenas da descrição e recebimentos sem reserva continuam usando o contrato anterior. Os guards de autorização, revisão, auditoria, conciliação bancária, divisão do Pix e reserva total foram preservados.

## Preservação e concorrência

O corpo remoto anterior de `ipnc_private.treasury_entry_guard()` foi consultado por metadados e coincide com a migration local anterior: MD5 `7626e18fd9cd34f3049d95c97607ed4a`. A remoção do único bloco novo de 28 linhas do corpo proposto recupera exatamente esse corpo anterior. Não há mudanças de tabelas, políticas, grants, credenciais ou dados.

Os locks ordenados das sociedades e o lock do movimento bancário permanecem no mesmo ponto do guard, antes da leitura e da nova validação. Atualizações entre sociedades conferem ambas as linhas já bloqueadas. `CREATE OR REPLACE` conserva a identidade da função; o teste de catálogo confirma o mesmo OID, proprietário, ACL, `SECURITY DEFINER` e `search_path` antes e depois. A configuração remota anterior é proprietário `postgres`, ACL restrita ao proprietário e `search_path=""`.

PGlite executa a suíte em uma conexão. Portanto, os resultados comprovam a regra e a preservação dos locks na fonte, mas não medem disputa entre duas sessões PostgreSQL. O runtime nativo do teste de concorrência existente não estava disponível; nenhum teste de concorrência foi executado no banco real.

## Verificações

- Antes, em cópia temporária dos testes sem a nova migration: 11 passaram e 3 falharam por ausência da rejeição esperada (retirada retroativa, reversão de crédito e transferência da saída).
- Depois: 14/14 testes de banco passaram, incluindo data no mesmo dia, reserva de ano anterior, histórico legado intacto, auditoria sem gravação em falhas e metadados da função.
- Suíte completa de tesouraria: 58/58 testes passaram, incluindo saldo/extrato confirmado, pendências e devoluções, divisão do Pix, idempotência, permissões e PDF com anexos fictícios. Foram usadas as dependências atualizadas pelo trabalho de manutenção; os PDFs da suíte são artefatos locais fictícios.
- Consulta de produção somente de leitura, agregada por sociedade/dia e sem valores individuais ou identificação de pessoas: **0 sociedades e 0 dias com reserva histórica negativa**. Nenhum dado histórico precisa ser modificado para aplicar esta prevenção.

A janela acumulada utiliza o comportamento documentado de [`sum(...) over (...)` no PostgreSQL](https://www.postgresql.org/docs/current/tutorial-window.html), com agrupamento prévio por dia para preservar a unidade contábil.

## Entrega

A correção foi aplicada pelo coordenador no Supabase em 06/10/2026, às 16:22:27 UTC. O histórico remoto devolveu a versão `20261006162227`, adotada no nome do arquivo local (criado inicialmente pelo CLI). O SHA-256 do SQL permaneceu `ebca4919c71e8a15c0552e17c4f955a3593997babfb6f7c6330ec0bc89dbd354`. Consulta posterior confirmou o corpo MD5 `dd49de51930be052a8abe1b96ee6656e`, igual ao local, com OID, proprietário, ACL e configuração preservados. Nenhum registro financeiro foi modificado. A publicação do frontend pertence ao resumo coordenado.
