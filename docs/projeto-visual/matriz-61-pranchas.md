# Matriz das 61 pranchas — IPNC, 05/10/2026

Esta matriz cobre as pranchas 01–61, páginas 12–72 do PDF enviado pelo proprietário. Relaciona tela/rota, tratamento no código e evidência. As 36 declarações de rota de `App.tsx` incluem aliases e a rota curinga; subviews não foram transformadas em novas rotas.

**Estado:** implementação integrada; tipos, 223 testes e build aprovados. Nova publicação pendente da raiz. O deploy urgente `690f888`/`v29` é somente o incidente de acesso à Secretaria. [Estado completo, exceções e limites](README.md).

Cada linha aponta código atual, incluindo componentes já implementados na base e preservados nesta integração. A matriz é rastreabilidade de escopo, não prova de equivalência pixel a pixel, captura individual de 61 telas, teste de cada mutação ou certificação de acessibilidade.

## Como ler a evidência

- **T0:** TypeScript, suíte integrada de 223 testes e build aprovados. É verificação global, não teste específico de cada requisito visual.
- **TA:** testes de isolamento/limite de leitura/cache do acesso (`auth-access-isolation`, `auth-read-deadline`, `auth-query-cache`).
- **TE:** testes EBD de navegação, fila, presença, histórico, sincronização, permissões e snapshot/PDF. Incluem turma histórica e aluno transferido/inativo.
- **TT:** testes `treasury*`: domínio, PIN, renderização, banco isolado, comprovantes e relatórios.
- **TF:** `finance-regression`, `layout-readability` e `receipt-path`; preservação de cálculos/fluxos e leitura de nomes/valores.
- **TB:** `birthday-regression`. **TD:** `meeting-draft`: concorrência A/B, falha/retry, refresh, leitura e desmontagem.
- **TP:** `pastor-layout-render`. **TV:** `ballot-response`, `election-form-feedback`, `election-results`, `buffered-vote-count` e `slider-accessibility`.
- **B1:** medição representativa atual em [geometria-final.json](2026-10-05-geometria-final.json), limitada à rota/estado registrado; não implica inspeção de todas as abas ou operações daquela linha.
- **B0:** referência de geometria da primeira etapa em [geometria.json](2026-10-05-geometria.json); não foi promovida a validação final dos ajustes posteriores.
- **BM-R:** interação local de rascunho na reunião: digitar A, salvar, digitar B e alternar seção; redimensionamento registrado. **BM-EBD:** sessão própria de professor com falha da conta principal e renovação do PIN expirado.
- **BM-T:** Tesouraria fictícia: cinco campos, pendências fora dos saldos, valores bancários separados, PIN divergente/aceito e cancelamento da desativação. Desktop de 232 px medido.
- **BM-A:** portal/identificação, recuperação válida/inválida, retorno público e estado fechado de membros. **BM-V:** erro de voto preserva revisão/seleção; nova tentativa fictícia conclui.

Os testes estão em [tests](../../tests). Todos os testes de interação citados usam fixtures isoladas, sem gravação em produção. Os 55 registros de geometria final incluem dois registros anteriores ao conserto do calendário pastoral, explicitamente superados pelo reteste sem overflow. Não há alegação de 61 screenshots nem de 55 cenários diferentes.

## Entrada e Diretoria

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 01 | 12 | Entrada da IPNC | `/auth` | Cards sólidos, marca oficial e quatro acessos principais; administração secundária. [Auth.tsx](../../src/pages/Auth.tsx), [auth-readability.css](../../src/auth-readability.css). | TA; B0 |
| 02 | 13 | PIN e identificação | `/auth · etapas internas` | PIN, sociedade e identificação em etapas, retorno contextual e erro junto à credencial; sessões preservadas. [Auth.tsx](../../src/pages/Auth.tsx). | TA; B0 |
| 03 | 14 | Login administrativo | `/auth · login` | Formulário administrativo no padrão de acesso, rótulos persistentes e mensagens de falha. [Auth.tsx](../../src/pages/Auth.tsx), [dialog.tsx](../../src/components/ui/dialog.tsx). | TA; B0 |
| 04 | 15 | Visão geral da Diretoria | `/` | Próxima ação antes dos indicadores, agenda em área principal e atalhos/resumos organizados. [Index.tsx](../../src/pages/Index.tsx), [AppLayout.tsx](../../src/components/layout/AppLayout.tsx). | T0; B0 |

## Secretaria e EBD

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 05 | 16 | Secretaria • escolha de perfil | `/secretaria · entrada` | Perfil professor/administrador com alcance próprio; PIN e renovação no padrão de diálogo. Isolamento da conta principal corrigido no incidente. [ProfileSelect.tsx](../../src/components/secretaria/ProfileSelect.tsx), [PinPad.tsx](../../src/components/secretaria/PinPad.tsx). | TA; TE; BM-EBD |
| 06 | 17 | Secretaria • visão geral | `/secretaria · início` | Chamada e situação do dia na área principal; navegação e destinos administrativos filtrados por papel. [SecretariaWorkspace.tsx](../../src/components/secretaria/SecretariaWorkspace.tsx), [SecretariaNavigation.tsx](../../src/components/secretaria/SecretariaNavigation.tsx). | TE; B1 |
| 07 | 18 | Chamada • seleção de turma | `/secretaria · chamada` | Nome, contagem e situação em cards previsíveis; removidos troféu e destaque competitivo por percentual. Turma autorizada preservada. [ChamadaTab.tsx](../../src/components/secretaria/ChamadaTab.tsx). | TE; BM-EBD |
| 08 | 19 | Chamada • marcar presença | `/secretaria · chamada / turma` | Linha de presença confortável e estado por aluno. Mantida a fila existente com contagem confirmada separada das pendências. [ChamadaTab.tsx](../../src/components/secretaria/ChamadaTab.tsx), [useEbdAttendanceQueue.ts](../../src/hooks/useEbdAttendanceQueue.ts). | TE |
| 09 | 20 | Chamada • estados e fechamento | `/secretaria · chamada / estados` | Estados textuais, bloqueios de fechamento/PDF diante de pendências e visitantes em seção própria com ação de remoção acessível. [ChamadaTab.tsx](../../src/components/secretaria/ChamadaTab.tsx), [ebd-attendance-queue.ts](../../src/lib/ebd-attendance-queue.ts). | TE |
| 10 | 21 | Histórico e relatórios da EBD | `/secretaria · histórico` | Período/turma antes dos resultados; consulta, exportação e edição administrativa separadas. Filtro usa turma histórica e totais fechados. [HistoricoTab.tsx](../../src/components/secretaria/HistoricoTab.tsx), [HistoricalChamada.tsx](../../src/components/secretaria/HistoricalChamada.tsx). | TE; B1 |
| 11 | 22 | Turmas e alunos | `/secretaria · turmas` | Turmas e formulários alinhados; transferência e inativação com confirmação, preservando histórico e permissões. [TurmasTab.tsx](../../src/components/secretaria/TurmasTab.tsx). | TE |
| 12 | 23 | Planilha de alunos | `/secretaria · planilha` | Filtros rotulados, nome completo, coluna de cadastro preservada e rolagem localizada; ações individuais/em lote confirmadas. [PlanilhaAlunosTab.tsx](../../src/components/secretaria/PlanilhaAlunosTab.tsx), [table.tsx](../../src/components/ui/table.tsx). | TE |
| 13 | 24 | Senhas das salas da EBD | `/secretaria · configurações` | Fluxo existente de senhas mantido: mascaramento, estados e revelar/copiar só quando já permitido; diálogo e controles herdam o padrão. [ConfiguracoesEbdTab.tsx](../../src/components/secretaria/ConfiguracoesEbdTab.tsx), [dialog.tsx](../../src/components/ui/dialog.tsx). | TE; T0 |
| 14 | 25 | Histórico de acessos à EBD | `/secretaria · acessos` | Sala, professor e horário com hierarquia legível; loading, vazio e erro separados, com retry e preservação do último resultado. [AcessosEbdTab.tsx](../../src/components/secretaria/AcessosEbdTab.tsx). | TE; T0 |
| 15 | 26 | Aniversariantes | `/aniversariantes · também na EBD` | Destaque discreto, nome/data consistentes entre Home e lista; revisão de conflitos preservada. [Aniversariantes.tsx](../../src/pages/Aniversariantes.tsx), [HomeBirthdayCard.tsx](../../src/components/aniversariantes/HomeBirthdayCard.tsx). | TB; B1 |

## Tesouraria privada

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 16 | 27 | Finanças • acesso por sociedade | `/auth → Finanças · /tesouraria` | Acesso privado por sociedade e PIN mantido; popup de sociedades sem valores financeiros antes de autenticar. [TreasuryAccessDialog.tsx](../../src/components/treasury/TreasuryAccessDialog.tsx). | TT |
| 17 | 28 | Tesouraria • visão administrativa | `/tesouraria · administrador` | Visão consolidada e pendências separadas, atalhos administrativos identificados. Exceção: desktop 232 px e cards móveis compactos por sigla. [TreasuryDashboard.tsx](../../src/components/treasury/TreasuryDashboard.tsx), [TreasuryWorkflow.tsx](../../src/components/treasury/TreasuryWorkflow.tsx). | TT; B1; BM-T |
| 18 | 29 | Tesouraria • sociedade | `/tesouraria?sociedade=:id` | Recebimento como ação da sociedade, pendências fora do saldo confirmado e explicação de saldo/reserva/disponível. Sem controles administrativos novos. [TreasuryDashboard.tsx](../../src/components/treasury/TreasuryDashboard.tsx), [TreasuryEntryDialog.tsx](../../src/components/treasury/TreasuryEntryDialog.tsx). | TT; BM-T |
| 19 | 30 | Registrar recebimento • cinco campos | `/tesouraria · registrar recebimento` | Preservados exatamente valor, data, pessoa, descrição e Pix/Dinheiro; sociedade contextual e resultado Aguardando confirmação. [TreasuryEntryDialog.tsx](../../src/components/treasury/TreasuryEntryDialog.tsx). | TT; BM-T |
| 20 | 31 | Conferir, ajustar e confirmar | `/tesouraria · pendência / administrador` | Conferência administrativa existente preservada, incluindo composição, vínculo, confirmação/devolução e motivo. Base de formulário compartilhada. [TreasuryEntryDialog.tsx](../../src/components/treasury/TreasuryEntryDialog.tsx), [TreasuryWorkflow.tsx](../../src/components/treasury/TreasuryWorkflow.tsx). | TT |
| 21 | 32 | Conferência bancária | `/tesouraria · conferência bancária` | Total, vinculado e disponível mostrados separadamente; referência inteira e aviso de possível duplicidade mantidos. [TreasuryWorkflow.tsx](../../src/components/treasury/TreasuryWorkflow.tsx). | TT; BM-T |
| 22 | 33 | Extrato e prestação de contas | `/tesouraria · extrato / relatórios` | Ano/sociedade e modalidades de exportação visíveis; relatório e prestação anual separados. Bloqueio de anexo ausente preservado. [TreasuryWorkflow.tsx](../../src/components/treasury/TreasuryWorkflow.tsx), [treasury-report.ts](../../src/lib/treasury-report.ts). | TT |
| 23 | 34 | PINs financeiros das sociedades | `/tesouraria · PINs das sociedades` | Situação por sociedade, Definir/Trocar em diálogo e Desativar confirmado; PIN atual nunca exibido e invalidação explicada. [TreasuryPins.tsx](../../src/components/treasury/TreasuryPins.tsx). | TT; BM-T |

## Finanças e camisas

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 24 | 35 | Finanças da Diretoria | `/financas` | Identificação Finanças da Diretoria, seis seções completas e seletor móvel; resumo compacto sem juntar livros financeiros. [Financas.tsx](../../src/pages/Financas.tsx). | TF; B1 |
| 25 | 36 | Cobranças | `/financas · cobranças` | Consulta de detalhes e baixa continuam distintas; estados e valores preservados. Diálogos de formulário padronizados. [CobrancasTab.tsx](../../src/components/financas/CobrancasTab.tsx), [ChargeCard.tsx](../../src/components/financas/ChargeCard.tsx). | TF; T0 |
| 26 | 37 | Comprovantes | `/financas · comprovantes` | Prévia de imagem/PDF com dados ao lado ou abaixo; ações textuais, motivo da rejeição e proteção contra prévia de escopo antigo. [ComprovantesTab.tsx](../../src/components/financas/ComprovantesTab.tsx). | TF; B1 |
| 27 | 38 | Receitas e gastos | `/financas · movimentações` | Receitas/Gastos identificados; formulários, composição, datas e comprovantes existentes preservados sob a base comum. [Financas.tsx](../../src/pages/Financas.tsx), [GastosTab.tsx](../../src/components/financas/GastosTab.tsx). | TF; B1 |
| 28 | 39 | Relatórios e configurações financeiras | `/financas · relatórios / mais` | Relatórios e parâmetros separados; labels/legendas completos, apoio tabular e exportação com escopo existente. [RelatoriosTab.tsx](../../src/components/financas/RelatoriosTab.tsx), [ConfiguracoesTab.tsx](../../src/components/financas/ConfiguracoesTab.tsx). | TF; T0 |
| 29 | 40 | Camisas • resumo | `/camisas · resumo / aba em finanças` | Rota e aba usam CamisasTab; seis seções nomeadas e resumo distinguindo encomenda, pagamento, entrega e estoque. [Camisas.tsx](../../src/pages/Camisas.tsx), [CamisasTab.tsx](../../src/components/financas/CamisasTab.tsx). | TF; B1 |
| 30 | 41 | Camisas • campanhas | `/camisas · campanhas` | Modelo com imagem contida, nome/status e ações textuais; formulários de campanha/lote no diálogo comum. [CampanhasCamisasTab.tsx](../../src/components/financas/CampanhasCamisasTab.tsx). | TF; B1 (rota) |
| 31 | 42 | Camisas • encomendas | `/camisas · encomendas` | Base existente preservada: financeiro e entrega separados, nomes/itens completos, ações e filtros que acomodam o móvel. [EncomendasTab.tsx](../../src/components/financas/EncomendasTab.tsx), [finance-responsive.css](../../src/finance-responsive.css). | TF; T0 |
| 32 | 43 | Camisas • compras, vendas e estoque | `/camisas · compras / vendas / estoque` | Compras, vendas e estoque continuam seções próprias; cabeçalhos, totais e tabelas recebem a base comum. Cálculos existentes preservados. [CamisasTab.tsx](../../src/components/financas/CamisasTab.tsx), [camisas.css](../../src/camisas.css). | TF; B1 (rota) |
| 33 | 44 | Dízimos e contribuição | `/dizimos` | Favorecido/chave em leitura agrupada, cópia com feedback e configuração administrativa separada. Nenhuma chave fictícia virou dado real. [Dizimos.tsx](../../src/pages/Dizimos.tsx), [DizimosTab.tsx](../../src/components/financas/DizimosTab.tsx). | TF; B1 |

## Reuniões e plenárias

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 34 | 45 | Reuniões • listagem | `/reunioes` | Busca, situação e mês na mesma barra; grupos por data sem recuo móvel, mantendo abertura e ações secundárias. [Reunioes.tsx](../../src/pages/Reunioes.tsx), [ReuniaoFilters.tsx](../../src/components/reunioes/ReuniaoFilters.tsx). | T0; B1 |
| 35 | 46 | Criar reunião | `/reunioes/nova` | Identidade, agenda e participantes em três blocos de leitura; data/hora responsivas, nomes completos e moderador identificado. [NovaReuniao.tsx](../../src/pages/NovaReuniao.tsx). | T0; B1 |
| 36 | 47 | Reunião • pauta e registro | `/reunioes/:id` | Registro principal e pauta de apoio substituem grade de ferramentas; navegação mantém editores visitados montados e rascunhos. [ReuniaoDetalhe.tsx](../../src/pages/ReuniaoDetalhe.tsx), [RegistroReuniaoEditor.tsx](../../src/components/reunioes/RegistroReuniaoEditor.tsx). | TD; B1; BM-R |
| 37 | 48 | Reunião • IA, ata e comunicação | `/reunioes/:id · resumo / ata / WhatsApp / ações` | Rascunho/ata final identificados, leitura ampla, revisão antes de copiar; gravação aguardada e falha preserva texto. IA exige ação existente. [AtaViewer.tsx](../../src/components/reunioes/AtaViewer.tsx), [ComunicacaoTab.tsx](../../src/components/reunioes/ComunicacaoTab.tsx). | TD; B1; BM-R |
| 38 | 49 | Plenárias e membros | `/plenarias` | Listagem com busca, nome principal e exclusão secundária; Membros mantém seção própria e situação textual. [Plenarias.tsx](../../src/pages/Plenarias.tsx), [MembrosTab.tsx](../../src/components/plenarias/MembrosTab.tsx). | T0; B1 |
| 39 | 50 | Plenária • chamada, notas e ata | `/plenarias/:id` | Chamada, notas e ata em seções persistentes; presença textual, autosave serializado e quórum existente explicado, sem importar regras EBD. [PlenariaDetalhe.tsx](../../src/pages/PlenariaDetalhe.tsx), [usePersistedTextDraft.ts](../../src/components/reunioes/usePersistedTextDraft.ts). | TD; B1 |

## Tarefas, calendário e conteúdo

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 40 | 51 | Tarefas | `/tarefas` | Três colunas amplas/seletor móvel já aplicados na base; responsável, prazo e prioridade preservados com texto e mesma instância de cartão. [Tarefas.tsx](../../src/pages/Tarefas.tsx), [TaskCard.tsx](../../src/components/tarefas/TaskCard.tsx). | T0; B1 |
| 41 | 52 | Calendário | `/calendario` | Agenda priorizada no móvel, mês acessível, dia/evento separados e nomes completos em lista/detalhe; layout testado em tamanhos distintos. [Calendario.tsx](../../src/pages/Calendario.tsx), [DayDetailDrawer.tsx](../../src/components/calendario/DayDetailDrawer.tsx). | T0; B1 |
| 42 | 53 | Arquivos | `/arquivos` | Busca/filtros e menu acessível mantidos; upload no diálogo comum, pendência honesta e arquivo preservado após falha. [Arquivos.tsx](../../src/pages/Arquivos.tsx), [UploadDialog.tsx](../../src/components/arquivos/UploadDialog.tsx). | T0; B1 |
| 43 | 54 | Comunicados da Diretoria | `/comunicados` | Título/data/prioridade com hierarquia comum; mensagem legível expande no próprio card. Envio permanece no fluxo autorizado. [DiretoriaComunicados.tsx](../../src/pages/DiretoriaComunicados.tsx). | T0; B1 |
| 44 | 55 | Estudos | `/estudos` | Lista/conteúdo/notas em coluna de leitura; prévia do resumo e relatório legíveis, sem envio automático introduzido. [Estudos.tsx](../../src/pages/Estudos.tsx). | T0; B1 |

## Administração

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 45 | 56 | Configurações gerais | `/configuracoes` | Navegação por contexto, links para parâmetros financeiros e áreas administrativas; Google Calendar claramente indisponível, sem falso Conectar. [Configuracoes.tsx](../../src/pages/Configuracoes.tsx). | T0; B1 |
| 46 | 57 | Usuários e responsáveis | `/usuarios` | Nomes/metadados sem compressão; ações de credencial/remoção distinguíveis e formulários com base comum. Nenhuma credencial real na documentação. [Usuarios.tsx](../../src/pages/Usuarios.tsx). | TA; T0; B1 |

## Pastor e sociedades

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 47 | 58 | Painel pastoral | `/pastor` | Shell pastoral próprio, agenda/pendências antes dos resumos e textos maiores; nenhum retrato de pessoa inventado. [PainelPastor.tsx](../../src/pages/PainelPastor.tsx), [PastorLayout.tsx](../../src/components/pastor/PastorLayout.tsx). | TP; B0 |
| 48 | 59 | Pastor • sociedade | `/pastor/sociedade/:slug` | Retorno, sociedade e período no cabeçalho; leitura de resumos, reuniões e tarefas com escopo de acesso existente. [PastorSociedade.tsx](../../src/pages/PastorSociedade.tsx). | TP; B0 |
| 49 | 60 | Calendário pastoral | `/pastor/calendario` | Filtros explícitos, lista móvel e grade acessível com detalhe; títulos/diretrizes legíveis e correção de overflow com fonte ampliada. [PastorCalendario.tsx](../../src/pages/PastorCalendario.tsx), [PastorEventCard.tsx](../../src/components/pastor/PastorEventCard.tsx). | TP; B1 |
| 50 | 61 | Comunicados pastorais | `/pastor/comunicados` | Compositor com destinatários e prévia, corpo legível e fechamento acessível; guarda de envio/permissões preservada. [PastorComunicados.tsx](../../src/pages/PastorComunicados.tsx), [AISummaryDrawer.tsx](../../src/components/pastor/AISummaryDrawer.tsx). | TP; B1 |
| 51 | 62 | Sugestões e respostas | `/pastor/sugestoes · /pastor-sugestoes · /sugestoes` | Mesma apresentação nos três aliases, contexto/remetente e estados; resposta em área de leitura, ler/responder distintos e exclusão confirmada. [PastorSugestoes.tsx](../../src/pages/PastorSugestoes.tsx), [SugestaoForm.tsx](../../src/components/pastor/SugestaoForm.tsx). | TP; B1 |

## Portal e visitantes

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 52 | 63 | Portal da igreja | `/igreja · início / identificação` | Entrada pública com marca/conteúdo, identificação mantida e navegação simples; estados vazios tratados. Sem novos dados coletados. [PortalIgreja.tsx](../../src/pages/PortalIgreja.tsx). | TA; B1; BM-A |
| 53 | 64 | Portal • programação, avisos e contribuição | `/igreja · abas internas` | Programação/avisos/contribuição com leitura completa e cópia; navegação única por contexto, sem carregar gestão administrativa. [PortalIgreja.tsx](../../src/pages/PortalIgreja.tsx). | TA; B1 (rota); BM-A |
| 54 | 65 | Visitantes • visão administrativa | `/visitantes` | Período/contagens no topo, recorrência textual, nomes completos e rolagem localizada da tabela; escopo administrativo preservado. [Visitantes.tsx](../../src/pages/Visitantes.tsx). | TA; B1 |

## Eleições e votação

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 55 | 66 | Eleições • listagem | `/eleicoes` | Cargos/Camisas com cards consistentes, situação textual e abertura por teclado; exclusão com confirmação separada. [Eleicoes.tsx](../../src/pages/Eleicoes.tsx), [ElectionCard.tsx](../../src/components/eleicoes/ElectionCard.tsx). | TV; B1 |
| 56 | 67 | Eleição • preparação e acompanhamento | `/eleicoes/:id` | Stepper real, candidatos com foto contida/nome completo, presença/dispositivos padronizados; erros dos formulários preservam rascunhos. [EleicaoDetalhe.tsx](../../src/pages/EleicaoDetalhe.tsx), [CandidateForm.tsx](../../src/components/eleicoes/CandidateForm.tsx). | TV; B1 |
| 57 | 68 | Urna • seleção e confirmação | `/vote/:electionId` | Urna sem navegação administrativa, seleção/revisão/confirmação distintas e controles de foto rotulados. Erro de voto retornado mantém a revisão. [VotePublic.tsx](../../src/pages/VotePublic.tsx), [ballot-response.ts](../../src/components/eleicoes/ballot-response.ts). | TV; B1; BM-V |
| 58 | 69 | Apresentação da eleição | `/eleicao/:id/apresentar` | Apresentação com tipografia grande e andamento anônimo antes da liberação; ranking e apuração existente preservados. [EleicaoApresentar.tsx](../../src/pages/EleicaoApresentar.tsx), [ResultPanel.tsx](../../src/components/eleicoes/ResultPanel.tsx). | TV; T0 |

## Acesso e estados especiais

| Prancha | Página PDF | Tela | Rota / contexto | Implementação e código | Evidência |
| --- | --- | --- | --- | --- | --- |
| 59 | 70 | Recuperação de senha | `/reset-password` | Card de acesso com consulta de sessão, estado inválido claro, erros junto aos campos e próximo passo após sucesso. [ResetPassword.tsx](../../src/pages/ResetPassword.tsx). | TA; B1; BM-A |
| 60 | 71 | Portal de membros não liberado | `/membro` | Indisponibilidade intencional com marca, explicação e retorno; portal permanece fechado, sem cadastro adicional. [MemberAccessUnavailable.tsx](../../src/components/MemberAccessUnavailable.tsx), [App.tsx](../../src/App.tsx). | TA; BM-A |
| 61 | 72 | Página não encontrada | `* · rota inexistente` | Mensagem curta em português no padrão de acesso; retorno contextual à entrada ou Home autorizada. [NotFound.tsx](../../src/pages/NotFound.tsx). | TA; BM-A |

## Exceções que prevalecem sobre os desenhos

- Tesouraria: desktop aprovado com lateral de 232 px; entradas/saídas móveis preservadas; quatro sociedades em duas colunas, card compacto com sigla sem nome completo; altura pode crescer para não cortar valores/fonte ampliada.
- Sociedade: cinco campos e status pendente; composição, conferência, banco, saída, anexos e acesso permanecem no fluxo administrativo autorizado. Nenhuma soma com o livro antigo.
- Membros: `/membro` continua não liberado. Google Calendar: conexão marcada indisponível. Marca e fotografias reais existentes preservadas; nenhuma pessoa/foto real inventada.
- Sessões, papéis, autoria, fila EBD, cálculo de quórum, apuração e privacidade mantidos. Não foram criadas permissões, migrações ou operações reais para validar o visual.

## Limites e fechamento

O navegador foi emulado; não foram certificados aparelhos físicos, Safari, teclado virtual real, zoom nativo ou todos os recursos assistivos. O lint ainda contém dívida anterior: 278 erros/55 avisos, contra 308/66 na base auditada, sem diagnóstico novo na comparação por arquivo/regra/severidade/mensagem.

A publicação final, SHA e versão do Site serão informadas pela raiz somente após confirmação. Esta matriz não atribui uma revisão futura ao código validado.
