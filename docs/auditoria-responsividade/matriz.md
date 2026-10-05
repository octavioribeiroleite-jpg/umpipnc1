# Matriz real de superfícies IPNC — 05/10/2026

## Histórico do levantamento e estado atual

**Cobertura do levantamento inicial desta matriz: inspeção estática, browser pendente.** Nenhuma largura, interação, sessão autenticada, autorização de banco ou versão publicada foi validada pelo responsável durante esse levantamento inicial. Nessa etapa inicial não houve edição de código funcional, acesso ao ambiente de produção, criação de sessão, voto, presença, mensagem ou lançamento financeiro. As correções e evidências obtidas pelas outras etapas devem ser acrescentadas com revisão, ambiente e data próprios; o levantamento abaixo descreve a base encontrada, não aprova automaticamente uma revisão posterior.

- Base inicial: `1ca403eb1739d411a8de4e6d5b4d83219fc83f99`, branch `codex/auditoria-responsividade-ipnc`, remote `https://github.com/octavioribeiroleite-jpg/umpipnc1.git`; worktree `ipnc-auditoria-responsividade/Aplicativo IPNC`. `git status --short` estava vazio no início desta subetapa.
- Foram lidos `AGENTS.md`, o prompt integral de auditoria de responsividade/chamada, `README.md`, `package.json`, `tsconfig.app.json`, `vite.config.ts`, `src/App.tsx`, layouts, navegação, contextos e os relatórios de `docs/design-audit/`, além de `docs/treasury/WORKFLOW.md` e fontes das superfícies abaixo.
- `src/App.tsx` declara **36 entradas de rota**: 35 caminhos explícitos e o fallback `*`. Três caminhos montam a mesma página de sugestões. `/membro` monta somente o aviso de indisponibilidade.
- Os relatórios de 28/09 são históricos. Em especial, a descrição de tesouraria pública foi substituída em 05/10 por acesso privado com sessão própria. A revisão publicada atual não foi consultada nesta subetapa; os números de versão e commits citados pelos relatórios antigos não são evidência da publicação atual.
- Scripts existentes: `dev`, `build`, `build:dev`, `lint`, `preview`. Não existem scripts `test` ou `typecheck`. Comandos de tipos/testes/build seguem `AGENTS.md`; a linha de base e a validação final pertencem à coordenação e não são apresentados aqui como executados.

As tabelas de inventário por arquivo mais abaixo preservam o roteiro da inspeção inicial: naquele momento não havia largura testada nem correção implementada. **Esse estado histórico não descreve o encerramento.** O quadro final a seguir e `cobertura-navegador.md` são a autoridade para a execução local posterior; as listas de estados da fonte não implicam que todos foram reproduzidos.

## Estado final de cobertura por rota — coleta encerrada

Este quadro substitui o estado “browser pendente” do levantamento inicial **somente para os labels registrados**. Foram consolidadas **1296 medições**, **242 labels geométricos**, **1295 pares únicos label × largura** e **205 snapshots semânticos**, sem crescimento horizontal do documento nas medições registradas. Há 49 registros com candidatos locais de overflow; o diagnóstico distingue decoração/tabelas de transbordamento global. Os detalhes, interações, PNGs e hashes estão em `cobertura-navegador.md`.

São **36 entradas reais de App.tsx:35 caminhos e o fallback**. A coluna de largura é a união das medições associadas aos labels daquela rota, não uma declaração de que cada estado foi exercitado em todas essas larguras. “Registrado em fixture” comprova montagem/medição local; não certifica guarda, sessão, API ou persistência real. Os três aliases de sugestões possuem labels próprios.

| Rota | Labels geométricos / semânticos associados | União de larguras CSS px | Estado final e exemplo de evidência |
| --- | --- | --- | --- |
| `/` | 1 / 1 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `Dashboard admin` |
| `/auth` | 11 / 8 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `Autenticação carregamento final`; `Entrada final botões nativos` |
| `/reset-password` | 2 / 2 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Reset formulário válido`; `Reset link inválido` |
| `/reunioes` | 5 / 5 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/reunioes estado error`; `Reuniões erro corrigido` |
| `/reunioes/nova` | 1 / 1 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Reuniões nova reunião` |
| `/reunioes/:id` | 13 / 12 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `Reunião ID inexistente redireciona e informa erro`; `Reunião Ata` |
| `/tarefas` | 8 / 8 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/tarefas estado error`; `Tarefas erro corrigido` |
| `/calendario` | 11 / 11 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/calendario estado error`; `Calendário erro corrigido` |
| `/financas` | 19 / 19 | 320, 390, 768, 1024, 1440 | Registrado com componentes reais; FinancialRoute substituído nesta fixture. `/financas estado error`; `Finanças aba Camisas leitura indisponível` |
| `/tesouraria` | 9 / 0 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Componentes reais na fixture separada; gate/sessão privados não certificados. `Tesouraria consulta indisponível`; `Tesouraria administrador caixa e pendências` |
| `/camisas` | 11 / 11 | 320, 390, 768, 1024, 1440 | Registrado com componentes reais; FinancialRoute substituído nesta fixture. `/camisas estado error`; `Camisas nova encomenda nomes acessíveis corrigidos` |
| `/arquivos` | 7 / 7 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/arquivos estado error`; `Arquivos erro corrigido` |
| `/configuracoes` | 6 / 6 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/configuracoes estado error`; `Configurações erro corrigido` |
| `/usuarios` | 9 / 8 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/usuarios erro corrigido`; `/usuarios estado error` |
| `/plenarias` | 7 / 7 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/plenarias erro corrigido`; `/plenarias estado error` |
| `/plenarias/:id` | 1 / 1 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Plenária detalhe presença e anotações` |
| `/pastor` | 5 / 5 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `/pastor estado error`; `/pastor?role=pastor erro corrigido` |
| `/pastor/sociedade/:slug` | 2 / 2 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/pastor/sociedade/ump?role=pastor erro corrigido`; `Pastor sociedade` |
| `/pastor/calendario` | 1 / 1 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Pastor calendário` |
| `/pastor/comunicados` | 5 / 5 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/pastor/comunicados?role=pastor erro corrigido`; `Pastor comunicados final` |
| `/pastor/sugestoes` | 2 / 2 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/pastor/sugestoes?role=pastor erro corrigido`; `Sugestões alias /pastor/sugestoes` |
| `/pastor-sugestoes` | 1 / 1 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Sugestões alias /pastor-sugestoes` |
| `/sugestoes` | 2 / 2 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Pastor responder sugestão`; `Sugestões alias /sugestoes` |
| `/comunicados` | 8 / 8 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/comunicados erro corrigido`; `/comunicados estado error` |
| `/membro` | 1 / 1 | 320, 390, 768, 1024, 1440 | Somente aviso de indisponibilidade reproduzido; portal de membros não liberado. `Membro indisponível` |
| `/eleicoes` | 10 / 10 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/eleicoes estado error`; `Eleições erro corrigido` |
| `/eleicoes/:id` | 8 / 8 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Apuração eleitoral erro refetch conserva resultado`; `Detalhe eleitoral consulta indisponível` |
| `/vote/:electionId` | 5 / 5 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `Votação confirmação sem envio`; `Votação encerrada` |
| `/eleicao/:id/apresentar` | 5 / 5 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `Apresentação eleitoral erro explícito`; `Contador eleitoral erro conserva último número` |
| `/dizimos` | 1 / 1 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `Dízimos sociedade e valores` |
| `/igreja` | 20 / 20 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Registrado em fixture; estados específicos no relatório. `/igreja estado error`; `Portal Avisos erro corrigido` |
| `/visitantes` | 7 / 7 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/visitantes estado error`; `/visitantes?role=pastor erro corrigido` |
| `/estudos` | 7 / 7 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/estudos erro corrigido`; `/estudos estado error` |
| `/secretaria` | 21 / 0 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | Telas/componentes reais em fixtures EBD; sessão/backend real não certificados. `EBD Histórico chamada finalizada`; `EBD Acessos vazio` |
| `/aniversariantes` | 6 / 6 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `/aniversariantes erro corrigido`; `/aniversariantes estado error` |
| `*` | 1 / 1 | 320, 390, 768, 1024, 1440 | Registrado em fixture; estados específicos no relatório. `404` |

### Pendências locais resolvidas e limites que permanecem

- Busca Arquivos tem resultados positivos e vazios após 700 ms no registro próprio; a captura vazia de HMR foi excluída, sem contar uma página em branco como validada.
- Modal de usuários conserva rascunho, mantém ciclo de Tab e devolve foco ao botão; clone decorativo está sem IDs/focáveis e conserva o original. São os fluxos específicos dos arquivos de interação.
- Finanças conserva saldo e rascunho em falha/recuperação; as leituras iniciais exibem erro explícito. Campos de Configurações têm labels finais registrados. Nenhuma operação financeira real foi usada.
- Apuração da apresentação foi alinhada ao contrato do detalhe, com empate 3–3–2 sem vencedor. Erro de apuração conserva resultado com aviso. Contador final8/20 conserva valor durante erro e remove aviso após retry; regras de liberação em lotes permanecem iguais.
- Portal tem registro de erro corrigido na identificação e nas quatro abas. Os cenários antigos `/igreja estado empty/error` capturavam confirmação de identidade: não são aprovação do conteúdo; usar os labels finais explícitos.
- `Aniversariantes estado loading` montou dados normais porque o RPC da fixture não modelava loading. Não comprova skeleton/espera dessa rota. `Autenticação carregamento final` registra loading; as entradas prontas e fluxo posterior têm labels distintos.
- Reunião processada possui Resumo/Ata/WhatsApp extensos pré-preenchidos e capturados; isso encerra a lacuna visual desses estados, sem validar processamento IA.
- Renovação/remontagem da chamada conserva bloqueio sem confirmação; leitura manual confirma 1/8 sem duplicar escrita e leitura 5 s antiga não regride. Última linha e três PNG finais possuem evidência específica.
- Permanecem limites reais: PIN/AuthProvider/RLS/backend remoto, sessão legítima entre aparelhos, concorrência remota, envio/IA/upload/PDF real, instalação/retomada PWA, iOS/Android físico, teclado virtual, contraste instrumental e zoom nativo200%. A emulação CSS200% não substitui zoom nativo. Modais/estados sem label específico continuam sem evidência, mesmo quando a rota foi registrada.

## Perfis, sessões e fronteiras

| Identificador | Regra encontrada na fonte | Fontes e limite da evidência |
| --- | --- | --- |
| Principal | Papéis `admin`, `diretoria`, `visualizador`, `pastor`; `isManagement` = admin ou diretoria. Sociedade efetiva de admin/pastor pode ser selecionada; demais usam a sociedade do perfil. | `src/contexts/AuthContext.tsx`. O estado de loading/rolesLoaded e perfil desativado existe; RLS não foi executada por esta subetapa. |
| Diretoria PIN | Metadados próprios de operador/sociedade convivem com a sessão principal. | `src/contexts/DiretoriaSessionContext.tsx`, `src/pages/Auth.tsx`; preservar identificação e autoria. PIN da diretoria não concede poderes de tesouraria. |
| `F` — finanças antigas | `FinancialRoute` aguarda identidade/papéis, exige usuário e aceita admin, management, pastor ou conta de serviço da diretoria com sessão correspondente. | `src/App.tsx`; protege `/financas` e `/camisas`, não o restante das rotas por inferência. |
| `E-A` — administrador EBD | Sessão EBD própria; monta Home, Chamada e todas as telas administrativas. | `src/pages/Secretaria.tsx`, `src/integrations/supabase/ebd-client.ts`, `src/lib/ebd-session-storage.ts`. |
| `E-P` — professor EBD | Classes/alunos filtrados por `professorClassId`; a rota monta Home e Chamada. Histórico, Turmas, Aniversariantes, Planilha, Configurações e Acessos exigem `isAdmin` no JSX. | `src/pages/Secretaria.tsx:635`, `:824`. Variantes de props professor de componentes isolados não são telas habilitadas na rota atual. |
| `T-A` / `T-S` — tesouraria | Sessão própria, acesso confirmado por `treasury_access`; admin vê todos os caixas; responsável de sociedade fica no caixa autorizado. | `src/pages/Tesouraria.tsx`, `src/hooks/useTreasuryIdentity.ts`, `src/integrations/supabase/treasury-client.ts`, workflow de 05/10. Ausência de login monta gate/popup, sem Dashboard financeiro. |
| Pastor | `PastorLayout` exige usuário e admin/pastor; conteúdo em árvore única. Sugestões também aceita management e escolhe layout segundo o contexto. | `src/components/pastor/PastorLayout.tsx`, `src/pages/PastorSugestoes.tsx`. Confirmar os três aliases com os mesmos papéis. |
| Público/eleitor | Auth, portal da igreja, recuperação, voto/apresentação e aviso de membros têm fluxos próprios. Público não significa autorização para ler valores internos. | Guardas e regras de cada página/RPC precisam de integração isolada. Nenhum voto ou registro de visita real é necessário para testar layout. |

`AppLayout` fornece navegação e tema, mas **não é uma guarda global de autenticação**. Nas linhas que citam “sessão principal”, o perfil descrito é o contexto de uso/ações encontrado; a autorização efetiva dos dados depende das consultas e das políticas do servidor. Abrir um shell sem dados não comprova acesso nem vazamento.

## Rotas ativas — inventário de fonte inicial

| Rota | Arquivo de origem | Perfis/guarda encontrados | Superfícies e estados identificados na fonte | Risco identificado na base |
| --- | --- | --- | --- | --- |
| `/auth` | `src/pages/Auth.tsx` | Público; login administrativo, diretoria PIN, entrada EBD e tesouraria | Seleção, PIN, identidade salva/confirmação, nome/função, login/senha, carregamento, erro, retorno, transição de entrada; popup Finanças | Enhancers imperativos dependem da estrutura do DOM; testar Voltar, teclado e nomes extensos sem liberar membros. |
| `/reset-password` | `src/pages/ResetPassword.tsx` | Sessão de recuperação válida | Link/sessão inválida, nova senha e confirmação, validação, salvando, sucesso/erro, retorno | Exercitar apenas conta descartável isolada. |
| `/` | `src/pages/Index.tsx` | Principal; visitante → auth; pastor → pastor; visualizador → aviso membro | Loading/papéis, resumo, atalhos, sociedade, calendário/dia, aniversários, comunicados e pendências | Contagens privadas, números longos, retorno de foco e troca de sociedade. |
| `/membro` | JSX inline em `src/App.tsx` | Aviso estático | “Portal dos membros ainda não liberado”, link de acesso responsável | Não montar `MembroHome` ou liberar funcionalidades como parte da auditoria. |
| `/secretaria` | `src/pages/Secretaria.tsx` | E-A/E-P, sessão independente | Perfil/PIN/nome, Home, oito views, reautenticação, sair; detalhamento abaixo | Prioridade máxima: interação da chamada, reconciliação e isolamento por turma/data/sessão. |
| `/configuracoes` | `src/pages/Configuracoes.tsx` | Contexto principal; gestão/PINs condicionados a admin | Cards Geral, Financeiro, Google Calendar, Gestão de Usuários, Secretaria EBD e PINs da diretoria/pastor/sociedades | São seções/cards, não tabs; campos gerais sem persistência e Conectar sem handler continuam limitações reais. |
| `/usuarios` | `src/pages/Usuarios.tsx` | Admin; demais redirecionados | Diretoria por sociedade/Geral; Membros; tabela/cards, criar/editar/desativar, login e senha, filtro | Duas apresentações de usuários exigem IDs/foco/ações sem duplicação problemática; sem credenciais reais. |
| `/financas` | `src/pages/Financas.tsx` | F | Geral/sociedade, indicadores, gráficos, recentes; Cobranças, Comprovantes, Movimentações, Camisas, Relatórios, Mais | Antigos `?tab=receitas/gastos/configuracoes` são normalizados. Não confundir seu livro com a tesouraria atual. |
| `/tesouraria` | `src/pages/Tesouraria.tsx` | T-A/T-S; gate sem acesso | Validação, popup/login, resumo/extrato, pendências, recebimento, conferência, banco, PINs, relatórios/anexos | Dados privados; URL `sociedade` não muda autorização. Erro não pode parecer saldo zero. |
| `/dizimos` | `src/pages/Dizimos.tsx` | Configuração por admin/pastor; demais veem informações PIX | Configurar chave/tipo/beneficiário/instruções, prévia/cópia; leitura via `MembroDizimos` | A descrição antiga de receitas/despesas nesta rota não representa o código atual. |
| `/camisas` | `src/pages/Camisas.tsx` | F | `CamisasTab`: Resumo, Campanhas, Encomendas, Compras, Vendas, Estoque | Mesma implementação também embutida em Finanças; validar ambos os contextos. |
| `/reunioes` | `src/pages/Reunioes.tsx` | Principal; ações segundo gestão/autoria | Lista/pastas por dia, busca/status/mês, loading/vazio, criar, abrir, exclusão | Títulos extensos, filtros e confirmação. |
| `/reunioes/nova` | `src/pages/NovaReuniao.tsx` | Principal; submissão exige usuário | Formulário, tipo/data/hora, moderador/participantes, validação, salvando/erro | Teclado móvel e rascunho durante resize. |
| `/reunioes/:id` | `src/pages/ReuniaoDetalhe.tsx` | Principal; gestão = moderador ou management | Registro, Resumo IA, Ata, WhatsApp, Pauta, Ações; aberta/fechada, processando, não encontrada | Subtelas são ferramentas internas; confirmações nativas também devem ser contadas. Sem disparar IA ou mensagem real. |
| `/plenarias` | `src/pages/Plenarias.tsx` | Principal; ações management | Tabs Plenárias/Membros, lista, nova plenária, excluir, vazio/loading | Quórum, membros e estado da plenária preservados. |
| `/plenarias/:id` | `src/pages/PlenariaDetalhe.tsx` | Principal; `canManage = isManagement` | Iniciar, presença/busca/recolher, notas, organização IA, ata final/edição/salvar, sincronização | Presença não deve ser testada em encontro real; rascunho e auto-save em fixture. |
| `/tarefas` | `src/pages/Tarefas.tsx` | Principal; ações conforme componentes/hooks | A fazer/Andamento/Concluída, quadro desktop, filtros, prioridades, detalhe, criar/editar/excluir | Mudança de estrutura por largura precisa preservar estado e foco. |
| `/calendario` | `src/pages/Calendario.tsx` | Principal; gestão por sociedade e admin | Semana/15 dias/Mês, calendário/dia, próximos eventos, filtros, detalhe, novo/editar | Datas/timezone, seleção e ações por toque; dia inteiro e evento vinculado a reunião. |
| `/arquivos` | `src/pages/Arquivos.tsx` | Principal; capacidades em `useFiles`/detalhes | Busca/tipo/categoria/ordem, cards, upload, detalhe, download/excluir, progresso/erro/vazio | Arquivo longo, URL assinada, modal/drawer, upload simulado. |
| `/comunicados` | `src/pages/DiretoriaComunicados.tsx` | Principal; envio exige usuário e sociedade | Lista, expansão, drawer novo aviso, prioridade, enviando/vazio/erro | Não enviar; observar área de texto, foco e altura limitada. |
| `/estudos` | `src/pages/Estudos.tsx` | Principal | Lista, novo, notas e rascunho, salvar, resumo WhatsApp, relatório anual, loading/gerando/erro | Conteúdo longo; não executar IA externa por necessidade apenas visual. |
| `/aniversariantes` | `src/pages/Aniversariantes.tsx` | Principal; gestão admin/management | Próximo/hoje/semana/mês/ano, filtros, notificações, pendentes, cadastrar/editar/ativar/excluir | Cliente principal diferente da versão EBD; nomes/datas e permissão de gestão. |
| `/pastor` | `src/pages/PainelPastor.tsx` | Pastor/admin via PastorLayout | Resumos, alertas, calendário/dia, sociedades, IA e notificações | Valores/gráficos/textos extensos; erro/repetir e loading. |
| `/pastor/sociedade/:slug` | `src/pages/PastorSociedade.tsx` | Pastor/admin | Sociedade, indicadores, reuniões, tarefas, membros, sugestão | Slug inexistente, recarregar, escopo escolhido e formulário. |
| `/pastor/calendario` | `src/pages/PastorCalendario.tsx` | Pastor/admin | Calendário, filtros, modos, próximos eventos, detalhes/formulário | Mesmo EventDialog; conferir layout pastoral e abertura por dia. |
| `/pastor/comunicados` | `src/pages/PastorComunicados.tsx` | Pastor/admin | Avisos, expansão, drawer, sociedade/destinatários/prioridade, enviando | Mensagem longa e erro, sem envio real. |
| `/pastor/sugestoes` | `src/pages/PastorSugestoes.tsx` | Pastor/admin ou management, escolha de layout | Não lidas/lidas, resposta, marcar leitura, excluir/confirmação | Guardas comuns aos aliases; testar contexto de sociedade. |
| `/pastor-sugestoes` | `src/pages/PastorSugestoes.tsx` | Mesma página anterior | Alias ativo, acesso direto/retorno/refresh | Cobertura não herdada sem abrir o alias em execução. |
| `/sugestoes` | `src/pages/PastorSugestoes.tsx` | Mesma página anterior | Alias presente no menu admin | Validar mesmo conteúdo/permissão e layout correspondente. |
| `/igreja` | `src/pages/PortalIgreja.tsx` | Público com identificação/retorno | Identificação, sociedade/visitante, boas-vindas, confirmação, menu; Início/Programações/Avisos/Dízimos | O fluxo pode registrar visita; usar somente backend fictício. Não reaproveitar dados internos indevidamente. |
| `/visitantes` | `src/pages/Visitantes.tsx` | Admin/pastor; busca depende de `canAccess` | Data/domingo, indicadores, lista, recorrentes, loading/vazio | Tabela e dados pessoais; fonte limita consulta a 1.000 registros, não assumir histórico completo. |
| `/eleicoes` | `src/pages/Eleicoes.tsx` | Admin/pastor | Tabs Cargos/Camisas, nova eleição/votação, cargos/modelos, excluir, vazio/loading | Configuração e quantidades; nenhum voto real. |
| `/eleicoes/:id` | `src/pages/EleicaoDetalhe.tsx` | Sem guarda de página `useAuth`; consultas/RLS e regras dos filhos | Candidatos/Modelos, Presença, Dispositivos, Iniciar; rascunho/aberta/finalizada e resultado | Acesso direto exige integração autorizada isolada; ausência de guarda visual não prova acesso ao banco. |
| `/vote/:electionId` | `src/pages/VotePublic.tsx` | Link/identidade/dispositivo/rodada próprios | Loading, link/token inválido, indisponível, encerrada, já votou, urna pronta, seleção, confirmar, branco/nulo, sucesso | Muitos candidatos/fotos, voto único, resultado desconhecido; nenhum voto em produção. |
| `/eleicao/:id/apresentar` | `src/pages/EleicaoApresentar.tsx` | Estado de eleição e liberação de resultado | Progresso, contador, apuração/ranking, resultado liberado, loading | Apresentação ampla e estreita; não confundir progresso com divulgação autorizada de votos. |
| `*` | `src/pages/NotFound.tsx` | Público | 404 em português, retorno | Testar URL inexistente, refresh e caminho longo. |

## Secretaria/EBD: abas, subdivisões e modais

Views são representadas por `src/lib/ebd-navigation.ts`: `home`, `chamada`, `historico`, `turmas`, `aniversariantes`, `planilha`, `configuracoes`, `acessos`. O histórico interno também conserva `day`, `edit`, `class` e `group` na URL. Navegação, identidade, dados e rascunhos não devem ser reiniciados por mera mudança de largura.

| Superfície | Arquivos reais | Perfil montado | Estados, diálogos e interações do roteiro inicial |
| --- | --- | --- | --- |
| Seleção de perfil | `components/secretaria/ProfileSelect.tsx`, `pages/Secretaria.tsx` | Sem sessão | Admin/professor, voltar ao login, tela curta, foco. |
| PIN e identificação | `components/secretaria/PinPad.tsx`, `pages/Secretaria.tsx` | E-A/E-P | Seis slots, teclado, incorreto, validando, nome do professor, retorno e renovação. Não persistir PIN. |
| Confirmar acesso | `pages/Secretaria.tsx` (`reauthDialog`) | E-A/E-P | Expiração, PIN errado, validação da mesma turma, formulário embutido, foco e modal sem saída acidental. |
| Home | `pages/Secretaria.tsx`, `pages/secretaria-home.css` | E-A/E-P | Resumo/encontro, dia aberto/fechado, sincronizando/desatualizado/erro, chamada, aniversários e comunicado semanal; gestão/admin somente E-A. |
| Workspace/navegação | `components/secretaria/SecretariaWorkspace.tsx`, `hooks/useEbdNavigation.tsx`, `lib/ebd-navigation.ts` | E-A/E-P | Voltar/Home/Sair, botão nativo Voltar, histórico interno, reload, restauração e confirmação de saída. |
| Chamada: turmas | `components/secretaria/ChamadaTab.tsx` | E-A todas; E-P autorizada | Sem turma, cards/ordenação/contadores, não iniciada, aberta, finalizada, dia fechado. |
| Chamada: alunos | Mesmo `ChamadaTab.tsx`; `lib/ebd-day.ts`, `lib/ebd-mutations.ts` | E-A/E-P conforme escopo | Marcar/desmarcar, nome longo, leitura por teclado/leitor de tela; estado não marcado versus ausência explícita; salvamento/erro/resultado desconhecido. |
| Chamada: visitantes | Mesmo `ChamadaTab.tsx`; callbacks em `pages/Secretaria.tsx` | E-A/E-P conforme escopo | Lista, adicionar nome opcional, cancelar/remover, pendente/erro, contador, teclado virtual. |
| Chamada: conclusão/relatório | Mesmo `ChamadaTab.tsx`; `lib/ebd-day.ts` | Turma conforme sessão; dia E-A | Finalizar/reabrir chamada, confirmação Fechar dia/Reabrir dia, PDF, operação concorrente, pendências e rodapé fixo. |
| Histórico: visão geral | `components/secretaria/HistoricoTab.tsx` | E-A na rota | Filtros 4 semanas/3 meses/todo período, gráfico, métricas, melhor/pior encontro, ranking, PDF e relatório trimestral. |
| Histórico: detalhes | `HistoricoTab.tsx`, `HistoricalChamada.tsx`, `lib/ebd-roster.ts` | E-A na rota | Dia, turma/alunos, visitantes, confirmado/aberto, fechar/reabrir, editar chamada histórica; transferidos/inativos conservam turma e data históricas. |
| Histórico: modais de frequência | `HistoricoTab.tsx` | E-A na rota | 100% presença, frequência <30%, nunca compareceram, detalhe de turma, listas vazias/extensas e scroll. |
| Turmas | `components/secretaria/TurmasTab.tsx` | E-A | Lista/criação/edição, faixa etária, turma seguinte, turma selecionada, ativos/inativos, incluir aluno, nascimento/revisão, ativar/inativar e tela de transferência. |
| Planilha | `components/secretaria/PlanilhaAlunosTab.tsx` | E-A na rota | Busca, turma/todas, status, tabela/cards, seleção em lote, editar nome, transferência individual/lote, ativar/inativar, exportação. |
| Importação CSV | Mesmo `PlanilhaAlunosTab.tsx` | E-A | Modal: arquivo → mapeamento/turma → prévia/revisão → resultado; duplicatas, inválidos, importando/erro. `importStep` admite 0–3; revisar o título que usa “de 3”. |
| Configurações EBD | `components/secretaria/ConfiguracoesEbdTab.tsx` | E-A | Senhas por sala, revelar/copiar, definir/trocar senha, confirmar remoção, loading/erro/antiga senha. |
| Acessos | `components/secretaria/AcessosEbdTab.tsx` | E-A | Turmas sem acesso/com acesso, nomes/horários, data e loading. |
| Aniversariantes EBD | Função `SecretariaAniversariantes` em `pages/Secretaria.tsx` | E-A | Mesmas seções de aniversariantes; cliente e chave de sessão próprios; reautenticação em expiração e geração de comunicado. |
| Sair | `pages/Secretaria.tsx` | E-A/E-P | AlertDialog continuar/sair, saindo, offline, limpeza de dados/sessão/navegação; resposta pendente não pode recolocar dados antigos. |

### Linha de base estática da chamada

Na base examinada, `ChamadaTab.tsx:110` usa `savingRef` global e `savingStudent` único. A presença visual é calculada pelo array `attendance`; `toggleAttendance` só atualiza esse array **depois** de `await saveEbdAttendance(...)`. Enquanto isso, `disabled={!!savingStudent || isReadOnly}` bloqueia todas as linhas. Existe feedback intermediário de reticências e “Salvando presença…”, mas o estado de presença só muda após a rede. Isso confirma dependência estrutural da resposta e bloqueio global, **não mede** latência, INP ou causa exclusiva da demora observada pelo usuário.

`ensureEbdSession` chama `ebd_session_valid`; `reportEbdWriteError` também tenta validar sessão e notifica atualização. A cadeia de sucesso/erro deve ser medida antes de reduzir requisições. `HistoricalChamada` compartilha o componente e possui proteção de revisão contra leitura antiga. `Secretaria.tsx` conserva escopo por perfil/turma/expiração/data. Preservar finalidade dessas proteções e verificar reads iniciados antes/durante/depois de uma escrita; a proteção atual por revisão não é, por si, prova de cobertura de toda corrida possível.

## Financeiro, tesouraria e camisas: subdivisões/modais

| Superfície | Fontes ativas | Perfis e estados a executar |
| --- | --- | --- |
| Visão Finanças | `pages/Financas.tsx`, `components/financas/ExtratoDialog.tsx` | F; escopo geral/sociedade, indicadores e extratos detalhados, filtros, loading/erro/vazio e valores altos/negativos. |
| Cobranças | `components/financas/CobrancasTab.tsx` | Pago/parcial/pendente/isento, competência, busca, tabela/cards, Dar baixa, Detalhes, reversão/exclusão com confirmação. |
| Comprovantes | `components/financas/ComprovantesTab.tsx`, `components/ReceiptLink.tsx` | Pendente/aprovado/rejeitado, prévia, Aprovar, diálogo Rejeitar e razão, indisponibilidade de arquivo. |
| Movimentações → Receitas | `components/financas/MensalidadesTab.tsx` | Contribuições/outras receitas, filtros de competência, Registrar Pagamento, Editar Pagamento/Receita, excluir pagamento/receita. |
| Movimentações → Gastos | `components/financas/GastosTab.tsx`, `GastoWizard.tsx` | Novo/editar/excluir; etapas descrição → valor → data → comprovante → confirmar; validação, upload, cancelamento e envio pendente. |
| Relatórios antigos | `components/financas/RelatoriosTab.tsx`, `financialReportPdf.ts` | Ano, indicadores/composição/categorias, receitas/gastos, PDF, prévia de imagem e falhas de anexo. Não aplicar regras do novo livro por analogia. |
| Mais | `components/financas/ConfiguracoesTab.tsx` | Valores/total, salvar, geração anual, histórico, excluir cobranças pendentes; erro e confirmação. |
| Camisas: seis tabs | `components/financas/CamisasTab.tsx` | Resumo/Campanhas/Encomendas/Compras/Vendas/Estoque; compra e venda em modais; estoque por tamanho e exclusão. |
| Campanhas | `components/financas/CampanhasCamisasTab.tsx` | Nova, editar, novo lote, histórico de lotes, excluir; menu de card, status e nomes extensos. |
| Encomendas | `components/financas/EncomendasTab.tsx` | Andamento/finalizados/todos, busca/filtros, nova/editar, pagamento, entrega, excluir; vários itens/tamanhos. |
| Login em massa | `components/financas/BulkLoginDialog.tsx`, montado em `pages/Usuarios.tsx` | Admin; confirmar criação, processando bloqueado, relatório/resultados e cópia. Somente identidade fictícia. |
| PIX da igreja | `components/financas/DizimosTab.tsx`, `components/membro/MembroDizimos.tsx` | Admin/pastor configura; leitura nos demais contextos; chave longa, copiar, QR/prévia e erro. |
| Acesso à tesouraria | `components/treasury/TreasuryAccessDialog.tsx`, `treasury-access.css` | Selecionar sociedade/admin; PIN ou conta; loading, tentativa inválida, indisponível, voltar/fechar, teclado; nenhum valor antes de autenticar. |
| Dashboard/visão geral | `components/treasury/TreasuryDashboard.tsx`, `treasury-dashboard.css` | T-A/T-S, sociedades permitidas, saldo/reserva/disponível, gráficos e tabela textual, atualizado/atualizando, erro/vazio. |
| Extrato | Mesmo Dashboard; `hooks/useTreasury.ts` | Apenas confirmados; busca/tipo/data, sociedade, totais filtrados/página, paginação, ajustar admin e anexo permitido. |
| Registrar recebimento | `components/treasury/TreasuryEntryDialog.tsx`, `treasury-forms.css` | T-S: valor, data, pessoa, descrição, Pix/Dinheiro; caixa fixo e status pendente; UUID estável, erro/reenvio sem duplicar. |
| Novo/conferir lançamento | Mesmo `TreasuryEntryDialog.tsx` | T-A: entrada/saída, sociedade, parcelas/reserva, forma, banco, confirmação/devolução/motivo; revisão concorrente, invalidade e pending. |
| Pendências | `components/treasury/TreasuryWorkflow.tsx` | T-A/T-S no escopo; aguardando confirmação/devolvido, motivo, paginação; conferir/ajustar só T-A. Valores não compõem saldo. |
| PINs das sociedades | `components/treasury/TreasuryPins.tsx` | T-A; definir/trocar/confirmar/desativar, configurado/ativo/inativo/indisponível; sessão antiga recusada após alteração. |
| Conferência bancária | `TreasuryWorkflow.tsx` (`TreasuryBankPanel`) | T-A; cadastro/correção, referência, data, direção, valor, aviso de duplicidade, busca/paginação, saldo livre/parcial/total, conflito de revisão. |
| Relatórios/prestação anual | `TreasuryWorkflow.tsx` (`TreasuryReports`), `lib/treasury-report.ts` | T-A consolidado ou sociedade; T-S própria; ano, download, preparando/erro; snapshot confirmado, saldo anterior e todos os anexos. |
| Comprovantes privados | `components/treasury/TreasuryAttachments.tsx`, `lib/treasury-receipt.ts` | T-A anexar/arquivar/reativar; T-S apenas confirmado ativo próprio; PDF/PNG/JPG, limite 10 MB, nome longo, indisponível e download. |
| Nova sociedade | `components/treasury/TreasuryFundDialog.tsx` | T-A; formulário/validação/salvando/erro, cancelar e estado sem caixas. |

## Demais componentes, ferramentas e diálogos ativos

| Grupo | Componentes/origens | Subsuperfícies a executar com fixture |
| --- | --- | --- |
| Usuários/configurações | `pages/Usuarios.tsx`, `pages/Configuracoes.tsx` | Novo/editar usuário, senha redefinida, remover/desativar, recusar cadastro, cargos/aprovação, própria conta, sociedades/Geral, filtro membros ativos/inativos/sem login, PINs geral/pastor/sociedades e EBD. |
| Reuniões/lista | `components/reunioes/ReuniaoCard.tsx`, `ReuniaoPastaData.tsx`, `ReuniaoFilters.tsx` | Agrupar/expandir por dia, status/mês/pesquisa, excluir com AlertDialog, loading e vazio. |
| Reuniões/edição | `components/reunioes/EditMeetingDialog.tsx` | ResponsiveDialog, data/título, cancelar/salvar, texto longo e teclado. |
| Registro | `components/reunioes/RegistroReuniaoEditor.tsx` | Editor/rascunho, salvando/erro, fechado/somente leitura e autoria. |
| Resumo IA | `components/reunioes/ResumoIATab.tsx` | Resultado/categorias, vazio, processamento/erro, revisão, texto longo. |
| Ata | `components/reunioes/AtaViewer.tsx` | Visualização/edição, PDF, organização e confirmação nativa quando disponível. |
| WhatsApp | `components/reunioes/ComunicacaoTab.tsx` | Texto/cópia e mensagem vazia/longa; não transmitir comunicação real. |
| Pauta/Ações | `components/reunioes/PautaEditor.tsx`, `pages/ReuniaoDetalhe.tsx` | Criar/editar/remover item; confirmações nativas para remover/processar/finalizar/reabrir/excluir ata. |
| Membros da plenária | `components/plenarias/MembrosTab.tsx` | Pesquisa, incluir, exclusão, lista extensa e nomes longos; diferente do componente financeiro órfão. |
| Tarefas | `components/tarefas/TaskStats.tsx`, `TaskFilters.tsx`, `TaskCard.tsx`, `TaskDialog.tsx`, `DeleteTaskDialog.tsx` | Prioridade/status, compacto/completo, atrasada/hoje, detalhe em diálogo, criação/edição, data em popover, responsável e exclusão. |
| Calendário | `components/calendario/CalendarViewSelector.tsx`, `EventCard.tsx`, `DayDetailDrawer.tsx`, `EventDialog.tsx` | Semana/15 dias/Mês, evento compacto/completo, detalhe do dia, criar/editar ou leitura; data/hora, dia inteiro, vínculo com reunião, estados de evento. |
| Arquivos | `components/arquivos/FileCard.tsx`, `FileFilters.tsx`, `UploadDialog.tsx`, `FileDetailsDialog.tsx` | Menu por toque, título extenso, filtros/ordem, arrastar/selecionar/upload/progresso, detalhes em drawer móvel ou dialog desktop, download/excluir e confirmação. |
| Estudos | `pages/Estudos.tsx` | Novo Estudo, detalhe/notas, resumo e diálogo de relatório anual; gerando/copiado/salvando. |
| Aniversários compartilhados | `components/aniversariantes/NextBirthdayCard.tsx`, `TodayBirthdays.tsx`, `WeekBirthdays.tsx`, `MonthBirthdays.tsx`, `YearCalendar.tsx`, `BirthdayCard.tsx` | Listas/calendário, nomes longos, ano desconhecido, ações permitidas, ausência de dados. |
| Aniversários/filtros/form | `BirthdayFilters.tsx`, `BirthdayFormDialog.tsx`, páginas consumidoras | Busca/departamento, novo/editar, pendente de revisão, ativar/inativar, excluir com confirmação, dia/mês/ano/observação. |
| Avisos de aniversário | `BirthdayNotifications.tsx`, `WeekAnnouncementCard.tsx`, `HomeBirthdayCard.tsx` | Ler notificação, gerar/copiar comunicado, token inválido/expirado e sem aniversários. |
| Pastor/resumos | `components/pastor/SocietyOverviewCard.tsx`, `AlertsSection.tsx`, `AISummaryDrawer.tsx`, `PastorNotificationBanner.tsx`, `PastorLoginNotification.tsx` | Sociedade/alertas, resumo IA em drawer, novas sugestões em dialog, leitura/cópia e erro. |
| Pastor/calendário | `PastorCalendarWidget.tsx`, `PastorEventCard.tsx`, `PastorDayEventList.tsx` | Mês/dia, eventos, seleção, vazio/longos, ações móveis. |
| Pastor/sugestão | `components/pastor/SugestaoForm.tsx`, `pages/PastorSugestoes.tsx` | Sociedade/área, conteúdo, enviar/responder pendente, não lidas/lidas e AlertDialog excluir. |
| Portal da igreja | Componentes internos em `pages/PortalIgreja.tsx` | Identificação de entrada, reconhecimento/retorno, boas-vindas, sheet de navegação, quatro tabs, eventos/detalhes, comunicados e PIX/cópia. |
| Eleições/configuração | `pages/Eleicoes.tsx`, `components/eleicoes/EditElectionDialog.tsx`, `ElectionCard.tsx` | Cargos/Camisas, criar/editar, regra/vagas/escolhas, estado da eleição e exclusão. |
| Eleições/etapas | `ElectionStepper.tsx`, `ElectionStepCard.tsx`, `pages/EleicaoDetalhe.tsx` | Candidatos ou Modelos, Presença, Dispositivos quando modo exige, Iniciar; rascunho/aberta/finalizada. |
| Candidatos/fotos | `components/eleicoes/CandidateForm.tsx`, `ImageCropDialog.tsx` | Nome/foto(s)/ordem, upload/remover, recorte, mais candidatos que colunas, seleção desabilitada fora do rascunho. |
| Presença eleitoral | `components/eleicoes/AttendanceList.tsx` | Buscar/adicionar/listar/remover, presença, nomes extensos e desabilitado; não confundir com chamada EBD. |
| Dispositivos | `components/eleicoes/DeviceRegistration.tsx` | Cadastrar/ativar/remover, diálogo da urna/QR/link; confirmação nativa remover; finalizada bloqueia ações previstas. |
| Votação administrativa | `components/eleicoes/VotingPanel.tsx` | Tabs Celular/Urna, QR ampliado, editar configuração, abrir/encerrar/rodada e confirmações, contagens e pendente/erro. |
| Resultado/apresentação | `components/eleicoes/ResultPanel.tsx`, `pages/EleicaoApresentar.tsx` | Ranking, estados/resultados liberados, empates/rodada conforme fonte, candidato longo e placares. |
| Voto público | Componentes internos em `pages/VotePublic.tsx` | Carrossel/fotos, seleção de candidatos/modelos, confirmar seleção/branco/nulo, já votou, urna autenticada, inválida e sucesso. |

Os caminhos abreviados na tabela são relativos ao diretório explicitado no começo de cada grupo; todos ficam em `src/`.

## Fundação responsiva, navegação e PWA

| Superfície | Fontes ativas | Casos obrigatórios ainda pendentes |
| --- | --- | --- |
| App principal | `components/layout/AppLayout.tsx`, `AppSidebar.tsx`, `TabletNavigationRail.tsx`, `MobileHeader.tsx`, `BottomNav.tsx`, `appNavigation.ts` | Desktop sidebar/recolhida, rail 768–1023, header/bottomnav móveis, Mais em Sheet, links admin, sair/confirmar, foco/skip link. Uma árvore de conteúdo é preservada. |
| Pastor | `components/pastor/PastorLayout.tsx`, `PastorSidebar.tsx`, `PastorMobileHeader.tsx`, `PastorMobileNav.tsx` | Guarda/loading, árvore única, nav móvel/desktop, safe areas e retorno de foco. |
| Cabeçalhos/cards | `components/layout/PageHeader.tsx`, `SectionHeader.tsx`, `ResponsivePrimitives.tsx`; `components/ui/card.tsx`, `app-card.tsx`, `summary-card.tsx` | Título/nome/valor completo, ações quebrando linha, contraste, loading e vazio. |
| Primitivos interativos | `components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `checkbox.tsx`, `switch.tsx`, `radio-group.tsx`, `select.tsx`, `tabs.tsx` | Alvos principais ~44px, nome acessível, foco, labels, erro, valor preservado em resize, selects com itens longos. |
| Portais/menus | `components/ui/dialog.tsx`, `alert-dialog.tsx`, `responsive-dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`, `calendar.tsx` | Abrir/fechar/Escape, foco inicial/retorno, colisão/altura, modal longo e teclado; tema EBD não vaza ao sair. |
| Listas/mídia | `components/ui/table.tsx`, `scroll-area.tsx`, `carousel.tsx`, `progress.tsx`, `skeleton.tsx`, `badge.tsx` | Rolagem localizada, todas as colunas/dados preservados, nomes extensos, navegação de fotos e barras. |
| Atualização/offline | `components/layout/PullToRefresh.tsx`, `components/OfflineBanner.tsx`, `UpdateAvailableBanner.tsx`, `UpdateAppButton.tsx`, `BuildStamp.tsx`, `lib/registerSW.ts`, `lib/refresh-site.ts`, `lib/refresh-queue.ts` | Voltar ao app, foco/reconexão, erro, atualização com formulário/modal aberto e versão efetivamente servida. |
| Instalação | `components/PWAInstallPrompt.tsx`, `components/layout/InstallButton.tsx`, `hooks/usePWAInstall.ts`, `lib/pwaInstall.ts`, `public/manifest.json` | Instalável/instalado/indisponível, fechar aviso, overlay com nav e teclado. |
| Cache | `public/sw.js` | Cache nominal `ump-cache-v9`; fonte exclui origens externas, API/Auth/Functions/Storage/OAuth e navegação do cache; inspecionar resposta real e atualização. Essa leitura não testa o service worker ativo. |
| CSS efetivamente importado | `index.css`, `responsive-foundation.css`, `auth-readability.css`, `identity-confirmation.css`, `society-selector.css`, `finance-responsive.css`, `camisas.css`, `camisas-separation.css`; `components/layout/diretoria-theme.css`; `pages/secretaria-home.css`, `pages/secretaria-theme.css`, `components/secretaria/secretaria-workspace.css`; quatro folhas `components/treasury/treasury-*.css` | Cascata e vizinhanças dos breakpoints, tema/portais, fontes, viewport pequeno, zoom, orientação e scroll. Nenhuma largura aprovada apenas pela presença de media query. |

## Cópias históricas e componentes fora do fluxo montado

Conferência de imports desde `src/main.tsx` e referências na árvore `src/`, sem considerar testes como ponto de entrada. A análise é estática: identifica ausência de caminho de importação no código atual, não autoriza apagar arquivos.

| Arquivo/grupo | Situação encontrada | Tratamento nesta auditoria |
| --- | --- | --- |
| `src/pages/Secretaria 2.tsx` | Reexporta implementação/tipo atuais, sem rota ativa. | Preservar compatibilidade; não corrigir a chamada nessa cópia. |
| `docs/archive/secretaria/Secretaria-2.2026-09-28.tsx.txt` | Original arquivado; README e manifesto de preservação acompanham. | Referência histórica não executável. |
| `src/pages/Aniversariantes 2.tsx`, `src/components/aniversariantes/BirthdayFormDialog 2.tsx` | Cópias sem alcance da entrada principal. | Preservar; não contar como segunda rota/tela testada. |
| `src/pages/MembroHome.tsx`, `AguardandoPermissao.tsx` | Fora do roteamento. | Não liberar ou substituir `/membro`. |
| `src/components/membro/MembroLayout.tsx`, `MembroInicio.tsx`, `MembroPagamentos.tsx`, `MembroEventos.tsx`, `MembroComunicados.tsx` | Dependem do fluxo membro não montado. | Não contar como cobertura ativa. **`MembroDizimos.tsx` é ativo** via `/dizimos`. |
| `src/components/financas/MembrosTab.tsx`, `ChargeCard.tsx` | Sem alcance da entrada principal na base. | Não confundir com `components/plenarias/MembrosTab.tsx`, que é ativo. Seus modais não são fluxo atual de Finanças. |
| `src/components/reunioes/ContribuicoesSection.tsx`, `IASection.tsx` | Sem alcance da entrada principal. | Não acrescentar essas seções à reunião atual sem mudança funcional autorizada. |
| `src/components/calendario/EventCompletionList.tsx` | Sem alcance da entrada principal. | O relatório antigo menciona esse componente, mas sua existência não comprova montagem atual. |
| `src/components/auth/SocietySelector.tsx` | Sem alcance; Auth possui sua própria implementação de seleção. | Não tomar alterações neste componente como correção automática de Auth. |
| `src/components/layout/BackConfirmGuard.tsx`, `ShareAppDialog.tsx`, `src/components/NavLink.tsx` | Sem alcance da entrada principal. | Back/compartilhamento ativos devem ser avaliados em seus consumidores reais. |
| Primitivos UI sem consumidor na base | `accordion`, `app-button`, `aspect-ratio`, `avatar`, `breadcrumb`, `chart`, `command`, `context-menu`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `sidebar`, `toggle-group`, `toggle` | Não são telas adicionais. Manter código e confirmar importação antes de atribuir cobertura. |
| CSS antigos de camisas | Refinamentos históricos não aparecem no grafo ativo; `camisas.css` e `camisas-separation.css` aparecem. | Editar a folha ativa e conferir imports; não apagar o histórico para reduzir a lista. |

## Prévias e fixtures locais disponíveis

A leitura inicial não executou prévias. Na extensão posterior descrita abaixo, o servidor Diretoria foi iniciado e compilado com dados fictícios, sem navegador. Comandos abaixo identificam os pontos de entrada; execução HTTP/build não equivale a cobertura visual.

| Fixture | Comando/ponto de entrada | Superfícies que permite preparar | Limitações concretas |
| --- | --- | --- | --- |
| Diretoria | `npx vite --config tests/vite.diretoria.config.ts`, porta atual 8083 (era 4176 na base), base `/__diretoria` | `tests/fixtures/diretoria/main.tsx`: Home, reuniões/nova/detalhe, tarefas, calendário, finanças, camisas, arquivos, configurações, usuários, plenárias/detalhe, comunicados, eleições/detalhe/apresentação, dízimos, visitantes, estudos, aniversariantes, sugestões; saída fictícia em auth. | Auth/client substituídos por `auth.tsx`/`backend.ts`; na base, papéis admin/diretoria e `isPastor=false`; extensão posterior acrescenta pastor, unauthorized e anonymous. Não monta `FinancialRoute`. Na base inicial não cobria pastor/portal/voto/reset; a extensão posterior os monta com dados fictícios. Continua sem comprovar login real ou tesouraria completa. Dados/mutações em memória não validam RLS/idempotência/concorrência. |
| Histórico EBD | `npx vite --config tests/vite.ebd.config.ts`, porta 4175; `/tests/fixtures/ebd-history.html` | `tests/fixtures/ebd-history.tsx`: histórico, chamada histórica, transferido/inativo, turma vazia, falha e fechamento remoto simulados; `role=professor` disponível no componente. | Intercepta fetch, substitui Realtime e identidade; validação de sessão retorna resposta simulada. Não prova professor autorizado no banco nem que essa variante é montada na rota real. |
| Navegação Secretaria | Mesma configuração; `/tests/fixtures/ebd-back.html` | Monta `Secretaria`, sessão sintética, retorno/reload/expiração visual e navegação. | Reutiliza backend mínimo do histórico; credenciais sintéticas não são sessão legítima. Cobertura de login, turma grande, latência/perda de resposta e todas as mutações deve ser acrescentada se necessária. |
| Tesouraria interativa | `npm run build` e `node scripts/treasury-ui-preview.mjs --serve`, porta 8081 | `tests/treasury-ui/app.tsx`/`hooks.tsx`: Dashboard/Workflow/EntryDialog reais, tesoureiro/admin/visitante, saldo zero, alto/negativo, consulta indisponível e pendências. | Hooks substituídos; sem Supabase. Alternar visitante monta Dashboard diretamente: não valida o gate privado da rota. Login/AccessDialog, sessão real, políticas, storage e PDF não são comprovados pela prévia; PDFs desabilitados ali. |
| Tesouraria HTML histórica | `scripts/render-treasury-preview.mjs` → `docs/treasury/preview.html` | Markup estático de componentes reais, valores “—”. | Não interativa, sem rede/dados; limitações históricas de abertura não são evidência de bloqueio atual. |
| PostgreSQL isolado | `tests/treasury-database.test.mjs`, `tests/ebd-history-database.mjs` | Migrations/regras em PGlite, dados fictícios efêmeros. | Não executar migrations históricas em produção. Stubs de Auth/Storage e conexão local não equivalem a múltiplas sessões remotas ou autorização completa do projeto. |
| PDFs e render/lógica | `tests/treasury-report.test.mjs`, `treasury-render.test.mjs`, `pastor-layout-render.test.mjs`, testes EBD e regressões restantes | Relatórios sintéticos, falhas de anexos, SSR, datas, autorização simulada e lógica. | Markup/regex/unidade não substituem interação, foco, teclado, RLS ou tempo visual. Resultados atuais ainda devem ser registrados pela execução. |
| CSV sintético | `public/alunos-teste-duplicatas.csv` | Casos de importação/duplicação previstos no repositório. | Ler/confirmar caráter sintético antes de usar; não importar no banco real. |

## Riscos e divergências de inventário

| Prioridade de validação | Evidência estática | Consequência/ação independente |
| --- | --- | --- |
| Máxima — chamada | `ChamadaTab` aguarda persistência antes de mudar presença e bloqueia globalmente as linhas. | Instrumentar clique→feedback, sessão, escrita e reconciliação em fixture; comparar cenários pequenos/grandes e resultados incertos antes de alegar causa/ganho. |
| Máxima — dados/sessões | Principal, EBD e tesouraria usam fronteiras diferentes; backend deve autorizar cada operação. | Manter RLS/PIN/autoria; não tratar esconder botão ou fixture com role como prova de segurança. |
| Alta — refetch/escopo | `HistoricalChamada` tem revisão local; Secretaria possui recarga/sync e escopo de sessão/data. | Cobrir leitura obsoleta e resposta tardia após troca/logout/fechamento; não restaurar lista inteira sobre mudanças de outros alunos. |
| Alta — financeiro | Histórico de 28/09 descreve leitura pública; fonte/workflow atual negam valores sem acesso. | Não usar relatório antigo para montar variante pública; manter somente confirmados nos indicadores e anexos privados. |
| Alta — acesso direto | AppLayout não autentica globalmente; detalhe eleitoral não tem guarda local explícita. | Validar estados sem permissão em backend isolado e diferenciar shell, bloqueio de consulta e carregamento interminável. Não há conclusão de vazamento por esta inspeção. |
| Alta — alcance de prévias | Diretoria omite FinancialRoute; tesouraria visitante monta Dashboard sem página; EBD inventa sessão de teste. | Usar para geometria/interação permitida, nunca para alegar integração autenticada completa. |
| Média — tema/modal | `pages/secretaria-theme.css` contém regras claras/específicas para `.ebd-theme` e `[role=dialog]`; há múltiplas folhas compartilhadas. | Abrir portais EBD e sair para outro módulo; verificar cleanup, contraste e dimensões, sem concluir pela descrição histórica de tokens. |
| Média — formulário/integração | Configurações Gerais/Financeiro usam defaults; botão Google Calendar sem handler. | Preservar escopo visual, registrar integração não implementada; não declarar salvamento/conexão testados. |
| Média — conteúdo e ação | Wizard gasto usa controles por etapa; planilha tem `importStep=3` mas título calculado “Passo ... de 3”; muitas tabelas/drawers. | Confirmar apresentação do resultado de importação; teclado, conteúdo longo, scroll e ação final devem ser exercitados. |
| Média — cópias e aliases | Várias implementações sem consumidor e três rotas da mesma página. | Corrigir consumidor ativo e testar aliases explicitamente; não inflar cobertura contando órfãos. |

## Matriz de viewports e evidência a preencher

| Conjunto | Larguras previstas (CSS px) | Estado nesta subetapa |
| --- | --- | --- |
| Todas as 36 entradas de rota e interações principais | 320, 390, 768, 1024, 1440 | Nenhuma executada; inspeção estática, browser pendente. |
| Compartilhados, Secretaria e casos problemáticos | Acrescentar 360, 375, 412/430, 540/600, 820, 1280, 1920, 2560 | Nenhuma executada; incluir vizinhanças de breakpoints efetivos. |
| Breakpoints encontrados que pedem fronteira | EBD 359/360, 479/480, 767/768, 1023/1024; tesouraria 639/640, 900/901, 1199/1200; layout principal md/lg | CSS lido; não é teste visual. |
| Altura/entrada | Retrato/paisagem, altura pequena, zoom 200%, texto ampliado, teclado virtual, resize com rascunho | Pendente; informar quando o ambiente não emula fielmente. |
| Navegadores/PWA | Navegadores realmente disponíveis, instalar/retomar/atualizar, revisão e cache | Nenhum navegador executado por esta subetapa. Emulação não equivale a aparelho real. |

Cada execução futura deve registrar: rota + subtela/modal; perfil/fixture; estado (loading/vazio/preenchido/erro/sem permissão/longo/pendente); largura **e altura**; navegador; revisão; interação realizada; problema observado; arquivo/correção; evidência antes/depois e limitações. Screenshot de login não aprova tela protegida.

## Próximo passo reproduzível

1. Coordenação registra baseline de tipos, testes, lint, build e revisão publicada separadamente desta leitura.
2. Priorizar a fixture de chamada com latência/falha/perda/refetch e filas por aluno/data/sessão; registrar feedback e confirmação como tempos diferentes.
3. Executar os módulos na ordem do prompt, utilizando as prévias isoladas existentes e ampliando somente as lacunas necessárias. Obter integração isolada legítima para regras que mocks não provam.
4. Acrescentar evidências reais à matriz sem substituir “browser pendente” por aprovação apenas com build, SSR ou leitura de CSS.
5. Após integração e verificação final, seguir `AGENTS.md` para main/GitHub/fonte Sites/deploy existente. Esta matriz não registra publicação nem autoriza mutação real de dados.

## Extensão posterior da fixture Diretoria — preparação para browser

Em 05/10 esta mesma subetapa recebeu autorização da coordenação para ampliar somente `tests/fixtures/diretoria/` e `tests/vite.diretoria.config.ts`, sem alterar `src` nem a fixture separada da tesouraria. A fixture agora monta Auth, ResetPassword, 404, todos os caminhos pastorais/aliases, PortalIgreja e VotePublic, além das rotas anteriores. Os componentes/CSS/enhancers são os reais; identidade/backend são substituídos. Nenhuma dessas páginas está aprovada visualmente por essa preparação.

- Configuração na porta **8083**, bootstrap de transporte anterior aos imports, aliases para os três clientes Supabase e CSP impedem chamadas a produção. REST/Auth/Functions/Storage e service worker retornam 403 localmente.
- Papéis `admin`, `pastor`, `diretoria`, `unauthorized`, `anonymous`; cenários `normal`, `empty`, `error`, `long`, `loading` e atraso artificial. Query permite retorno do portal, recuperação inválida, eleição aberta/fechada/inexistente, urna e já votou.
- URLs, comando, parâmetros e limites completos estão em `tests/fixtures/diretoria/README.md`. `controls=0` oculta o painel QA nas capturas.
- Build específico e TypeScript dos arquivos da fixture (com declarações Vite) aprovados; lint com zero erros e dois avisos Fast Refresh; um teste comportamental do bloqueio de transporte aprovado; GET local conferiu páginas/módulos 200/CSP e REST/SW 403. **Registro histórico: browser estava pendente; a execução posterior está no quadro final.**
- Não é integração autenticada: não valida RLS, PIN, voto único, permissões financeiras, Realtime, concorrência, anexos/AI externos ou PWA. A matriz de rotas continua exigindo evidência de cada estado/perfil/viewport.


## Atualização de 05/10 — evidências de navegador e correções posteriores

A coordenação executou navegador nas fixtures depois do levantamento inicial. A consolidação incremental está em `cobertura-navegador.md`: **611 medições, 98 labels, 610 pares únicos label × largura e 65 snapshots semânticos** em uma extração intermediária histórica. Ela foi substituída pelas contagens do quadro final; aquele relatório era parcial e vincula esses totais aos hashes dos JSON. Esse registro não converte todas as linhas acima em aprovado: só os labels/larguras efetivamente presentes constituem evidência geométrica. Screenshots e interações têm alcance separado; a subetapa de inventário não operou o browser.

Correções delegadas posteriores, distintas da leitura inicial:

- `components/financas/EncomendasTab.tsx`, `CamisasTab.tsx`, `CampanhasCamisasTab.tsx`: 43 associações Label/controle com IDs por instância, nomes nos filtros/busca e identificação de cada linha de item. A coordenação relatou revalidação de Nova Encomenda e filtros; não inferir que todos os outros modais foram revalidados por esse relato.
- `pages/PastorCalendario.tsx` e `PastorComunicados.tsx`: nomes acessíveis no filtro sociedade, prioridade, grupo destinatários e sociedade condicional. Browser posterior deve registrar labels correspondentes; não marcado aprovado nesta matriz.
- `pages/Eleicoes.tsx`: Tipo, Nome, Cargo/Descrição, Vagas, Escolhas por voto e Sociedade vinculados a seus rótulos visíveis com `useId`. Estados eleitorais/handlers/regras preservados; revalidação cabe à coordenação.
- Auth e snapshot visual de Camisas: correção restrita de cache na troca/saída da conta principal e clone decorativo inerte/sem IDs copiados. Reprodução, arquivos, testes e limites estão em `../desempenho-pwa.md`. Não alteraram SW, RLS, sessões independentes ou armazenamento global.
- Fixture Diretoria: `ilike` e OR simples de `ilike` para Arquivos passaram a produzir resultado efetivo de busca/tipo, sem imitar ordenação/SQL completo. `state=long` ou `processed=1` pré-preenche reunião processada, ata, mensagem, contribuição e sete categorias de resumo; nenhum processamento IA é executado.

### Histórico das correções incrementais (posteriormente revalidadas)

Finanças e abas passaram a bloquear zero/lista vazia oriundos de falha, publicar snapshots completos e conservar a última leitura com aviso em erro de refetch. Detalhes de arquivos e testes em `modulos-alterados.md`. A lista de eleições trata erro das consultas e contagens; a apuração da apresentação passou a usar o cálculo existente do detalhe, mantendo o resultado 3–3–2 empatado sem fabricar vencedor. `ResultPanel` e `EleicaoApresentar` também distinguem erro de consulta de resultado inválido, preservando snapshot com aviso e permitindo retry; falha inicial do projetor não fica em spinner eterno. Os rótulos de configurações/baixa/comprovantes/relatório e do formulário de gastos foram associados.

Após achado de browser no Portal, `pages/PortalIgreja.tsx` ganhou erro/retry e snapshots nas consultas de identificação, Início, Programações, Avisos e Dízimos; registro de visitante e mutações permaneceram iguais. A revalidação da coordenação consta nos labels finais de erro corrigido do Portal.

A fixture agora permite alternar falha de leitura em memória e emitir callbacks de Realtime locais por botões; isso amplia a simulação de estados, sem provar entrega remota. A coordenação relatou preservação de R$ 12.345,67 em Finanças durante erro de refetch e recuperação; a consolidação final aparece no quadro inicial e no relatório de cobertura, preservando os limites por estado.

## Estados reais que a fixture não comprova ou não modela fielmente

Este quadro complementa as listas por arquivo acima. “Não modelado” indica ausência de simulação fiel da transição/integração, mesmo quando o componente pode montar um estado visual. Um cenário possível na fixture só ganha cobertura de navegador com label/relato correspondente.

| Grupo e fontes ativas | Disponível para montagem isolada | Estados/transições ainda sem modelo fiel ou sem comprovação |
| --- | --- | --- |
| Entrada/Auth/Reset e contextos | Anônimo, perfis sintéticos, deny, loading, retorno/identificação, reset válido/inválido | Sessão emitida/revogada no servidor; PIN errado/expirado/troca de sociedade com autorização real; conta desativada, hidratação parcial de perfil/papéis e timeouts progressivos; envio/uso de e-mail de recuperação; expiração/token refresh; comunicação entre abas. AuthProvider real é substituído no browser fixture. |
| Home/Configurações/Usuários | Resumos/seeds, listas e formulários, empty/error/loading/long globais | Contagens reais sob RLS; transições específicas de erro por consulta; aprovação/revogação de acesso; senha/logins gerados, autorização de PIN, persistência após reload. Configurações gerais/financeiro e Conectar Google Calendar têm lacunas no produto já descritas, não viram integrações implementadas pela fixture. |
| Finanças/Cobranças/Comprovantes/Movimentações/Relatórios/Gastos | Tabelas/cards e modais com pequenas amostras; mutações locais genéricas | FinancialRoute não montado; permissões por sociedade/backend, baixa parcial/duplicada/resultado incerto, RPCs financeiras e autoria, upload real/recibo assinado/conferência, somas recalculadas no banco, geração em escala e concorrência; as funções/RPCs sem stub específico retornam fallback. Modal montado não comprova gravação. |
| Camisas/Campanhas/Encomendas/Compras/Vendas/Estoque | Formulários, campanha/lote/encomenda parcial fictícios e atualização de objetos locais | Transação financeira atômica, estoque insuficiente validado pelo servidor, reposição por RPC, exclusão vinculada, pagamentos concorrentes, idempotência e reconciliação; tabulação/rascunho por resize exige relato de interação. Listas repetidas/centenas de pedidos não estão modeladas pela pequena seed. |
| Dízimos | Settings PIX fictícios, formulário e leitura | Persistência no banco/escopo, cópia ao clipboard e destino externo só se relatados; nenhum pagamento real. Ausência de renda/despesa é característica da rota atual, não erro da fixture. |
| Tesouraria (fixture separada) | Dashboard/Workflow/EntryDialog com estados próprios de erro/valores/pendências e papéis simulados | Não monta página/gate/sessão real. Hook mutations simplificados; anexos vazios/upload noop; fetchTreasuryReport propositalmente indisponível; relatórios testados à parte. Consulta concorrente, revisão no banco, PIN criptográfico, autorização, assinatura e acesso de storage não comprovados. Placeholder Tesouraria na Diretoria não conta como esse módulo. |
| Secretaria/EBD | Fixtures histórico/navegação; fixture de latência separada com success/rejected/unavailable/lost/expired/closed e dados sintéticos | Sessões legítimas, RLS remota/Realtime entre aparelhos e eventos fora de ordem reais; migração/versionamento entre deployments e retomada instalada. Importação completa, duplicação, transferência e edição exigem seus estados/labels, não herdam aprovação da Chamada. Placeholder EBD na Diretoria não conta. |
| Reuniões/lista/nova/detalhe | Registro/Pauta e ferramentas; `processed=1`/long com Resumo/Ata/WhatsApp pré-preenchidos | IA processando/falha/quota/créditos/resposta real; criação de eventos/tarefas a partir de sugestões; geração da ata a partir do processo remoto; envio WhatsApp; gravação e restauração após reload, duas sessões concorrentes, reunião não encontrada com id real. Texto pré-preenchido não valida o pipeline de IA. |
| Plenárias/Membros/presenças/ata | Uma plenária aberta, membro/presença e formulário | Alteração de quórum concorrente, contagem/remoto, organização IA, resultado final/edição/auto-save persistido. Seed inicial de ata final é nula; estado final extenso precisa ser montado/registrado separadamente. |
| Tarefas | Uma tarefa, filtros/detalhe/formulário e listas vazias | Hooks de escrita utilizam fetch direto para Functions, bloqueado pelo bootstrap: sucesso de salvar/mover/excluir não é integração simulada completa. Otimismo/rollback por erro específico, atribuição cruzada e concorrência não modelados por esse seed. |
| Calendário principal/pastoral | Evento do dia, calendário, filtros, detalhe/formulário | Google Calendar/OAuth sem integração, conflitos/data timezone/recorrência completa, autorizações remotas e edição concorrente; relação evento/reunião depende da pequena seed e joins simplificados. |
| Arquivos | Busca `ilike` positiva/negativa, PDF e imagem via OR simples, formulário/detalhe | Sort/order continua noop; URL/download não representa PDF real, storage retorna recurso fictício, upload/progresso/limites remotos/integridade/arquivo inválido e exclusão vinculada não modelados. Debounce real precisa relato navegador; Node só validou filtro mock. |
| Comunicados principais/pastorais e sugestões/aliases | Avisos church/society, prioridades, expansão/formulários; sugestão sem resposta | Entrega/publicação remota, escopos reais, respostas/estado lido sincronizados entre usuários, confirmação de leitura, remoção concorrente. Mutações locais não autorizam nem comprovam envio; cada alias precisa label próprio. |
| Estudos | Um estudo com notas, formulários/rascunho, long/empty/error | Resumo IA/WhatsApp, geração de relatório anual com várias entradas, streaming/progresso/cancelamento e persistência real não modelados. |
| Aniversariantes | Um aniversariante do dia; list_birthdays stub; formulários | Notificações lidas/não lidas/pendentes extensas, tipos de calendário/aniversário29/02/fusos e moderação/IA/duplicação dependem de seed específica; permissões de escrita e RPC não são substituídas fielmente por operações genéricas. Versão EBD e principal permanecem distintas. |
| Pastor/dashboard/sociedade | Indicadores e quatro sociedades fictícias, resumo IA fixo | Nenhum resumo calculado/pago; refetch por foco, escopo real e role admin/pastor dependem de contexto substituído. Slug inexistente, destinatários e muitos dados precisam label específico; loading/error globais não cobrem falhas parciais. |
| Portal/Visitantes | Entrada/retorno fictícios, tabs, dia atual e uma pessoa de exemplo | register_portal_visit só emite UUID local, sem atualizar histórico real; identidade duplicada/expirada e recorrência não fidelizadas; dataset de até1000/mais de1000 visitantes não modelado. Não enviar ou registrar visitas reais. |
| Eleições/lista/detalhe/apresentação | Draft/open/finished/missing, cargo/camisa, candidatos/fotos e resultado sintético | Criação/abertura/encerramento/rodadas/maioria/empate e dispositivos dependem de RPC/Functions não modeladas fielmente; winner metadata, cédulas agrupadas e apuração podem ser incompletos na seed. Não inferir integridade por resultado visual. |
| Voto público/urna | Token fictício válido/inválido, já votou, seleção/cast local/sucesso, finished; long18 candidatos×8fotos | Garantia de voto único, autenticação de dispositivo, resposta perdida, empate/escrutínio seguinte, revogação, fraude/RLS/atomicidade não modeladas. Cast só deduplica ballot_id em memória; nenhum voto real. Loading/error são genéricos. |
| Membro/404 | Aviso estático real e NotFound real | Portal de membros não liberado; componentes órfãos listados acima não entram na cobertura ativa. |
| Compartilhados/PWA | CSS/primitivos reais, modais, nomes acessíveis e screenshots/DOM coletados pela coordenação | Há registro de modal em altura curta 600 × 320, ciclo de Tab, retorno de foco, clone e rolagem local específicos no relatório final. Teclado virtual/aparelho físico, leitor de tela, zoom nativo200%, gesto touch e PWA instalado permanecem sem comprovação; não generalizar os casos documentados. Fixture bloqueia workers/rede real; testes VM não são instalação. |

Nenhuma linha desse quadro autoriza uma mutação real. Manter ambientes sintéticos para montar/reproduzir estados; quando a integração não existe no modelo, registrar a lacuna em vez de chamar uma operação real para conseguir a tela.
