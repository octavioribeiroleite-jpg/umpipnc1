# Acessos da EBD: entrega de desempenho

Data: 06/10/2026. Base: `24297c695756b445a49823a8963e4391b73d9893`.

## Resultado

Os acessos de Administrador, Professor e renovação mantêm o padrão visual, a logo, a confirmação de sessão pelo SDK e as permissões existentes. O envio fica protegido até a sessão ser aceita, impedindo pedidos concorrentes. Os aniversários aguardam acesso autorizado; uma única consulta de alunos fornece o conjunto completo e o ativo.

A sincronização começa imediatamente. A primeira assinatura Realtime só aproveita a leitura em curso quando chega antes de as consultas de dados começarem. Assinatura tardia, reconexão e mudança observada continuam exigindo reconciliação; não se elimina uma leitura necessária à atualização correta. O histórico mantém seu comportamento anterior.

No servidor, a Secretaria reaproveita a configuração já validada e o usuário já confirmado pelo Auth. Uma conta EBD existente não recebe gravação de perfil quando este já está ativo e no escopo correto. Depois da primeira preparação, uma marca HMAC independente da senha permite evitar o recálculo da senha com a mesma credencial. O servidor continua conferindo identidade e credencial, renovando `issued_at` e emitindo a sessão com validade EBD de 15 minutos. Contas antigas, rotação de credencial/projeto/segredo, ativação e mudança de escopo preservam as etapas necessárias.

Não houve migration, alteração de RLS ou mudança nas regras de chamada e finanças. A otimização do helper é restrita ao namespace EBD. O cache estático do PWA passa para `ump-cache-v21`, com registro `/sw.js?v=2026-10-06-ebd-speed-v13`.

## Evidência e limites

O [relatório da comparação](README.md) contém tempos, contagens e capturas da página real com transportes fictícios isolados. O [diagnóstico frontend](frontend-diagnosis.md) detalha os guardas e cenários de sincronização. Os tempos controlados não representam uma medição de login no celular ou na rede de produção; nenhum PIN real foi utilizado.

Com Realtime de 200 ms, as primeiras telas/dados mantiveram tempos semelhantes à base, sem a espera artificial. As consultas de alunos caíram de quatro para duas ao longo dos dois snapshots necessários nesse cenário. As consultas de aniversários antes do acesso caíram para zero. Com Realtime rápido, a fase segura permitiu um único snapshot. O modelo de custo interno do helper passou de 660 para 400 ms na entrada repetida; esse valor é exclusivamente sintético, não um benchmark do servidor publicado.

Os registros anteriores de produção abrangem todas as ações do serviço administrativo EBD e não distinguem cada login. Não há fundamento para atribuir sua média a cada perfil ou afirmar um tempo real pós-publicação.

## Verificações

- `npx tsc -p tsconfig.app.json --noEmit`: passou sobre a fonte final.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: 388 testes passaram, zero falhas.
- `npm run build`: passou. Permanecem avisos anteriores sobre tamanho do bundle, importação de `sonner` e atualização da base Browserslist.
- `git diff --check`: passou.
- Lint dos arquivos pertinentes: nenhum erro novo. A Secretaria mantém exatamente os 13 `no-explicit-any` da base; o endpoint administrativo mantém um `no-explicit-any` da base. As linhas apenas mudaram de posição. O aviso anterior de dependências intencionais da fila por escopo permanece. Os demais hooks, cache, helpers e fixture alterados não apresentam erros.
- Navegador isolado: Administrador, Professor, sessão salva, renovação, assinatura rápida/empatada/tardia, duplo Enter, falha de confirmação com retry, PIN incorreto e Voltar para a Home. Os dados fictícios e a separação por turma foram preservados.

## Serviços publicados

Os dois serviços EBD foram publicados e consultados novamente pela ferramenta nativa:

| Serviço | Revisão anterior | Revisão publicada | Estado |
| --- | ---: | ---: | --- |
| `ebd-class-login` | 2 | 3 | ACTIVE |
| `manage-ebd-class-password` | 4 | 5 | ACTIVE |

As flags de autenticação existentes foram preservadas. As fontes de runtime retornadas após o deploy são idênticas às fontes validadas. O empacotador omite `ai-auth-policy.ts`, dependência exclusivamente de tipos, da listagem do serviço administrativo; os seis arquivos de runtime conferem byte por byte. Os demais serviços não foram republicados. A versão do Site e a revisão final de código são informadas na entrega após confirmação nativa da publicação.
