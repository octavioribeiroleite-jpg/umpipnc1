# Manutenção diária — 09/10/2026

Foi reproduzida uma falha de privacidade da interface: ao receber `refresh_token_not_found`, o SDK encerrava a sessão e o contexto limpava identidade, perfil, papéis e cache, mas a página de reuniões já montada continuava mostrando título e moderador fictícios. Não houve nova leitura autorizada nem demonstração de bypass de RLS; os dados permaneciam no estado local da página.

O guard compartilhado das áreas principais agora aguarda a confirmação de acesso antes de montar conteúdo privado e retorna à Home de login (`/auth?home=1`, com replace) quando não existe sessão. A troca de identidade bloqueia a interface imediatamente e invalida hidratações antigas, inclusive as ainda agendadas. Erros de confirmação mantêm a opção de tentar novamente. A renovação válida da mesma conta mantém a interface e os formulários.

Os acessos independentes da EBD, tesouraria e páginas públicas continuam com seus próprios guards e sessões. Não houve alteração de PIN, papel, permissão, política SQL, Edge Function ou dado real.

Dez regressões novas usam o AuthProvider e o boundary reais, SDK Supabase real e transporte/storage fictícios: ausência/perda de sessão, limpeza de conteúdo/cache, independência da tesouraria, carregamento, erro/retry, renovação válida, retorno por histórico, troca de conta e cancelamento de hidratação agendada. O harness Node verifica estados e montagem; a prova de reconciliação DOM e preservação de input foi feita separadamente no navegador local, com rede externa bloqueada. O smoke visual integrado usa AuthContext substituído e não é apresentado como prova do novo guard.

Verificações finais: tipos, 483/483 testes isolados, build de produção (4,64 s) e diff check. Lint dos dois componentes alterados passou com zero erros e os mesmos dois avisos presentes na base. Node 24.19.0; npm/npx ausentes nesta sessão, portanto os CLIs locais de TypeScript e Vite foram executados diretamente, equivalentes aos comandos do projeto, sem instalação ou alteração do lockfile.

A revisão passiva confirmou GitHub/Sites na mesma revisão inicial, 57 tabelas públicas com RLS, catálogo/invariantes da tesouraria e Edge de reuniões v6 com oito módulos iguais à fonte. Logs disponíveis não mostraram HTTP 5xx ou Postgres ERROR/FATAL; uma ocorrência conhecida de refresh-token ausente motivou a regressão isolada, sem provar exposição em produção. Advisories e avisos Supabase permanecem iguais ao ciclo anterior.

Evidências detalhadas e estado final da publicação estão no pacote externo da automação `reports/security-reports/2026-10-09_c3c6cd9`, nomeado pela revisão inicial. Contas protegidas reais, aparelho físico/PWA/offline/gestos, concorrência PostgreSQL, retenção do provedor IA e restauro continuam fora da certificação. Nenhum lançamento financeiro, presença, voto, mensagem ou dado de negócio real foi criado ou alterado nos testes.
