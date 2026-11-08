# Estabilidade do fluxo de eleições — 08/11/2026

Escopo: sala de eleições, voto público, apuração, resultado, próximo cargo e roteiro opcional Diretoria UMP. Auditoria aplicada com a skill `auditar-design-app-completo`; as demais áreas não fazem parte desta revisão.

## Defeitos e correções

- Os polls de três segundos invalidavam temporariamente a contagem e trocavam os ramos renderizados de `VotingPanel`, `NextElectionDialog` e `ResultPanel`. Agora uma leitura pendente preserva o último snapshot verificado, o mesmo formulário, ações, diálogo e fase de apuração. Falha efetiva de leitura continua bloqueando ações; cada ação faz novamente a leitura fresca exigida.
- Polls lentos do próximo cargo são serializados; respostas antigas não sobrescrevem a conferência feita pelo envio. O painel de votação descarta respostas de escopos/rodadas anteriores e respostas superadas por uma ação.
- O voto público não substitui por spinner uma cédula já carregada durante atualização de foco/realtime. Uma mudança real de rodada continua limpando a seleção e conferindo o recibo correspondente.
- A etapa selecionada permanece estável ao salvar o primeiro candidato. O organizador pode cadastrar outros e avançar explicitamente. Trocar o ID da eleição reinicia a escolha de etapa com a chamada reaproveitada.
- A etapa Dispositivos oferece “Usar apenas celulares”, salva o modo individual e só então avança. Não é mais necessário cadastrar urna para alcançar a escolha de modo. A chamada e as exigências de contagem permanecem.

Nenhuma regra de maioria, permissão, schema, voto real ou histórico foi alterado. A migração de igualdade exata de cédulas já aplicada em produção permanece intacta. Preservar o snapshot durante uma leitura pendente não autoriza uma transição com snapshot antigo: o preflight da ação e a trava do banco continuam ativos.

## Testes automatizados

- `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: 583 testes aprovados.
- `npm run build`: aprovado; avisos existentes de tamanho de bundle e importação estática/dinâmica de Sonner.
- Lint dos cinco componentes/páginas alterados e das duas entradas da fixture: permanecem 43 erros `no-explicit-any` e sete warnings preexistentes, comparados diretamente com `git show HEAD:<arquivo>`. Os dois erros novos detectados durante implementação foram corrigidos. Nenhuma regra de produção foi desabilitada.
- Seis testes montam os componentes React reais com hooks/effects e controlam timers/promises: diálogo aberto e rascunho durante 12 segundos de leitura pendente, Concluir/Confirmar estáveis, falhas bloqueantes e recuperação, resultado durante realtime, confirmação pública durante foco/rodada, permanência na etapa candidatos, troca de ID e descarte de resposta de rodada antiga. Primitivas visuais/portais são simuladas nesses testes; foco, DOM e responsividade foram conferidos separadamente no Chrome.
- A fixture compartilhada tem teste de duas abas, concorrência por browser, retry idempotente, múltiplas escolhas pertencentes à mesma cédula, bloqueio de fechamento faltante, reload e isolamento entre namespaces. O teste que bloqueia qualquer transporte real continua aprovado.

## Conferência no Chrome com dados fictícios

Executada pelo agente root na fixture isolada, namespace `ump-stability-1417`, latência simulada de 120 ms:

1. Criou Presidente pelo roteiro opcional e confirmou uma presença fictícia.
2. Adicionou dois candidatos, permanecendo no cadastro depois do primeiro; avançou explicitamente e escolheu apenas celulares, sem urna.
3. Abriu voto pessoal em popup, votou, conferiu chegada da cédula ao painel e bloqueio de segundo voto após reload do popup.
4. Apurou, confirmou e concluiu Presidente, Vice-presidente, 1º secretário, 2º secretário e Tesoureiro pela interface. Recarregou no terceiro cargo. Cada cargo recebeu chamada confirmada, modo individual e candidatos inicialmente vazios.
5. Conferiu mensagem de roteiro concluído e lista com exatamente os cinco cargos finalizados, cada qual com uma presença e uma cédula, mantendo todos os resultados anteriores.
6. Manteve diálogo Próximo cargo e apuração por sete segundos (mais de dois polls), sem substituição da árvore acessível nem perda de foco. Alternar abas preservou confirmação da cédula.
7. Conferiu diálogo em 375, 390, 768, 1024 e 1440 px, sem overflow horizontal e com foco preservado. Console sem erros; avisos existentes de React Router future flags e descrição de diálogo.

O QA ocorreu antes dos ajustes finais de lint e da antecipação da consulta após mudança de status; estes não alteraram regras nem estrutura visual. Publicação e verificação da versão servida pertencem ao fluxo de entrega do agente root e devem ser registradas separadamente.

## Como repetir isoladamente

Com `tests/vite.diretoria.config.ts` em execução na porta 8083, abrir:

`http://127.0.0.1:8083/__diretoria/eleicoes?role=diretoria&namespace=ump-stability-new&delay=120`

Escolher namespace novo para começar outro conjunto fictício. O parâmetro é opt-in; sem ele a fixture anterior continua em memória por documento. Com ele, somente cinco tabelas sintéticas de eleições persistem em `ipnc-fixture:elections:v1:<namespace>`. Links de voto em nova aba e navegações internas preservam o parâmetro. `storage` notifica as outras abas e Web Locks serializa escritas da fixture. Nenhum transporte Supabase real é habilitado.

Limites: a fixture reproduz as condições necessárias ao ensaio, não é um banco PostgreSQL nem substitui testes SQL de concorrência. O roteiro de cargos continua sendo metadado local do navegador do organizador; eleições e resultados ficam no backend. O ensaio desta revisão não lançou votos nem alterou eleições reais.
