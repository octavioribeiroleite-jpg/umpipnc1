# Linha de base — 05/10/2026

Capturada antes das edições desta auditoria, no worktree `codex/auditoria-responsividade-ipnc`, revisão `1ca403eb1739d411a8de4e6d5b4d83219fc83f99`. O checkout estava limpo. O remoto `origin` corresponde a `octavioribeiroleite-jpg/umpipnc1`. Nenhuma consulta ou escrita no backend remoto foi realizada por esta verificação.

Node `v24.19.0`, npm `11.6.2`, dependências já presentes no worktree e lockfile preservado. O runtime informado inicialmente continha apenas Node; os comandos começaram após localizar o npm existente. Não houve instalação/atualização de dependências.

| Comando | Código | Resultado |
|---|---:|---|
| `npx tsc -p tsconfig.app.json --noEmit` | 0 | Sem diagnóstico |
| `node --experimental-strip-types --test tests/*.mjs tests/*.ts` | 0 | 122 testes, 122 aprovados, zero falhas/ignorados |
| `npm run lint` | 1 | 379 diagnósticos anteriores: 316 erros e 63 avisos |
| `npm run build` | 0 | Produção cliente/servidor gerada |
| `git diff --check` | 0 | Sem problemas |

Saídas integrais em `types.log`, `tests.log`, `lint.log`, `build.log` e `diff-check.log`; durações e comandos em `results.json`. `lint-diagnostics.json` estrutura os diagnósticos do log original por arquivo, posição e regra; o aviso de diretiva ESLint não utilizada aparece com `rule: null`.

O build inicial registra o bundle principal com 2.589,31 kB (gzip 702,68 kB), CSS com 215,40 kB (gzip 37,37 kB), logo com 1.480,71 kB e módulo de relatório financeiro com 516,90 kB (gzip 207,03 kB). Avisos anteriores: chunks acima de 500 kB, importação dinâmica de `sonner` ineficaz porque também há imports estáticos, e base `caniuse-lite` antiga. Tamanho de bundle não mede latência de interação nem prova a causa do atraso da chamada.

Os testes incluem mocks, renderização e PostgreSQL isolado/PGlite. Esses resultados não confirmam a matriz de navegador, autorização no Supabase remoto, concorrência entre dispositivos ou revisão publicada no Sites.

Para repetir os comandos neste ambiente, acrescente ao `PATH` os diretórios de Node e npm já disponibilizados:

```sh
export PATH='/Users/octavioribeiroleite/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/octavioribeiroleite/Library/Caches/pnpm/dlx/f54a76b1c96d92ad5e6c9af29106f5df/muv9r9v6-2z5/node_modules/.bin:'"$PATH"
```

O relatório final deve comparar o lint atual com esta linha de base e não anunciar lint global limpo enquanto persistirem os diagnósticos.
