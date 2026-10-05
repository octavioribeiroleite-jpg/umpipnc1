# Módulos alterados nesta subetapa — 05/10/2026

Este documento descreve os patches de acessibilidade, isolamento de cache, snapshot visual, apresentação eleitoral e tratamento de erros financeiros delegados após a inspeção inicial. A matriz completa de superfícies está em `matriz.md`; as medições de navegador estão em `cobertura-navegador.md`. As mudanças da chamada EBD e dos demais módulos conduzidas pela coordenação possuem evidência própria e não recebem aprovação por este texto.

## Camisas, campanhas e encomendas

**Finalidade e ações existentes:** acompanhar campanhas/lotes, pedidos, pagamentos, entrega, compras, vendas e estoque. Ações financeiras continuam passando pelos mesmos handlers e APIs. Os rótulos não alteram totais, estoque, parcelas, idempotência, permissão de gravação ou a guarda `FinancialRoute`.

**Componentes alterados:** `src/components/financas/EncomendasTab.tsx`, `CamisasTab.tsx`, `CampanhasCamisasTab.tsx`. São 43 associações explícitas entre Label e controle, com prefixo `useId` por instância e identificação por índice/tamanho nas linhas repetidas. Busca e filtros de encomendas possuem nomes acessíveis. A correção cobre Nova/Editar encomenda, pagamento, compra/venda, criar/editar campanha e adicionar lote. Estados de submitting, validação, valores e transições foram mantidos.

`StableRefreshBoundary`, usado por `pages/Camisas.tsx`, conserva a visualização anterior durante uma atualização. O clone agora passa por `src/lib/decorative-snapshot.ts`, que remove IDs, nomes e referências, e o overlay fica inert/aria-hidden com controles fora da sequência de Tab. A árvore React original e os rascunhos não são alterados. Isso não muda o significado de pagamento pendente/confirmado nem executa salvamento.

**Como conferir isoladamente:** abrir `/__diretoria/camisas`, Encomendas/Nova Encomenda; verificar nome acessível dos campos/filtros, múltiplas linhas, label clicável, Tab e rascunho ao redimensionar. Demais modais exigem suas próprias interações. A coordenação relatou revalidação dos nomes em Nova Encomenda/filtros. Para o clone, é necessário provocar uma atualização com atraso local e confirmar que apenas a árvore viva possui IDs e recebe foco. O teste Node verifica transformação sem mudar a árvore original, mas não substitui essa interação de browser.

## Identidade principal e cache de consultas

**Finalidade:** manter os dados consultados vinculados à identidade que os recebeu. O QueryClient real mostrou reutilização de resultado ainda fresco após troca de conta quando a chave não continha o usuário.

**Componentes/dependências:** `src/contexts/AuthContext.tsx`, `src/lib/auth-query-cache.ts`, QueryClient/TanStack Query já existente. Antes de aplicar outra identidade e ao limpar a sessão, o helper cancela leituras e remove apenas consultas principais dos namespaces registrados. Mesmo usuário/token refresh conserva o cache. Credenciais, localStorage global, EBD, tesouraria, papel e políticas não são reescritos.

**Pendência e confirmação:** uma consulta cancelada não confirma uma escrita. Cinco testes com QueryClient real demonstram logout e troca direta, preservação no refresh, isolamento da tesouraria e resposta de leitura atrasada. O AuthProvider real é substituído na fixture de browser; o fluxo completo de autenticação com backend isolado não foi certificado por esses testes.

## Calendário e comunicados pastorais

**Finalidade e ações:** filtrar programação por sociedade e compor avisos por prioridade/destinatário. Permissão continua sob `PastorLayout` e backend.

**Arquivos:** `src/pages/PastorCalendario.tsx` e `PastorComunicados.tsx`. A alteração acrescenta apenas nomes acessíveis a quatro controles: filtro por sociedade, prioridade, grupo de destinatários e sociedade destinatária condicional. Título/mensagem, destinatários, prioridade, handlers e envio permanecem iguais.

**Como testar:** em `role=pastor`, abrir calendário e o formulário de comunicados; conferir combos e RadioGroup na árvore acessível; selecionar sociedade específica e verificar o controle condicional. Não enviar um comunicado real para validar rótulos. A cobertura posterior depende dos labels/relatos da coordenação.

## Eleições: formulário e resultado de apresentação

**Finalidade e ações:** configurar a votação e apresentar um resultado já liberado. `src/pages/Eleicoes.tsx` recebeu associações Label/controle para Tipo, Nome, Cargo/Descrição, Vagas, Escolhas por voto e Sociedade. Nenhum limite, regra ou handler de voto foi alterado.

**Problema reproduzido:** com oito votos fictícios distribuídos 3–3–2, o detalhe mostrava zero de uma vaga preenchida e empate, mas a apresentação proclamava o primeiro colocado como vencedor. `EleicaoApresentar` reduzia votos sem separar escrutínios/cédulas/brancos e usava `results[0]`.

**Correção implementada:** `src/lib/election-results.ts` extrai exatamente o cálculo que já existia no `ResultPanel`. O detalhe e a apresentação agora usam esse painel, eliminando uma segunda interpretação do resultado. Cabeçalho, contador de progresso e condição `show_result` foram mantidos; o resultado só monta quando liberado. A apresentação amplia textos/fotos em larguras grandes. Não grava votos, altera escrutínios ou muda regras no servidor.

**Contrato preservado:**

- Cédulas são únicas por `ballot_id`, com fallback legado pelo id; branco participa do total de cédulas e não recebe posição de candidato.
- O primeiro escrutínio obedece à configuração existente: `absolute_50` exige `floor(cédulas/2)+1`; o outro caso mantém a maioria simples que o painel já aplicava.
- Há tantas vagas disponíveis quanto o total configurado menos eleitos anteriores. Eleitos anteriores são excluídos das próximas linhas de apuração.
- Empate na posição de corte não proclama arbitrariamente o primeiro da lista. No segundo escrutínio permanece a maioria simples e o tratamento de empate já existente; no terceiro permanece o desempate por idade, elegendo os mais velhos conforme o painel anterior.
- Validade visual continua definida pelo preenchimento das vagas, tal como no detalhe anterior. Este patch não acrescenta validação nova de quantidade de presentes nem muda definições eleitorais.

**Testes:** sete cenários comportamentais em `tests/election-results.test.ts`: empate 3–3–2, absoluta insuficiente/atingida com branco, múltiplas escolhas por cédula e vagas, segundo escrutínio, terceiro por idade, vazio/legado e erro de refetch preservando uma apuração confirmada. O teste não afirma unicidade criptográfica, integridade do banco, permissão de divulgar resultado, transmissão Realtime ou resultado de uma eleição real.

**Falhas de leitura eleitorais:** `ResultPanel` também usa a fronteira de snapshot: falha ao consultar votos produz erro/retry, sem chamar o conjunto inicial vazio de resultado inválido; refetch conserva apuração confirmada e marca desatualização. `EleicaoApresentar` trata erro/ausência na eleição e candidatos sem spinner permanente. Atualizações Realtime autoritativas de status/`show_result` continuam sendo aplicadas imediatamente, inclusive para ocultar um resultado, antes da reconsulta. As imagens de candidatos usam o schema gerado e filtram o JSON `photo_urls` para strings, sem cast `any`. A consulta completa de votos e as regras de sigilo/divulgação existentes permanecem sob o contrato atual; o patch não valida autorização de backend.

**Como conferir isoladamente:** `/__diretoria/eleicoes/election?election=finished` e `/__diretoria/eleicao/election/apresentar?election=finished` devem mostrar a mesma apuração 3–3–2, com empate e vaga em aberto, sem vencedor fabricado. Em draft/open sem `show_result`, conferir que não aparecem candidatos apurados/vencedores na apresentação. Estados de backend indisponível e concorrência precisam de cobertura própria.

## Finanças: falha de leitura não é zero

**Problema observado pela coordenação:** `/financas?state=error` mostrava saldos R$ 0 e ausência de cobranças; `/camisas?state=error` mostrava resumo financeiro zerado. A fonte descartava erros retornados pelo Supabase e substituía respostas nulas por listas vazias. O mesmo padrão existia em abas e no extrato.

**Arquivos:** `pages/Financas.tsx`, `components/financas/{CamisasTab,CampanhasCamisasTab,CobrancasTab,ComprovantesTab,ConfiguracoesTab,EncomendasTab,ExtratoDialog,GastosTab,MensalidadesTab,RelatoriosTab}.tsx`, novo `hooks/useSnapshotRead.ts` e `lib/snapshot-read.ts`. O painel lista e as contagens de `pages/Eleicoes.tsx` também passaram a distinguir falha de ausência de eleição/votos; a criação permanece indisponível sem diretórios consultados.

**Comportamento:** o coordenador de leitura publica dados somente quando todas as consultas daquele painel retornam sem erro. Sem consulta confirmada, mostra andamento/erro e opção de tentar novamente, sem renderizar os números iniciais. Com consulta anterior, conserva valores e listas e apresenta o aviso de dados possivelmente desatualizados. Uma resposta atrasada não sobrescreve a consulta mais recente; mudança de sociedade/ano/competência inicia um escopo sem snapshot confirmado. O zero continua válido quando vem de consulta bem-sucedida e vazia.

**Rascunhos e ações:** reconsultas no mesmo escopo não desmontam o painel. Em Configurações, retry e atualização de lançamentos preservam o formulário; recarregar seus valores ocorre no carregamento inicial/troca de escopo ou após salvar. O PDF oficial fica indisponível enquanto os dados do relatório estão em erro/atualização. Nenhuma fórmula, valor monetário, regra de cobrança/pagamento, handler de movimentação ou permissão de backend foi reescrita. As consultas de nomes/diretórios necessárias para compor o painel também precisam ter êxito para publicar o conjunto.

**Rótulos financeiros adicionais:** após achado de browser em Configurações, seus quatro campos e Ano receberam pares `useId`/`htmlFor`. A revisão de fonte corrigiu também os cinco controles da baixa em Cobranças, Ano/busca, motivo da rejeição em Comprovantes, Ano do relatório e descrição/valor/data/comprovante no GastoWizard. IDs de Mensalidades passaram a ser por instância e seus botões de editar/excluir receberam nomes. São alterações de atributos; handlers e campos permanecem os mesmos. A associação está implementada, mas modais não abertos pela coordenação continuam sem aprovação visual.

**Testes e limites:** `tests/snapshot-read.test.ts` possui três cenários comportamentais: erro inicial sem snapshot; erro parcial conservando valor anterior e recuperação para zero real; concorrência e descarte de escopo. TypeScript da aplicação passou. Testes do coordenador não são integração Supabase nem comprovação de todas as modais. A fixture adicionou falha mutável e emissão Realtime estritamente local para a coordenação conferir o refetch no browser, com teste que demonstra que a falha não apaga a base fictícia. A coordenação relatou erro inicial em sete telas e, em Finanças, falha de refetch conservando R$ 12.345,67 seguida de recuperação removendo o alerta. Os labels e larguras exatos serão consolidados em `cobertura-navegador.md`; esse relato não cobre todas as abas/modalidades de erro.

## Portal público da igreja

**Problema observado:** após confirmação da identidade fictícia, `state=error` deixava o Início silencioso; Programações/Avisos/Dízimos ignoravam os erros e podiam renderizar ausência de dados. A lista de sociedades da identificação tinha o mesmo padrão.

**Arquivo:** `src/pages/PortalIgreja.tsx`, nas cinco consultas de IdentificationForm, InicioTab, ProgramacoesTab, AvisosTab e DizimosPortalTab. Usa o coordenador de snapshot já testado e `QueryErrorState`. Grupos compostos só publicam dados quando todas as leituras terminam sem erro. Falha inicial mostra erro/retry; falha após snapshot conserva conteúdo com aviso. Não anuncia PIX não configurado nem nenhuma programação/aviso quando a consulta falhou. O retry da identificação preserva o nome digitado; o botão Entrar aguarda a primeira consulta de sociedades confirmada. RadioGroup recebeu o nome acessível da escolha.

**Escopo preservado:** não foram alterados registro/retorno de visitante, `register_portal_visit`, geração de device id, storage público, callback de identificação, cópia PIX ou permissões. A recuperação de uma leitura não registra visita. Não foram acrescentados Realtime ou polling às abas. Trocar de aba ainda segue a montagem/desmontagem existente.

**Validação:** TypeScript aprovado e três testes do coordenador aprovados após a alteração. Lint do Portal: nove ocorrências históricas de `any`, zero avisos, sem novo erro (o `any` do iterador de settings foi removido). A coordenação recebeu URLs com `portal=new/return&state=error` para revalidar identificação e quatro abas; as cinco superfícies possuem labels finais de erro corrigido na evidência consolidada.

## Fixtures e limites

`tests/fixtures/diretoria` monta componentes reais em `http://127.0.0.1:8083/__diretoria/`, com auth/backend substituídos e bloqueio de rede real. Foi ampliada para Auth, Reset, 404, pastor/aliases, portal e voto; Arquivos tem suporte mínimo ao filtro usado na busca e tipo; reunião processada é pré-preenchida em `state=long` ou `processed=1`.

Os cenários e limites exatos estão no README da fixture e no final da matriz. Não monta `FinancialRoute` e usa placeholders para EBD/Tesouraria, que possuem fixtures separadas. Ordem SQL, joins, RLS, sessões reais, IA, mensagens, comprovantes e unicidade financeira/eleitoral não são validados por sua montagem. Artefatos de teste não integram o entrypoint de produção.

## Verificação desta subetapa

- TypeScript da aplicação aprovado após os patches de finanças e da lista de eleições. O cast inválido de `election_votes` no ResultPanel foi removido usando a tabela tipada já existente no schema gerado.
- 16 testes: 7 apuração, 5 cache de identidade com QueryClient real, 1 sanitização de clone e 3 leitura atômica; todos aprovados. Os 10 testes dirigidos de eleição/snapshot foram repetidos após corrigir erro de leitura no painel/projetor e passaram; lint desses dois componentes e teste eleitoral sem erros/avisos.
- 3 testes da fixture: transporte bloqueado, falha/recuperação+eventos locais, busca de Arquivos; todos aprovados.
- Lint comparado ao conteúdo de HEAD nos componentes alterados: nenhum novo erro. Permanecem ocorrências históricas de `any`, dependências de hooks e exports de Fast Refresh; não declarar lint global limpo. Os novos helpers e testes não acrescentam erro de lint.
- Não houve browser, chamada de backend real, mensagem, voto real ou movimentação financeira por esta subetapa. A coordenação realiza a validação visual e conduz os checks finais/publicação.

Congelamento desta subetapa: produção liberada para a revalidação final pela coordenação após os últimos patches eleitorais e aprovação TypeScript. Somente documentação/evidências continuam em atualização até o encerramento da coleta.

## Contador eleitoral: isolamento de consultas e erro explícito

`src/hooks/useBufferedVoteCount.ts` conserva as regras existentes de liberação: cinco em cinco, ou número exato ao atingir o total de presentes/encerrar. O ciclo de leitura passou a ter ativo/fila/sequência locais ao efeito. Uma troca de electionId esconde imediatamente o snapshot anterior, antes do efeito, e cria outra fila; respostas tardias e cleanup da eleição anterior não publicam no escopo novo. Erro ou count ausente conservam o último valor confirmado com isError; a primeira falha não confirma zero. O projetor mostra indisponibilidade antes da primeira leitura e aviso/retry junto ao número antigo quando aplicável. Polling permanece3s.

Dois testes de `tests/buffered-vote-count.test.mjs` transpilaram e executaram o hook real com dispatcher de hooks/leituras controladas, sem duplicar sua fórmula: falha inicial, recuperação, falha após7votos conservando5visíveis, lotes, force, capacidade, count nulo, troca A→B, eventos simultâneos coalescidos e cleanup com resposta atrasada. Não são integração React DOM/Supabase, que permanece limite distinto. TypeScript e lint do hook/projetor/teste passaram.

A coordenação encerrou o smoke de browser com8/20 conservado durante falha e aviso removido após retry; `evidencias/eleicao-contador-refetch.json` registra antes/falha/recuperação. Coleta final encerrada e consolidada em cobertura-navegador/matriz, incluindo o Portal e rótulos finais. Produção desta subetapa está congelada; a coordenação conduz regressão completa e publicação.
