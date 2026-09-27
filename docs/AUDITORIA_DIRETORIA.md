# Projeto de revisão integral da Diretoria

## Alvo e critérios
Repositório: github.com/octavioribeiroleite-jpg/umpipnc1. Publicação: renovo-ipnc.octavioribeiroleite.chatgpt.site. Base GitHub origin/main 0f46283 está contida no código publicado; preservar as correções posteriores das versões 11–20.

Padrão solicitado: compacto, legível, com menos decoração, textos proporcionais e alvos de toque confortáveis. Não alterar regras de negócio, cálculos financeiros, permissões, banco de dados ou registros reais.

## Passo a passo
1. [x] Conferir GitHub, versão publicada, rotas, navegação e componentes compartilhados.
2. [x] Inventariar páginas, detalhes, abas, formulários e estados auxiliares.
3. [x] Corrigir fundação: cabeçalhos, tipografia, cards, botões, campos e diálogos.
4. [x] Navegação móvel, menu Mais, barra lateral e confirmação de saída.
5. [x] Início, reuniões, detalhes/ata, calendário, tarefas e formulários.
6. [x] Finanças: resumo, cobranças, comprovantes, receitas/gastos, relatórios e configurações; camisas e pedidos.
7. [x] Plenárias, membros, presenças; eleições, etapas e apresentação.
8. [x] Comunicados, estudos, arquivos, visitantes, aniversariantes, dízimos e sugestões.
9. [x] Administração: configurações, usuários e estados restritos.
10. [x] Segunda inspeção em 375, 390, 768, 1024 e 1440px, testes técnicos e preparação do pacote para publicação. A confirmação do deploy consta na entrega.

## Inventário de páginas
| Página | Rota | Componentes e superfícies | Estado |
|---|---|---|---|
| Index | `/` | aniversariantes/HomeBirthdayCard, pastor/PastorNotificationBanner, pastor/PastorLoginNotification, pastor/PastorCalendarWidget, pastor/PastorDayEventList | Revisada localmente |
| Reunioes | `/reunioes` | reunioes/ReuniaoFilters, reunioes/ReuniaoCard, reunioes/ReuniaoPastaData | Revisada localmente |
| NovaReuniao | `/reunioes/nova` | Cards, formulário e lista na própria página | Revisada localmente |
| ReuniaoDetalhe | `/reunioes/:id` | reunioes/PautaEditor, reunioes/RegistroReuniaoEditor, reunioes/ResumoIATab, reunioes/AtaViewer, reunioes/ComunicacaoTab, reunioes/EditMeetingDialog | Revisada localmente |
| Tarefas | `/tarefas` | tarefas/TaskCard, tarefas/TaskDialog, tarefas/DeleteTaskDialog, tarefas/TaskStats, tarefas/TaskFilters | Revisada localmente |
| Calendario | `/calendario` | calendario/EventDialog, calendario/EventCard, calendario/CalendarViewSelector, calendario/DayDetailDrawer | Revisada localmente |
| Financas | `/financas` | financas/MensalidadesTab, financas/GastosTab, financas/CobrancasTab, financas/CamisasTab, financas/ConfiguracoesTab, financas/RelatoriosTab, financas/ComprovantesTab, financas/ExtratoDialog | Revisada localmente |
| Camisas | `/camisas` | financas/CamisasTab | Revisada localmente |
| Arquivos | `/arquivos` | arquivos/FileCard, arquivos/FileFilters, arquivos/UploadDialog, arquivos/FileDetailsDialog | Revisada localmente |
| Configuracoes | `/configuracoes` | Cards, formulário e lista na própria página | Revisada localmente |
| Usuarios | `/usuarios` | financas/BulkLoginDialog | Revisada localmente |
| Plenarias | `/plenarias` | plenarias/MembrosTab | Revisada localmente |
| PlenariaDetalhe | `/plenarias/:id` | Cards, formulário e lista na própria página | Revisada localmente |
| DiretoriaComunicados | `/comunicados` | Cards, formulário e lista na própria página | Revisada localmente |
| Eleicoes | `/eleicoes` | eleicoes/ElectionCard | Revisada localmente |
| EleicaoDetalhe | `/eleicoes/:id` | eleicoes/AttendanceList, eleicoes/CandidateForm, eleicoes/VotingPanel, eleicoes/ResultPanel, eleicoes/DeviceRegistration, eleicoes/ElectionStepper, eleicoes/ElectionStepCard | Revisada localmente |
| EleicaoApresentar | `/eleicao/:id/apresentar` | Cards, formulário e lista na própria página | Revisada localmente |
| Dizimos | `/dizimos` | pastor/PastorLayout, financas/DizimosTab, membro/MembroDizimos | Revisada localmente |
| Visitantes | `/visitantes` | pastor/PastorLayout | Revisada localmente |
| Estudos | `/estudos` | Cards, formulário e lista na própria página | Revisada localmente |
| Aniversariantes | `/aniversariantes` | aniversariantes/NextBirthdayCard, aniversariantes/TodayBirthdays, aniversariantes/WeekBirthdays, aniversariantes/MonthBirthdays, aniversariantes/YearCalendar, aniversariantes/BirthdayNotifications, aniversariantes/BirthdayFilters, aniversariantes/BirthdayFormDialog, aniversariantes/BirthdayCard | Revisada localmente |
| PastorSugestoes | `/sugestoes` | pastor/PastorLayout | Revisada localmente |

## Escopo complementar
Secretaria EBD permanece com as correções das versões 18–20 e será verificada como destino da navegação. Área exclusivamente pastoral, portal de membros, votação pública e autenticação geral não recebem uma reformulação nesta etapa; componentes compartilhados serão isolados por escopo para evitar mudanças acidentais. Apresentação eleitoral preserva a escala própria para projeção.

## Verificação e limitações
Área publicada sem sessão de Diretoria disponível inicialmente. A inspeção autenticada local utiliza componentes reais com identidades e dados fictícios, sem tráfego ao banco real. Cobertura de interface não equivale a validação de políticas RLS nem a operações financeiras reais. Registrar resultados por superfície e não declarar cobertura que não foi executada.

## Achados iniciais
- Cabeçalhos de página variam de 20 a 36px e usam grandes superfícies decorativas.
- Cabeçalho móvel repete h1 com o nome do usuário; título da página vem abaixo.
- Cards alternam vidro/transparência, bordas e sombras; tokens aumentam bastante no desktop.
- Menu Mais encerra a sessão diretamente, ao contrário das outras opções de saída.
- Diálogos em grade não garantem minmax(0,1fr), causa do corte anteriormente encontrado no PIN.
- Áreas financeiras e detalhes usam estrutura própria: precisam de inspeção independente, não apenas ajuste do PageHeader.

## Resultado por página e fluxo
| Página | Avaliação e implementação | Conferência executada |
|---|---|---|
| Início | Boas-vindas, indicadores, cards e tipografia compactos | Eventos, comunicado e indicadores com dados longos |
| Reuniões | Cabeçalho e listagem unificados; botão de criação identificado | Busca, agrupamento e cartão de reunião |
| Nova reunião | Campos e ações no padrão compartilhado | Título, data, hora e participantes |
| Detalhe da reunião | Retornos identificados; seis cartões acessíveis por Enter/Espaço | Registro, Resumo IA, Ata, WhatsApp, Pauta e Ações; estados não processados |
| Tarefas | Indicadores, filtros, abas e formulário compactos | Lista preenchida, prioridade, nova tarefa e fechamento por Escape |
| Calendário | Mesma hierarquia e navegação mensal identificada | Grade, evento longo e formulário completo de evento |
| Finanças | Título correto, botão de pendências funcional, abas visíveis, controles sem ação removidos | Cobranças, baixa/detalhes, comprovantes, receitas, gastos, relatórios e configurações; troca de escopo |
| Camisas | Seis abas visíveis; opções de campanha identificadas | Resumo, campanhas, encomendas, compras, vendas, estoque; campanha, encomenda e pagamento |
| Arquivos | Cabeçalho, filtros e cards padronizados; ação de upload identificada | Nome longo, lista e diálogo de upload |
| Configurações | Cards/campos unificados; exclusão de usuário identificada | Seções geral, financeiro, integrações e gestão de acessos |
| Usuários | Ações móveis abaixo dos nomes, alvos de toque ampliados e ações identificadas | Cards de diretoria/membros, filtros e formulário de criação |
| Plenárias | Lista, abas e diálogo no mesmo padrão | Nova plenária, aba Membros e inclusão de membro |
| Detalhe de plenária | Retorno identificado, campos e cards consistentes | Presenças, quórum, anotações e ações de relatório |
| Comunicados | Cabeçalho/lista e formulário compactos | Lista preenchida e formulário com prioridade |
| Eleições | Lista e criação uniformes, ação de criação identificada | Cargos/Camisas e formulário de nova eleição |
| Detalhe de eleição | Nomes completos, duas colunas móveis; inclusão, upload e remoção identificados | Candidatos, presença, dispositivos e pré-requisitos para iniciar; sem iniciar votação real |
| Apresentação de eleição | Escala de projeção preservada intencionalmente | Tela aguardando votos nas cinco larguras |
| Dízimos | Campos, ações e preview no padrão compartilhado | Configuração PIX e estado incompleto/desabilitado |
| Visitantes | Cards/filtros e textos unificados | Resumo dos domingos e tabela com rolagem interna controlada |
| Estudos | Removido recuo duplicado; cartão acessível pelo teclado; retorno identificado | Lista, novo estudo, detalhe/anotações e retorno por teclado |
| Aniversariantes | Cabeçalho, cards e formulário no padrão compartilhado | Hoje, mês, calendário anual e novo cadastro |
| Sugestões | Ações em linha própria no celular, remetente legível e botões identificados | Lista preenchida, nome longo e ações |

## Correções transversais
- Tema exclusivo do AppLayout, inclusive diálogos em portais; Secretaria e área pastoral mantêm seus temas próprios.
- Títulos móveis 18px; texto de interface 12–14px; campos móveis 16px para evitar zoom involuntário no iOS.
- Cards sólidos, bordas discretas, espaçamento menor, foco visível e campos sem largura mínima que force corte.
- Cabeçalho móvel deixa de disputar a hierarquia h1 com o título da página.
- Menu Mais usa três colunas no celular; Sair pede confirmação. Cancelar mantém a página atual.
- Configuração financeira em escopo geral orienta selecionar sociedade, em vez de mandar refazer o login.
- Camisas tinha uma regra CSS posterior que anulava a grade: a segunda conferência identificou e corrigiu essa prioridade.

## Evidências e limites dos testes
- 22 rotas × 5 larguras = 110 verificações de renderização e limites horizontais, sem falha de tela nem conteúdo escapando fora dos contêineres de rolagem previstos.
- 22 rotas × 2 estados (vazio/falha de consulta) = 44 verificações adicionais, sem erro de renderização ou estouro horizontal. Isso não certifica toda a semântica de tratamento de erros do backend.
- Inspeção por screenshots das 22 páginas, mais diálogos e subfluxos listados acima. Foram usados nomes longos, valores financeiros e registros fictícios.
- Diálogos de campanha, encomenda, pagamento, cobrança, evento, tarefa, usuário, plenária, membro, eleição, upload, comunicado, aniversário e estudo abertos para conferir layout. Escape/cancelamento conferidos durante a navegação.
- Menu do perfil Diretoria conferido sem os atalhos administrativos; confirmação/cancelamento da saída conferidos no perfil administrador.
- 31 testes existentes passaram: legibilidade, regressão financeira, instalação PWA, navegação, presença e histórico EBD. TypeScript e build de produção passaram.
- ESLint dos arquivos de produção alterados: 81 erros preexistentes antes e depois, sem novos erros na comparação. Fixtures novas: zero erros, um aviso de Fast Refresh. Build mantém avisos anteriores de tamanho de bundle/importação dinâmica.
- A autenticação real, políticas RLS, transações financeiras, geração por IA, upload de arquivos reais e votação real não foram executados. A sessão publicada disponível estava na tela de acesso. Os testes locais não devem ser apresentados como operações reais em produção.
- Datas e cálculos de negócio existentes foram preservados; esta entrega é a auditoria de apresentação e navegação da Diretoria, não uma conciliação financeira.

## Reproduzir a vistoria
Execute `node node_modules/vite/bin/vite.js --config tests/vite.diretoria.config.ts` e abra `http://localhost:4176/__diretoria/`. As rotas seguem o inventário. Parâmetros `?state=empty`, `?state=error` e `?role=diretoria` controlam os cenários locais. Os dados ficam em memória e o cliente Supabase é substituído apenas nessa configuração de testes; não há alteração no entrypoint publicado.

## Publicação
Destino: endereço existente, audiência pública preservada. O pacote contém somente `.openai/hosting.json` e `dist/client`; os testes locais e arquivos de servidor/segredos não integram o pacote. Commit, versão e resultado do deploy serão confirmados na entrega após o retorno do serviço Sites.
