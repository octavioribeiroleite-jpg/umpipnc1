# Expiração independente das sessões EBD — 06/10/2026

Base inspecionada: `113f1ab3dafad5f68808b6671a00040f232a6239`. Correção preparada localmente; a aplicação remota da migration e a publicação pertencem à entrega coordenada. Nenhum usuário real, PIN, token ou dado pessoal foi usado nos testes.

## Causa e correção

A conta reservada é compartilhada por turma ou pelo administrador da EBD. O login quente atualizava `app_metadata.ipnc_portal.issued_at` nessa conta sem regravar a senha. Ao renovar o token, outra sessão da mesma conta recebia essa metadata recente e podia recuperar autorização depois de seus próprios 15 minutos, apesar do diálogo de confirmação na interface. O prazo no banco dependia de metadata da conta, não da sessão que comprovou o PIN.

A migration `20261006162230_ebd_auth_session_expiry.sql` passa a exigir uma sessão em `auth.sessions` com `id` igual ao `session_id` do JWT e `user_id` igual a `auth.uid()`. Sua `created_at` precisa ter menos de 15 minutos; o pequeno limite de 30 segundos para horário futuro foi preservado. O refresh não altera essa criação, e outro login cria outra sessão. O corte exato de 900 segundos já nega acesso.

O lookup é somente leitura pela chave primária existente, dentro do guard privado que já usa `SECURITY DEFINER` e `search_path` vazio. Não cria grants, objetos ou registros no schema Auth. `CREATE OR REPLACE` preserva OID, proprietário, ACL e demais atributos de segurança. Os checks de credencial, turma ativa, perfil ativo e isolamento por namespace permanecem. O ramo Diretoria não muda.

O helper do login mantém a otimização: quatro operações sintéticas no login quente (`profile-read`, `auth-get`, `auth-update-metadata`, `sign-in`), sem rehash de senha, logout global ou nova requisição HTTP. Apenas seu comentário foi atualizado para explicar o prazo correto.

## Evidência e validação

`tests/ebd-session-expiry.test.mjs` reproduz a falha antiga e o comportamento corrigido para professor e administrador. Uma sessão com 1.000 segundos era recusada, voltava a ser aceita com a metadata de outro login e podia gravar presença. Com a migration, continua recusada após refresh modelado; a nova sessão que entrou com o PIN é aceita.

Os sete testes novos também cobrem duas sessões válidas simultâneas, expiração independente, corte de 900 segundos, timezone, timestamps do JWT/metadata sem poder renovar o prazo, sessão ausente/malformada/desconhecida/de outro usuário/revogada, criação nula ou futura, PIN rotacionado, turma/perfil inativo, RLS por turma/data, leitura/escrita Auth negadas ao cliente e preservação da função/registro de sessões. O preflight da migration aborta atomicamente se o schema estiver ausente/incompatível ou se o proprietário do guard não puder ler a tabela.

As fixtures de permissões EBD, helper de portal e isolamento Diretoria executam agora a policy nova. A rodada ampliada passou **105 testes**, incluindo login, capacidade de aniversariantes, fila de presença, sincronização, reconexão e papéis verificados.

A rodada focal após o ajuste final de preflight passou **33 testes**; a última rodada de expiração/Diretoria passou **15 testes**, incluindo comparação da policy Diretoria/Pastor anterior com a nova para timestamps antigos, futuros e ausentes. Esse ramo não possuía prazo de 15 minutos e não recebeu uma regra nova nesta correção. O lint dos seis arquivos alterados e a verificação do diff passaram.

SHA-256 da migration validada: `6f815ed64ffc8839769ba55c8cc8e6ec5e1a5ef951af487f975a04de7fe7bf50`.

Comando de reprodução focal:

```sh
node --experimental-strip-types --test tests/ebd-session-expiry.test.mjs tests/ebd-portal-backend.test.mjs tests/ebd-permissions-database.test.mjs tests/diretoria-session-database.test.mjs
```

## Compatibilidade e limites

O orquestrador confirmou por metadados remotos: `auth.sessions.id` UUID com PK, `user_id` UUID, `created_at` timestamptz, e o proprietário atual do guard pode ler a tabela. Esse preflight não depende de registros reais. A migration repete o check de estrutura/privilégio antes de alterar a função.

PGlite executou o SQL real com usuários/sessões fictícios. O refresh Auth foi modelado conforme o emissor oficial; não houve servidor Auth completo isolado disponível, nem autenticação em produção. A documentação do Supabase vincula `session_id` ao registro de `auth.sessions`; o código do emissor renova claims mantendo a sessão e o modelo atualiza `refreshed_at`, não `created_at`.

Fontes primárias consultadas em 06/10/2026: [sessões Supabase](https://supabase.com/docs/guides/auth/sessions), [emissão/refresh Auth](https://github.com/supabase/auth/blob/master/internal/tokens/service.go), [modelo da sessão](https://github.com/supabase/auth/blob/master/internal/models/sessions.go) e [schema Auth](https://github.com/supabase/auth/blob/master/migrations/20220811173540_add_sessions_table.up.sql). O changelog foi conferido; nenhuma mudança consultada invalida esse contrato.

Uma sessão antiga sem registro Auth compatível é recusada e precisa confirmar o PIN. Sessões válidas de outros dispositivos permanecem até seu próprio prazo. A aplicação da migration não precisa de alteração de PIN, dados ou permissões nem de deploy de Edge Function.

## Aplicação coordenada

Aplicada no Supabase em 06/10/2026, às 16:22:30 UTC. O histórico remoto devolveu `20261006162230`; o arquivo inicialmente criado pelo CLI foi renomeado para essa versão sem mudar seus bytes. Corpo MD5 remoto `7c23ee3f357779f4635f80bc697da721`, igual ao local; OID, owner, ACL, volatilidade e search_path preservados. Nenhum registro Auth, PIN, perfil ou presença foi alterado. Advisors de segurança repetidos sem novos avisos. A publicação final do aplicativo pertence ao resumo coordenado.
