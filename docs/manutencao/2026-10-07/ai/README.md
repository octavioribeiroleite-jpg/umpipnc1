# Minimização dos perfis em `auto-process-meeting`

Base revisada: `41642b51e304cd7532bd281e6dd9dd3cc8830b97`. Achado `IPNC-AI-PRIVACY-20261007`, severidade média, confirmado em handler real com transportes inteiramente sintéticos. A hipótese residual de 06/10 recebeu reprodução completa nesta revisão; não representa evidência de incidente real.

Na versão implantada 5, a Diretoria podia processar uma reunião da própria sociedade e enviar ao modelo nomes e UUIDs de todos os perfis cadastrados. A origem era a consulta administrativa sem filtro em `auto-process-meeting/index.ts:88–90`; a lista nas linhas 562–563 entrava no prompt nas linhas 576–577 e chegava a `openAIChat` na linha 586. O trigger `guard_task_relations` já impedia responsáveis inativos ou de outra sociedade sem papel admin/pastor, mas essa validação ocorria depois do envio ao modelo.

O helper novo limita o cadastro de responsáveis antes de qualquer chamada ao modelo. Mantém responsáveis ativos da sociedade da reunião e administradores/Pastor ativos, que o trigger permite em qualquer sociedade. O administrador mantém o cadastro global ativo. Saídas do modelo fora dessa lista recebem `assignee_id=null`, sem registrar nomes ou conteúdo do modelo no diagnóstico. A autorização do endpoint continua exigindo administrador ou Diretoria da sociedade da reunião; Pastor isoladamente não ganha acesso para executar o processamento.

O lookup histórico tem finalidade separada: nomes do moderador, participantes e autores de contribuições reveladas da reunião continuam disponíveis mesmo quando o perfil foi desativado ou mudou de sociedade. Esses nomes são obtidos apenas por IDs vinculados à própria reunião; não ampliam o cadastro de responsáveis. Erros nas leituras necessárias interrompem o fluxo antes do modelo ou de alterações de negócio.

| Leitura de perfis | Versão 5 | Fonte corrigida |
| --- | --- | --- |
| Nomes históricos | Todos os perfis, sem filtro | `user_id in (moderador, participantes, autores revelados desta reunião)` |
| Responsáveis da Diretoria | Todos os perfis com nome, inclusive inativos | `active=true AND society_id=reunião`; união com `active=true AND user_id in (admin/pastor)` |
| Responsáveis do administrador | Todos os perfis com nome, inclusive inativos | `active=true`, mantendo alcance global |
| Cadastro de papéis globais | Não usado para minimizar o prompt | Somente IDs em `user_roles` com `role in (admin,pastor)`; nomes lidos apenas de perfis ativos |

## Evidência isolada

`tests/meeting-ai-privacy.test.mjs` executa o handler real, `resolveAiActor`, política de autorização e helpers reais. Auth, PostgREST e modelo são substituídos por fixtures; nomes, IDs e conteúdo são fictícios. Captura todos os payloads de modelo sem transmitir dados para serviços externos.

- Antes: a reprodução mínima local e a cópia exata implantada retornam HTTP 200, cinco chamadas de modelo fictícias e `foreignNameSent=true`, `foreignUuidSent=true`. Quatro casos: três controles passam e uma regressão falha, como esperado.
- Antes, com os sete casos finais e o handler implantado 5: um passa e seis falham, como esperado. As falhas abrangem minimização, inativos, atribuições indevidas e leituras que antes não interrompiam o fluxo. O controle de autorização passa.
- Depois: os sete casos finais passam. Cobrem Diretoria, administrador, perfis ativos/inativos, admin/Pastor globais, histórico transferido/desativado, contribuições reveladas, responsáveis válidos e maliciosos, autorização e falhas das leituras de escopo.
- Focais: 21/21 passam em `meeting-ai-privacy`, `ai-actor`, `diretoria-ai-actor` e `rate-limit`. Os sete casos de privacidade estão incluídos nesses 21.
- ESLint do endpoint, helper e teste: limpo. `git diff --check`: limpo. Runtime Node.js `v24.19.0`. Tipos, suíte completa e build final ficam a cargo do coordenador.

```sh
node --experimental-strip-types --test tests/meeting-ai-privacy.test.mjs tests/ai-actor.test.mjs tests/diretoria-ai-actor.test.mjs tests/rate-limit.test.mjs
node node_modules/eslint/bin/eslint.js supabase/functions/auto-process-meeting/index.ts supabase/functions/_shared/meeting-ai-profiles.ts tests/meeting-ai-privacy.test.mjs
```

O teste aceita `IPNC_MEETING_AI_SOURCE` para avaliar uma cópia histórica do handler em isolamento. A cópia recuperada de implantação, a reprodução mínima e o comparador de resolvers ficam em `/tmp`; não integram o deploy nem substituem módulos locais.

## Fonte implantada e dependências de autenticação

Leitura somente da Edge Function `auto-process-meeting` no projeto autorizado `xhhfgnkpgtnzlvpvqjpl`: versão 5, ACTIVE, `verify_jwt=true`, sem import map. O handler remoto coincide byte a byte com a base revisada: SHA-256 `f844949a7527fbfee4dd92e6782ec296af41aec5fa3d454dc3813de523b9f4bd`. Cinco módulos compartilhados também coincidem: `ai-chat`, `openai-chat`, `server-limiter`, `rate-limit` e `ai-auth-policy`.

A única diferença pré-existente de módulo é `ai-actor.ts`: a fonte local aceita o terceiro argumento opcional `verifiedUser`, já documentado como resultado de verificação do servidor. O handler chama o resolver com dois argumentos. A fonte local e a cópia remota passam os mesmos sete casos de Diretoria/Pastor/administrador com chamadas de dois argumentos, inclusive erro de Auth, credenciais rotacionadas, escopo divergente e EBD negado. Esse comparador repete os casos existentes e não aumenta a contagem de testes únicos.

As quatro dependências de dados do resolver continuam intactas: `settings` para a credencial individual do portal; `profiles` para sociedade/perfil ativo; `user_roles` para papéis do servidor; `societies` para sociedade ativa correspondente à claim. `auth.getUser(token)` continua obrigatório quando o terceiro argumento é omitido. O manifesto lista arquivos locais exatos e hashes; nenhum arquivo externo recuperado será incorporado.

## Cobertura e limites

Revisão estática de autenticação principal, segregação de sessões/caches, PIN Diretoria/Pastor, EBD, back/cold launch, capabilities IA e uploads não encontrou outro defeito novo reproduzível. Os dois defeitos de EBD de 06/10 (expiração após refresh e turma inativa) permanecem corrigidos e não foram reabertos. A hipótese de refresh após rotação de PIN foi descartada ao conferir que a mudança de senha em `portalSession` invalida todas as sessões no Auth oficial.

Não foram lidos dados pessoais, PINs, hashes de credenciais ou secrets. Não houve chamada de modelo real, upload real, emissão de mensagem, voto, movimentação financeira ou alteração do banco/produção. O coordenador informou zero invocações de `auto-process-meeting` nos logs de 24 horas; isso não demonstra ausência histórica de exposição. Gateway HTTP/Auth reais, dispositivo físico e validação de magic bytes dos uploads não foram certificados. Publicação e verificação pós-deploy são responsabilidade do coordenador.
