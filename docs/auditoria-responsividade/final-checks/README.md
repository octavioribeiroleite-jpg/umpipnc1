# Verificações finais — fonte congelada

05/10/2026. Executadas após o último ajuste do contador eleitoral e a revisão dos warnings novos. Nenhum backend de produção ou dependência do aplicativo foi alterado por estes comandos.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| TypeScript app, `--noEmit` | código 0 | `types.log` |
| Todos `tests/*.mjs tests/*.ts` | **193/193**, zero falhas/ignorados, código 0 | `tests.log` |
| `npm run lint` | **298 erros, 65 avisos**, código 1 | `lint.log`, `lint-diagnostics.json` |
| `npm run build` | código 0 | `build.log` |
| `git diff --check` | código 0 | `diff-check.log` |

O lint já falhava antes: 316 erros/63 avisos no baseline. A comparação por arquivo/regra removeu 18 erros e dois avisos existentes; há quatro avisos novos de Fast Refresh exclusivamente nas entradas das fixtures (`tests/fixtures/diretoria/main.tsx` e `tests/fixtures/ebd-latency.tsx`, dois cada). Resultado líquido: -18 erros/+2 avisos. Não há aumento de diagnósticos por arquivo/regra em produção. Os novos avisos de `reportScope` e `loadSociety` foram corrigidos; `resetAuthData` ficou estável, mantendo somente a pendência anterior de `fetchProfileAndRoles` no efeito de Auth. Os avisos de efeitos em ConfiguracoesTab/Financas mudaram de descrição com a refatoração, preservando a contagem da dívida anterior. Não se declara lint aprovado. Detalhes: `lint-delta.json` e `lint-warning-delta.json`.

O build continua avisando sobre import dinâmico ineficaz de sonner e chunks acima de 500 kB. Isso não foi resolvido por ocultação de warning nem alteração de limite.

Revisão base: `1ca403eb1739d411a8de4e6d5b4d83219fc83f99`; branch `codex/auditoria-responsividade-ipnc`. As verificações ocorreram na árvore de trabalho antes do commit. O manifesto contém **379 arquivos** de fonte/configuração/fixtures e os respectivos SHA-256, excluindo documentação e arquivos ignorados de saída. Hash do JSON canônico ordenado desse mapa:

```text
9bb787a9794deb385860bb424504ed7e4f4928954e1b2bd1867163659be13f0a
```

A igualdade de todos os arquivos foi reconferida após tipos/testes/lint/build. `results.json` registra comandos, códigos de saída e hashes dos logs; `source-manifest.json` permite comparar o commit posterior com a fonte validada. Isso é identidade da fonte descrita, não alegação de deploy ou hash de uma revisão Git ainda não criada.

Depois dos commits, `commit-verificado.json` confirmou os mesmos 379 hashes em `7754b8bc6b4e36e7dfe76fcb60af66d22ec876e4`, sem fonte/scripts/testes pendentes. O commit posterior de documentação conserva esse código.

As 54 provas direcionadas EBD fazem parte dos 193 testes gerais. Os 29 cenários de PostgreSQL nativo com conexões simultâneas têm execução separada em `../fundacao-checks/ebd-postgres-concurrency.{json,log}`; não somar como se fossem testes do runner Node geral. O banco foi encerrado e a porta fechada. Proposta SQL continua fora das migrations e sem aplicação remota autorizada.

`provisorio-antes-contador/` conserva a rodada anterior de 191 testes; não substitui os arquivos finais desta pasta. Logs são ignorados pelo `.gitignore` geral e precisam ser incluídos explicitamente na entrega de evidências quando desejado.

Os 32 logs foram incluídos explicitamente na entrega. Ao incluí-los, `git diff --check` apontou espaços finais e linhas vazias emitidos pelos reporters (Vite/ESLint e trechos de diagnóstico). `.gitattributes` nesta pasta dispensa apenas `*.log` desse critério, preservando os bytes e SHA-256 originais. Fonte, testes, SQL e Markdown continuam com a verificação normal; o diff completo foi conferido novamente.
