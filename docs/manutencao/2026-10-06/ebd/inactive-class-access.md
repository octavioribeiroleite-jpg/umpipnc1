# Bloqueio de acesso de turma EBD desativada

Correção preparada em 06/10/2026 a partir de `113f1ab`. Os testes usam exclusivamente dados fictícios, token assinado com segredo sintético e respostas locais de Auth/IA. Não houve chamadas reais de login, geração de IA ou escrita no banco remoto.

## Defeito e correção

Uma turma com `ebd_classes.active=false` ainda conseguia login por PIN e usar uma capability já emitida para gerar anúncio de aniversariantes quando sua senha permanecia ativa. Os dois endpoints consultavam a senha sem exigir a ativação da turma. O guard SQL já negava a turma desativada, mas esses caminhos usavam o cliente administrativo e precisavam do mesmo requisito.

`ebd-class-login` e `generate-birthday-announcement` agora consultam o relacionamento `ebd_classes!inner`, filtram `ebd_classes.active=true` e conferem o estado retornado antes de emitir acesso ou validar a capability. Mantêm uma única consulta de credencial, o limite de tentativas, o fingerprint, o prazo e os formatos de resposta existentes. O acesso administrativo não depende da ativação de turmas e permanece igual. Nenhuma migration foi alterada.

## Reprodução antes/depois

A fonte histórica `113f1ab` foi executada no mesmo harness isolado com turma desativada e senha ativa. Resultado:

| Caminho | Antes | Depois |
| --- | --- | --- |
| Login do professor | HTTP 200, uma sessão fictícia e um registro fictício de acesso | HTTP 401, nenhuma emissão ou registro |
| Anúncio com capability válida da turma | HTTP 200, uma chamada de IA fictícia | HTTP 401, nenhuma chamada de IA ou reserva de geração |

As respostas negadas mantêm `Senha incorreta` no login e `ebd_ai_session_expired_or_invalid` no anúncio, sem expor a credencial ou o estado cadastral.

## Validação

**31 testes passaram**, incluindo cinco casos novos: login da turma inativa, revogação de capability existente pela desativação, turma ativa preservada, turma ausente/credencial desativada ou rotacionada/erro de banco, e administrador independente das turmas. Também passaram os testes existentes de limite de tentativas, validade do token, acesso administrativo e login quente.

```sh
node --experimental-strip-types --test tests/ebd-announcement-access.test.mjs tests/ebd-entry-backend.test.mjs tests/ebd-birthday-token.test.mjs tests/ebd-portal-backend.test.mjs
```

Lint dos dois endpoints e dos três arquivos de teste/fixture passou sem diagnósticos. O `any` da linha de relacionamento já existente no login foi substituído pelo tipo necessário ao novo check. O diff passou na verificação de espaços.

Arquivos de produção: `supabase/functions/ebd-class-login/index.ts` e `supabase/functions/generate-birthday-announcement/index.ts`. Testes: `tests/ebd-entry-backend.test.mjs`, `tests/ebd-announcement-access.test.mjs` e `tests/fixtures/ebd-announcement-backend.mjs`.

Limite: os testes executam o endpoint e a verificação criptográfica reais com banco/IA simulados; não validam o transporte PostgREST/Edge publicado. O deploy dos dois endpoints pertence à entrega coordenada pelo orquestrador.

## Publicação coordenada

As funções foram publicadas pelo coordenador em 06/10/2026: `ebd-class-login` versão 4 e `generate-birthday-announcement` versão 5, ambas ACTIVE. A configuração anterior `verify_jwt=false` foi preservada porque os endpoints validam PIN/capability próprios. Nenhum segredo, PIN, login ou chamada real de IA foi utilizado para validar a entrega. O código recuperado após deploy foi comparado integralmente com os arquivos locais, incluindo dependências relativas.
