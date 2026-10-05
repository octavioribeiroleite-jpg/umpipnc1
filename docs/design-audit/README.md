# Auditoria visual IPNC — 28/09/2026

Estado: implementação local realizada; build e testes aprovados, com limitações documentadas. Não publicada; validação interativa integral pendente.

## Alvo e limites

Checkout: `Aplicativo IPNC`, HEAD inicial `c5b453d`, repositório `octavioribeiroleite-jpg/umpipnc1`. Sites: projeto `appgprj_6a9808f7510c819190f1e078cac5fb8c`, Renovo IPNC, URL https://renovo-ipnc.octavioribeiroleite.chatgpt.site, público, versão 21 na conferência inicial. A fonte publicada registrada em Sites é `5aea4424a9bad79cc3f27b7e0962dbd33d84c583`, ainda não disponível no checkout. Não confundir a revisão local com essa versão publicada.

Duas operações anteriores continuam com aprovação nativa pendente: iniciar o servidor Vite/Cloudflare e buscar a fonte Sites no worktree de publicação. Não foram repetidas nem substituídas. As mudanças atuais preservam os arquivos de tesouraria e alterações EBD anteriores. Nenhuma escrita no banco, alteração de papéis, migração, publicação ou operação Git remota faz parte desta auditoria visual local.

As cópias `Secretaria 2.tsx`, `Aniversariantes 2.tsx` e `BirthdayFormDialog 2.tsx` não são rotas ativas. Na correção posterior solicitada em 28/09/2026, `Secretaria 2.tsx` passou a reexportar a implementação atual e o tipo `VisitorEntry`; seu conteúdo original foi preservado integralmente em `docs/archive/secretaria/Secretaria-2.2026-09-28.tsx.txt`. As outras duas cópias permanecem intactas. `/membro` continua não liberado; `MembroHome` e `AguardandoPermissao` continuam fora do roteamento.

## Cobertura por superfície

“Fonte” significa leitura da implementação, alterações locais quando necessárias e checagem técnica; não significa validação visual em execução. Todas as telas protegidas ainda precisam de inspeção no aplicativo modificado com sessões legítimas dos respectivos papéis. Estados contemplados na revisão de fonte: carregamento, vazio, dados, erro, formulários, confirmações, permissão e navegação quando existem na implementação.

| Rotas / área | Superfícies inventariadas e revisadas | Responsável / evidência |
|---|---|---|
| `/auth` | seleção, acesso administrativo, PIN, sociedade, identificação e confirmação | Fonte; estrutura/seletores dos observadores e handlers preservados; entrada publicada conferida nas cinco larguras |
| `/reset-password`, `*` | sessão válida/inválida, campos, retorno, 404 em português | Fonte; campos comuns e autocomplete; sem executar troca de senha |
| `/` | saudação, resumo, ações, agenda, aniversários, comunicados, carregamento | Fonte; indicadores comuns, quebra de valor e ações |
| Layout geral | sidebar, rail tablet, bottomnav, menu Mais, offline, instalação/atualização PWA, dialogs/drawers | Fonte; árvore única mantida, área principal focável, nav sem corte de rótulos, controles, menus/popovers/calendário e safe areas |
| `/reunioes`, `/reunioes/nova`, `/reunioes/:id` | lista, formulário, Registro, Resumo IA, Ata, WhatsApp, Pauta, Ações | Fonte; `meetings-plenaries.md` |
| `/plenarias`, `/plenarias/:id` | Plenárias, Membros, presença, anotações/ata e organização | Fonte; `meetings-plenaries.md` |
| `/tarefas` | A fazer, Andamento, Concluída; formulário, filtros, quadro desktop | Fonte; `tasks-calendar.md` |
| `/calendario` | mês/dia, filtros, eventos, detalhes e formulário | Fonte; `tasks-calendar.md` |
| `/financas` | Cobranças, Comprovantes, Movimentações/receitas/gastos, Camisas, Relatórios, Mais/configurações | Fonte; `financial.md` |
| `/camisas` | Resumo, Campanhas, Encomendas, Compras, Vendas, Estoque; pedidos abertos/finalizados/todos | Fonte; `financial.md` |
| `/dizimos` | seleção da sociedade, receitas, despesas, extrato e formulários | Fonte; `financial.md` |
| `/tesouraria` | leitura pública, caixas, gráfico, extrato/filtros/paginação, login, administração de caixas/lançamentos | Fonte; `financial.md`; lógica e testes anteriores preservados |
| `/arquivos` | busca/tipo/categoria/ordem, cards, ações, upload/detalhe/exclusão | Fonte; filtros adaptáveis com labels, menu visível ao toque, nomes completos no upload |
| `/comunicados` | lista, resumo/expandir, novo aviso, prioridade e envio | Fonte; labels, campos comuns e expansão de 44 px; nenhum aviso enviado |
| `/estudos` | lista, novo estudo, notas, resumo WhatsApp, relatório anual | Fonte; rótulos associados, relatório responsivo e texto longo; nenhum estudo criado |
| `/aniversariantes` | próximo/hoje/semana/mês/ano, busca/departamento, pendentes, editar/excluir | Fonte; `secretaria-birthdays.md` |
| `/configuracoes` | Geral, Financeiro, Google Calendar, Gestão de usuários, EBD, PINs | Fonte; `admin.md` |
| `/usuarios` | diretoria por sociedade, Geral/Membros, criação/edição/acesso | Fonte; `admin.md` |
| `/pastor`, `/pastor/sociedade/:slug` | resumos, alertas, gráficos, cards de sociedade, filtros | Fonte; `pastor-public-elections.md`; árvore única e guardas testados |
| `/pastor/calendario`, `/pastor/comunicados`, `/pastor/sugestoes` | calendário, avisos, sugestões; aliases `/pastor-sugestoes`, `/sugestoes` | Fonte; `pastor-public-elections.md` |
| `/visitantes`, `/igreja` | visitantes, identificação, Início, Programações, Avisos, Dízimos | Fonte; `pastor-public-elections.md` |
| `/eleicoes`, `/eleicoes/:id` | cargos/camisas, candidatos/fotos, presença, dispositivos, votação, resultados | Fonte; `pastor-public-elections.md` |
| `/vote/:electionId`, `/eleicao/:id/apresentar` | identidade, seleção de candidato/fotos, estados, apresentação | Fonte; `pastor-public-elections.md`; nenhum voto registrado |
| `/secretaria` | perfil/PIN, admin/professor, Home, Chamada, Histórico, Turmas, Aniversariantes, Planilha, Configurações, Acessos | Fonte; `secretaria-birthdays.md`; perfil e PIN publicados inspecionados sem autenticar |

## Fundação compartilhada

- Cores HSL existentes mantidas como referência, superfícies card/background e bordas previsíveis; contraste do texto secundário reforçado.
- Cabeçalho comum com título de 24–30 px, descrição legível e ações que quebram linha. Indicadores conservam densidades explícitas, números completos e wrapping conforme largura do card.
- Removidos overrides globais que anulavam a tipografia/densidade dos componentes e `overflow-x:hidden` da raiz usado para ocultar conteúdo excedente. Rolagem horizontal fica nos componentes que a exigem.
- Botões/campos/abas/select com alvo base de 44 px; seletor e labels quebram linha. Dropdowns e botões específicos também são revisados por área.
- Diálogos centralizados têm classe própria; regras de geometria deixam de depender de busca por `inset-` na string de classes. Sheets/drawers mantêm a própria geometria, scroll limitado à viewport e fechamento “Fechar”.
- Auth conserva `Você é`, `shadow-2xl`, irmãos de nome/metadados e botões diretos; observadores imperativos e contratos de sessão não foram alterados. SocietySelector não recebeu uma nova classe `.grid`.

## Evidência publicada versus local

A navegação real foi feita somente para diagnóstico da versão 21. Entrada e PIN foram medidos nas cinco larguras; seleção EBD em 375px, sem overflow horizontal. O botão de acesso administrativo media38 px de altura (corrigido localmente para44 px); voltar do PIN não tinha nome acessível (corrigido no PinPad local).

O PIN foi medido em 375, 390, 768, 1024 e 1440 px: `documentElement.scrollWidth` igual à largura da viewport, 13 botões preservados. Sem PIN enviado e sem uso de dados de terceiros. Essas medições não validam o CSS alterado.

## Verificações locais

Resultados consolidados em `verification.md`. O relatório comparativo de lint da fundação, Auth e páginas gerais está em `shared-lint.json`:36 arquivos, 10 achados anteriores e 10 atuais, sem novos achados. Não equivale a lint global limpo.

Os dois erros de tipos de `src/pages/Secretaria 2.tsx` foram corrigidos na etapa posterior solicitada pelo usuário. A checagem de tipos agora passa, sem exclusões ou supressões. Build não substitui typecheck. Referência funcional independente:174 arquivos protegidos; comparação final registrada junto da verificação.

## Pendências para concluir a auditoria

1. Obter a fonte publicada pelo fluxo Git/Sites existente e integrar sem sobrescrever mudanças recentes.
2. Executar a versão modificada e conferir todas as rotas, abas, modais e papéis em 375, 390, 768, 1024 e 1440 px; EBD também320 px e zoom 200%.
3. Conferir foco/teclado, rotação com rascunho, overlays de atualização financeira, sessão expirada e estados com dados legítimos, sem operações reais desnecessárias.
4. A prévia HTML estática foi regenerada com os componentes reais, mas a política de URL do navegador bloqueou `file://`; não houve tentativa por alternativa. Isso impede tratá-la como evidência visual da versão modificada.
5. Publicar pelo fluxo existente quando as aprovações pendentes forem resolvidas; conferir a versão efetivamente servida e cache/PWA.

Não declarar a auditoria concluída ou o aplicativo publicado enquanto essas etapas estiverem pendentes.
