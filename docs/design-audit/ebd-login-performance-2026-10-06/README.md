# EBD: base isolada de entrada

Data: 06/10/2026. Fonte inicial limpa: `24297c695756b445a49823a8963e4391b73d9893`. As capturas abaixo precedem as alterações de desempenho. `baseline-source.json` registra a revisão e a impressão SHA-256 dos arquivos relevantes. Os JSONs posteriores também carregam a revisão, impressão da fonte e estado dos arquivos no momento da abertura.

A fixture em `tests/vite.ebd-login.config.ts`, porta 8085, monta a página real `Secretaria` com Router, QueryClient, AppShell e estilos reais. Os clientes Supabase são substituídos antes da importação da página, o transporte externo e o service worker são bloqueados, e as gravações de tabelas são recusadas. Apenas identidades e sessões fictícias são usadas; nenhum PIN real ou API de produção foi consultado. O armazenamento pertence ao localhost da porta 8085.

Latências controladas: função Edge 150 ms, confirmação `setSession/getUser` 200 ms, cada RPC/leitura 200 ms, aviso Realtime `SUBSCRIBED` 200 ms. `getSession` fica local e sem espera de rede. O mock da confirmação representa a consulta ao usuário feita pelo SDK instalado para um token ainda válido; ele não mede o servidor de autenticação real nem as chamadas internas de uma função Edge.

O início do cronômetro é a invocação da função Edge depois da confirmação do PIN ou do botão Entrar. Para uma sessão salva, começa ao preparar a sessão fictícia antes de montar a página. “Menu” é a presença do cabeçalho real da Home; “dados” exige o estado de sincronização concluída do primeiro snapshot real. Os valores excluem o tempo humano de digitar PIN/nome e, por montar Secretaria diretamente, excluem a descarga/análise do bundle geral `App`.

| Fluxo inicial | Menu | Primeiros dados | CPU de render acumulada |
| --- | ---: | ---: | ---: |
| Administrador: PIN → confirmar | 373,6 ms | 789,2 ms | 75,5 ms |
| Professor: PIN → nome → Entrar | 370,5 ms | 784,6 ms | 45,6 ms |
| Sessão administrativa salva | 24,2 ms | 435,3 ms | 19,7 ms |

CPU é a soma de `Profiler.actualDuration` em desenvolvimento, incluindo os renders anteriores de PIN/nome. Não se soma esse valor às latências para estimar rede: React intercala trabalho e as consultas do snapshot correm em paralelo. A entrada nova tem um caminho controlado de aproximadamente 750 ms: Edge 150 + confirmação 200 + validação RPC 200 + leituras paralelas 200. A CPU da página, o agendamento e o reconhecimento do DOM explicam a diferença pequena até o primeiro snapshot; a medição não é uma promessa de desempenho publicado.

Nos dois logins foram observadas quatro consultas `list_birthdays` antes do acesso: uma tentativa e três novas tentativas após a recusa fictícia de autorização, porque a tela ficou aberta por tempo suficiente. Após a sessão aceita houve mais uma consulta, agora autorizada. O número de tentativas antes do login depende do tempo de permanência nessa tela.

A primeira busca e o aviso `SUBSCRIBED` pediram dois snapshots. Cada snapshot realizou `ebd_session_valid`, `ebd_closure`, classes, alunos ativos, todos os alunos, presenças, visitantes e status. A base do login registra dois RPCs de validação, dois de fechamento, duas consultas de classes e quatro de alunos. Alguns requests do segundo snapshot ainda estavam em voo na captura dos primeiros dados; os JSONs distinguem início e conclusão.

Renovação administrativa: o controle sintético abriu o diálogo real de confirmação, o PIN fictício foi confirmado e o diálogo fechou com feedback de sucesso. A sessão foi aceita em 352,5 ms (Edge 150,7 + confirmação 201,5) e o primeiro novo snapshot concluiu em 771,2 ms a partir da confirmação. A Home manteve os oito alunos ativos e duas turmas fictícias. Não se usa o marcador DOM de “primeiros dados” para renovação, pois a Home conserva os dados anteriores; esse tempo deriva das conclusões registradas das novas leituras. O segundo snapshot também iniciou nessa renovação.

Evidências: `baseline-{admin,professor,stored-admin,renewal}.json` e as imagens `.jpg` correspondentes. Build da fixture, com saída exclusiva em `dist/fixtures/ebd-login`, passou; lint da fixture passou. Esse build não substitui o build de produção.

## Diagnóstico da fonte inicial

- `Secretaria.tsx:306` executa o hook de aniversários sem condição de acesso; o callback de consulta em `useBirthdays.ts:113` não possui `enabled`.
- `useEbdSync.ts:37` atualiza em `SUBSCRIBED`; a chamada inicial seguinte solicita outra atualização. A fila serial preserva a ordem, mas agenda um segundo snapshot quando a assinatura chega durante o primeiro.
- `Secretaria.tsx:453` e `:454` buscam alunos ativos e todos os alunos separadamente. Derivar os ativos da lista inteira preserva o conjunto e elimina uma consulta por snapshot.
- `Secretaria.tsx:371` retira o estado de carregamento antes de aguardar a confirmação `setSession` em `:379`; o Enter do nome também não verifica carregamento. A espera de confirmação precisa continuar coberta e a operação requer um guard único de execução.
- `AuthContext.tsx:228` registra `INITIAL_SESSION` e `:279` também lê `getSession`; ambas podem iniciar hidratação antes de `authReadyRef` ser verdadeiro. O contador invalida o resultado antigo, mas não evita suas requisições já enviadas. A correção segura é compartilhar uma promessa em voo por usuário, mantendo invalidação por logout/troca de identidade. Isso representa tráfego paralelo da conta principal: Secretaria usa seu cliente e `MainAccountAccessBoundary` libera sua rota independente, portanto não é um gate da entrada EBD.
- `App.tsx:10–43` importa todas as páginas antes do mount; `main.tsx:2` importa `App` avidamente. O build já existente tem bundle principal de 2.663.472 bytes / 724.156 bytes gzip. Secretaria importa relatórios PDF e todas as subpáginas, embora a entrada utilize apenas seleção/PIN/nome. Carregar páginas e relatórios sob demanda pode reduzir a abertura inicial; a fixture direta não mede essa economia.

O resultado confirma esperas e duplicações no frontend, com dados artificiais. Não verifica RLS, custo interno da Edge, rede móvel, cache de PWA instalado ou o tempo de um login real. As permissões e a validação no backend continuam necessárias.

Referências técnicas: contrato público de [setSession](https://supabase.com/docs/reference/javascript/auth-setsession) e eventos de [onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), conferidos junto ao código do SDK instalado (`node_modules/@supabase/auth-js/src/GoTrueClient.ts`). A confirmação simulada mantém o passo de validação do SDK; nenhuma otimização proposta consiste em aceitar um token sem essa confirmação.

## Conferência após as melhorias

Fonte ainda sobre a revisão `24297c6`, com alterações locais validadas pelo responsável. Impressão dos arquivos produtivos em todas as capturas finais: `a088e1a409d517fe8d999d768ac1fc6b2a7916ea1ef0633ebafd2ff82260a7aa`. Os atrasos principais continuam Edge 150 / confirmação 200 / RPC-leitura 200 / Realtime 200 ms.

| Fluxo | Menu antes → depois | Primeiros dados antes → depois | Última resposta após mudança | Requests após mudança |
| --- | ---: | ---: | ---: | ---: |
| Administrador | 373,6 → 381,1 ms | 789,2 → 798,0 ms | 1195,0 ms | 17 |
| Professor | 370,5 → 370,7 ms | 784,6 → 781,6 ms | 1180,0 ms | 17 |
| Sessão administrativa salva | 24,2 → 27,1 ms | 435,3 → 432,2 ms | 832,1 ms | 15 |

Uma amostra por cenário não permite atribuir diferenças pequenas à mudança: nesse modelo com latências constantes, os primeiros dados continuam perto de 0,79 s e não demonstram ganho importante no tempo total da entrada. A melhoria verificável é a redução de consultas, a eliminação das tentativas de aniversários antes do acesso e a manutenção correta do estado de carregamento até confirmar a sessão. A CPU de render acumulada ficou em 58,4 ms no administrador, 48,3 ms no professor e 17,3 ms na sessão salva, separada da espera de rede.

Após a entrada, o cenário principal disparou 17 requests em vez dos 19 da base: os dois snapshots passaram de quatro leituras de alunos para duas. Antes da entrada houve zero consultas de aniversários, inclusive enquanto os formulários permaneceram abertos; a base havia feito quatro tentativas nesse período. A versão atual inicia a validação imediatamente e só absorve a primeira assinatura Realtime quando ela precede o disparo das queries. Com timers de 200 ms empatados nesta fixture, a validação iniciou primeiro e suas queries foram disparadas antes da assinatura, preservando a segunda atualização.

Na sessão salva com Realtime **20 ms**, houve um único snapshot: oito requests, últimos resultados em 425,3 ms e dados visíveis em 431,7 ms. Com assinatura **400 ms**, após o início das queries, houve dois snapshots: 15 requests, últimos resultados em 825,6 ms e primeiros dados em 430,7 ms. O caso principal de 200 ms também teve dois snapshots. Assim, a consulta adicional foi conservada onde reconcilia a janela anterior à assinatura, e o primeiro snapshot não ficou esperando a conexão.

Os requests da sessão salva somaram 1921 bytes de JSON sintético no cenário rápido e 3558 no tardio/principal; os logins principais somaram 4090 bytes sintéticos cada. São tamanhos da serialização dos resultados do mock, sem cabeçalhos, TLS, transporte WebSocket ou payloads reais. A base original não registrou bytes, portanto não há alegação de redução medida de bytes reais.

O marcador “Rede sintética estabilizada” espera 500 ms sem request em voo para permitir uma captura completa. A coluna “Última resposta” usa o término efetivo do último request; não inclui esses 500 ms de confirmação da captura. Todas as capturas finais têm zero requests pendentes. A base original foi capturada nos primeiros dados e tinha leituras de reconciliação ainda em voo, por isso não há comparação inventada de tempo final estabilizado.

Renovação: 17 novos requests, Home e números fictícios preservados e última resposta em 1165,9 ms após confirmar. O índice `requestStart` separa a renovação dos polls normais anteriores; o total acumulado de requests do arquivo não representa o custo dessa operação.

Verificações adicionais no navegador:

- Dois Enter foram pressionados no campo do professor enquanto `setSession` estava em voo. Os dois eventos registrados têm `authInFlight: true`; ocorreu apenas uma Edge e uma confirmação de sessão.
- A primeira confirmação de sessão foi recusada. A tela mostrou “Não foi possível entrar”, conservou a possibilidade de repetir e permaneceu com `authenticated: false`, sem Home, RPCs ou leituras de dados. Repetir a confirmação abriu a Home normalmente. O arquivo de retry corrige apenas os marcadores derivados de uma tentativa falha, que não podem ser associados à Home de uma tentativa posterior; os timestamps originais de requests são preservados.
- PIN fictício incorreto: toast de erro, nenhum acesso, nenhuma Home e apenas uma Edge, sem confirmação de sessão ou leitura. O campo foi limpo para nova tentativa.
- O botão real “Voltar para a Home” navegou para `/auth?home=1`; a rota de destino usa um marcador de saída da fixture, sem montar a aplicação completa.
- Administrador manteve oito alunos ativos e duas turmas; professor manteve cinco alunos e uma turma. As imagens finais confirmam menus e superfícies correspondentes.

Arquivos `after-*.json` guardam todos os resultados; `after-summary.json` resume a última operação de cada caso, e as imagens `.jpg` correspondentes mostram a UI real com dados fictícios. Os cenários Realtime rápido/tardio possuem JSONs próprios.

Estas medições **frontend com latência controlada** são diferentes de testes que executam o código interno da Edge com serviços remotos simulados. Nesta fixture a Edge é uma única espera fixa de 150 ms, portanto não se mede a economia interna das alterações do backend. Também são diferentes de medidas agregadas de assets e requests de produção sem uma entrada real. Nenhuma dessas três categorias, isoladamente, prova a duração de um login real publicado.

Encerramento: teste próprio passou, lint próprio sem erros, build exclusivo da fixture passou e verificação de diff sem problemas. A aba Chrome exclusiva foi fechada; o servidor próprio da porta 8085 foi encerrado e a ausência de listener confirmada. Nenhum outro servidor ou aba foi encerrado. O responsável pela entrega executou a suíte e o build de produção separadamente.
