# Regressão e manutenção da Secretaria/EBD

05/10/2026. Roteiro de manutenção do comportamento confirmado e das pendências explícitas. Nunca usar presença, visitante, PIN ou fechamento real como dado de teste. A aplicação específica do guard foi autorizada e confirmada separadamente; [evidência de aplicação e pós-verificação](propostas/aplicacao-guard-20261005.json). Este roteiro de testes não autoriza outras operações remotas.

## Verificações reproduzíveis

Usar Node 22+ e o `package-lock.json` existente:

```sh
node --experimental-strip-types --test tests/ebd-attendance.test.mjs tests/ebd-attendance-queue.test.ts tests/ebd-permissions-database.test.mjs tests/ebd-history-database.mjs tests/ebd-pdf-snapshot.test.mjs
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/eslint/bin/eslint.js src/lib/ebd-attendance-queue.ts src/lib/ebd-day.ts src/components/secretaria/ChamadaTab.tsx tests/ebd-attendance-queue.test.ts
```

O primeiro comando aprovou **54/54**. O lint dirigido da fila/helper/Chamada aprovou. A rodada geral após congelamento passou tipos, 193/193 testes, build e diff-check. Lint continua reprovado em 298 erros/65 avisos frente ao baseline 316/63; os quatro avisos novos são Fast Refresh de fixtures, com dois avisos antigos removidos. Comandos, logs e hash da fonte estão em `final-checks/README.md` e `results.json`.

Para repetir concorrência nativa, enquanto o runtime temporário desta tarefa existir:

```sh
node scripts/test-ebd-postgres-concurrency.mjs /tmp/ipnc-pg-concurrency-oo6viwdt
```

O runner só aceita runtime sob `/tmp`, cria cluster novo com SCRAM e dados sintéticos, liga exclusivamente em loopback e encerra em `finally`. Não aceita URL de banco remoto. Dependências ficaram no diretório temporário, não no aplicativo. A evidência de 29 cenários contém os locks, resultados, versão e prova de shutdown; preservá-la separadamente da fixture PGlite de uma conexão.

## Invariantes que devem permanecer

| Invariante | Evidência automatizada | Validação visual complementar |
| --- | --- | --- |
| Intenção imediata não incrementa totais antes da confirmação | Queue: desired antes de resolver save, callback somente em confirmação | Tocar vários alunos e observar status/totais separados |
| Até três saves por fila e outros aguardam; aluno/data não duplica entre filas | Queue: cinco alunos, mesmo registro, outra data/turma, dispose e escopo novo | 8/150 alunos; navegar/renovar durante save |
| Rejeição afeta somente seu aluno | Queue/helper: outro confirmado preservado; nenhum aviso de sucesso em erro | Ver mensagem persistente e repetir só após erro resolvido |
| Timeout não cancela write | Promise não resolvida mantém `unknown`; PG aguarda lock e confirma depois do timeout da aplicação | Reconectar sem clique duplicado |
| Leitura desconhecida nunca vira sucesso por silêncio | Read diferente/falha conserva unknown e barreira | “Conferir” após renovação/reconexão, incluindo fila anterior |
| Uma confirmação não volta a unknown pelo timer anterior | Teste adversarial com duas verificações e resposta atrasada | Consulta automática lenta + conferência manual rápida |
| Escopo desmontado não recebe callback e não envia queued | Queue dispose; snapshot global retém apenas enviados pendentes | Back/forward/troca de perfil, sem ressuscitar intenções descartadas |
| Snapshot antigo não desfaz presença confirmada nem edição remota posterior já lida | Tickets monotônicos e reads em ordens distintas | Controles “Iniciar/Entregar leitura antiga” da fixture |
| Fechar/finalizar não passa por presença aceita durante validação | Helpers reais + queue: nova pendência dentro de ensure impede envio | Navegar entre telas durante validação lenta |
| PDF exige ausência de pendência e ticket da leitura ainda atual | jsPDF real para dia/período/trimestre, agregados reais e promises controladas; leitura antes/durante escrita rejeitada, leitura depois confirma 100% | Conferir aviso de atualização e download/layout |
| Refetch antigo não reabre status ou dia após alteração observada | Callback real de Secretaria com status/fechamento antigos entregue depois da alteração | Conferir aviso temporário de atualização e refetch seguinte |
| Professor só opera turma/dia permitido, sessão precisa ser válida | PGlite/PG com policies e helpers originais | Mock não substitui JWT/PIN/PostgREST isolados |
| Fechamento serializa com presença/visitante | PG nativo: ambas ordens, COMMIT/ROLLBACK e snapshot coerente | Tela recebe fechamento remoto e cancela queued |
| Finalizada bloqueia writes entre clientes com guard aplicado | PG baseline aceita; patch homologado rejeita sob o mesmo lock; corpo implantado idêntico ao aprovado | Gate SQL atendido, conforme evidência de aplicação; UI sozinha não fornece essa garantia |

## Regras para mexer na fila

`confirmed` precisa conter ID persistido. `unknown` significa resultado não estabelecido; não tratá-lo como ausência nem repetir automaticamente a escrita. Consultas podem começar antes de um COMMIT cujo retorno se perdeu. A mensagem de conferência é deliberada; um resultado diferente não prova que a requisição anterior foi cancelada.

O timer cobre a escrita, não a duração de consultas posteriores. Ao entrar no catch da escrita, ele deve ser cancelado antes de await de leitura. Verificações concorrentes devem conferir identidade da operação e estado atual antes de confirmar ou alterar mensagem.

`dispose()` não aborta writes enviados. Remover uma operação enviada da barreira ou limpar todas as filas ao renovar acesso permitiria um PDF/fechamento prematuro. A deduplicação global precisa sobreviver ao scope anterior. A fila é memória da aba e não oferece garantia entre navegadores; o PostgreSQL continua responsável por autorização e serialização.

Na UI, pendências de outro scope só podem aparecer para a data e IDs de aluno/turma autorizados da tela atual. Nomes vêm da lista atual, nunca do snapshot global. Após uma conferência assíncrona, testar componente montado, mesma fila/data e IDs ainda visíveis antes de aplicar as linhas. Troca de perfil que não consiga consultar uma linha antiga não pode presumir que ela foi confirmada.

Preservar a chave de montagem `${sessionScope}:${editingDate}` de `HistoricalChamada`. O hook principal precisa mudar de fila quando acesso, turma, validade ou data mudarem. Cuidado com tirar a data/validade de dependências para “otimizar” render: isso mistura resultados de contextos diferentes.

Os tickets de reconciliação são opacos ao consumidor. A linha salva depois do início de uma leitura prevalece sobre essa leitura; uma leitura iniciada depois pode trazer mudança remota legítima. Não limpar confirmações cedo demais nem comparar só a ordem de chegada da resposta. O refetch serializado complementa o merge e não cancela requests já enviados.

## PDF, histórico e snapshots

As três funções PDF síncronas exigem `snapshotVersion`, além de verificar pendências nas datas incluídas. Capturar com `captureEbdSnapshot()` **antes** de iniciar a leitura; não renovar o ticket no clique de geração mantendo dados antigos. `readEbdDay` já fornece a versão e Chamada relê o dia antes do PDF. Histórico guarda a versão do fetch junto dos dados; período/trimestre usam essa mesma versão, incluindo a espera pelas consultas de visitantes. Em `EbdSnapshotChangedError`, atualizar o histórico, avisar e aguardar nova solicitação; não gerar com dados ultrapassados.

`markEbdDataChanged()` incrementa a versão ao aceitar uma intenção, confirmar uma escrita e observar notificação local/remota. Apenas incrementa um número: não despacha evento. `notifyEbdChange()` incrementa e despacha uma vez; o callback de `useEbdSync` incrementa e agenda um refetch. A leitura não notifica, portanto não há recursão. Invalidar antes do debounce impede usar os 150 ms anteriores ao refetch para baixar dados antigos. A revisão é conservadora e global na aba; outra data também pode exigir nova leitura.

O callback principal de `Secretaria.readData` captura/confronta a versão antes de aplicar qualquer setter. O teste real reproduziu status finalizada→aberta e fechado→aberto causados por resposta atrasada; agora descarta essa resposta. As proteções de sessão/data continuam adicionais. Histórico mantém identidade de escopo e flag de montagem; leitura/geração antiga não publica após renovar/desmontar.

São 20 testes de snapshot/PDF, com geradores e jsPDF reais em memória; callbacks/cálculos são extraídos do código fonte por AST e executados com cliente/setters controlados. Não equivalem a render React, captura visual do PDF ou download. Registro: `fundacao-checks/ebd-pdf-snapshot.{json,log}`. A versão protege alterações locais e eventos recebidos; não substitui snapshot transacional no servidor diante de alteração remota ainda não observada.

O roteiro SQL prova totais transacionais do fechamento, não todos os agregados preparados no cliente. Não reformular histórico/percentuais como parte de uma mudança visual sem testes próprios. A correção administrativa de aluno transferido/inativo e identidade imutável estão cobertas por `ebd-history-database.mjs` e pela fixture de permissões.

Reabrir o dia preserva status existente e cria `finalizada` quando faltava. Uma turma previamente finalizada exige **Reabrir chamada da turma** antes de alterar presença após a proposta. Não transformar reabertura do dia numa abertura automática de todas as turmas.

## Medição de resposta

Meta de percepção local: 100 ms. A fixture usa latências fixas de 150 ms + 450 ms e alunos sintéticos. Medir marcação (`aria-pressed`), feedback/rAF e confirmação separadamente; informar n, p50/p95, tamanho da turma e revisão. A persistência ~600 ms da fixture não mede infraestrutura real. Dez cliques sequenciais não medem confiavelmente confirmação de cliques concorrentes, pois o coletor associa retorno à amostra corrente; usar asserções de identidade/fila para o burst e não publicar p95 concorrente a partir desse campo.

A repetição final com viewport 390×844 e zoom META+0 registrou marcação p95 de 2,1 ms para 8 alunos e 7,1 ms para 150; feedback/rAF p95 de 11,6/13,5 ms. São dez amostras sequenciais por grupo, percentil nearest rank. Houve 33 renders em cada série, máximos de 3,2/9,3 ms. Fontes: `evidencias/chamada-final-{8,150}.json` e `resumo-latencia.json`. O aumento de renders por estado explícito não é automaticamente regressão: comparar duração e responsividade, preservando o feedback necessário.

## O que ainda não está aprovado por esses testes

- Browser real em telefone/tablet: teclado virtual, toque rápido, anúncio por leitor de tela, foco/retorno e rascunho durante orientação/zoom.
- O cenário específico de renovação sintética + desmontar/remontar + unknown órfão foi aprovado no browser (`evidencias/chamada-orfa-renovacao.json`): uma gravação, confirmação manual 1/8, leitura antiga sem regressão. Isso não valida emissão/renovação real de JWT.
- Callbacks de status/fechamento e geradores PDF atravessando alteração local já têm prova e correção isolada. Permanecem a interação visual completa e alterações remotas ainda não observadas; não confundir revisão local com snapshot transacional de todos os recursos.
- Auth/PostgREST/Realtime de ambiente isolado legítimo: PIN errado, token emitido/renovado, revogação durante HTTP e reconexão. Claims GUC da fixture simulam o gateway confiável.
- Perda arbitrária de transporte antes da confirmação de COMMIT; o teste nativo faz descarte controlado após commit e destrói o socket antes do retry.
- A aplicação SQL foi confirmada separadamente: migration `20261005165755`, pós-verificação do corpo aprovado e estrutura preservada em [evidência de aplicação e pós-verificação](propostas/aplicacao-guard-20261005.json). Esse fato não decorre do runner de testes. O coordenador confirma o deploy do frontend pela ferramenta de status do Sites nesta tarefa.

## Registro da aplicação específica

Migration `ipnc_guard_ebd_finalized_class_20261005`, versão `20261005165755`, concluída em 05/10/2026 às 16:57:55.949 UTC. Pós-verificação às 16:58:16.066463 UTC: corpo MD5 `617d4fa54312e7ee5305a2c44faa836f`; estrutura MD5 `70a3c96635467d78d1b8e48a4470c8e0` inalterada. OID 25624, owner/ACL/configuração, quatro triggers, quatro tabelas com RLS e 13 policies foram preservados. Nenhum dado real foi usado como teste. O wrapper teve dez cenários isolados adicionais em `propostas/ensaio-wrapper/`, com rollback e encerramento do PostgreSQL local confirmados. A reversão exata continua documentada em `propostas/rollout-rollback.md` e reintroduziria a lacuna do baseline; não a executar automaticamente.

## Outros ajustes de fundação desta auditoria

Pastor ganhou navegação inferior no intervalo 768–1023 px, coerente com a sidebar que começa em 1024; o default dos outros BottomNav continua md. Arquivos passou a limpar o debounce de busca com `useEffect`. Tarefas, Arquivos, Calendário e Reuniões agora distinguem falha de consulta e lista vazia, com retry persistente e aviso sobre snapshot anterior. Calendário tem loading/erro separados para mês e próximos eventos; reunião não converte falha nas consultas de contagens em zeros silenciosos. Validar os quatro cenários `?state=error` na fixture e um refetch falho após dados já carregados, sem tocar registros reais.

Os três cartões de escolha de sociedade em Auth (diretoria, pastor e membro) passaram a botões nativos com foco visível, preservando handlers e classes do enhancer. Lint dirigido desses arquivos encontra apenas o `any` preexistente em Auth e a advertência preexistente de dependências de useEbdSync; os resultados completos ficam em `final-checks`.
