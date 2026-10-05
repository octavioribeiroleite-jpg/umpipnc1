# Desempenho, cache e PWA — auditoria de 05/10/2026

Inspeção do worktree `ipnc-auditoria-responsividade/Aplicativo IPNC`, com testes locais e dados fictícios. Este relatório não é um teste de instalação, medição de produção ou aprovação de RLS. Nenhum service worker foi instalado pela subetapa; a fixture Diretoria bloqueia `sw.js` e substitui os clientes de backend. A cobertura visual conduzida pela coordenação está separada em `docs/auditoria-responsividade/cobertura-navegador.md`.

## Resultados e correções confirmadas localmente

| Item | Evidência | Resultado e limite |
| --- | --- | --- |
| Conta principal: cache após logout/troca de usuário | `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/hooks/useTasks.ts`, `src/hooks/useBirthdayNotifications.ts`; reprodução com QueryClient real em `tests/auth-query-cache.test.ts` | Antes: QueryClient global com 5 min de freshness e 24 h de retenção; logout não removia consultas. Uma leitura fictícia da conta B reutilizou o resultado fresco de A sob `['profiles']`. Isso comprova reutilização local do cache, não leitura indevida do banco. |
| Correção da fronteira do cache | Novo `src/lib/auth-query-cache.ts` e chamadas no AuthProvider antes de aplicar a identidade/ao limpar a sessão | Cancela consultas e remove somente os namespaces existentes da conta principal: tasks, profiles, events, files, aniversariantes, notificacoes_aniversarios, societies e meeting-societies. Mesma identidade, inclusive renovação de token/foco, preserva dados. Não apaga localStorage, credenciais, sessão EBD nem cache da tesouraria. Novos namespaces de consultas principais precisam integrar essa lista. |
| Resposta de leitura atrasada após troca | Teste com QueryClient real, Promise controlada e AbortSignal | A consulta antiga é cancelada; resolver sua Promise depois da troca não reinsere o snapshot. O teste não executa o AuthProvider no navegador nem simula todas as mutações em andamento. |
| Tesouraria independente | `pages/Tesouraria.tsx`, `components/treasury/TreasuryAccessDialog.tsx`, `hooks/useTreasuryIdentity.ts` | Login e saída já cancelam/removem consultas `['treasury']`. Access inclui userId e fingerprint; dashboard/extrato incluem userId, dependem de acesso, atualizam periodicamente. O novo helper da conta principal conserva `treasury` e `treasury-directory`, conforme teste. |
| Cópia visual durante atualização de Camisas | `components/ui/stable-refresh-boundary.tsx` capturava `innerHTML` e o inseria com `aria-hidden`/pointer-events-none | A fonte repetia atributos id e controles nativos no snapshot; aria-hidden/pointer-events-none não tornam por si sós a cópia inerte para teclado. É um problema do clone decorativo, distinto da montagem duplicada de componentes React. |
| Correção da cópia decorativa | Novo `lib/decorative-snapshot.ts`; overlay com `inert` e aria-hidden | Clona em árvore destacada, remove IDs, nomes, autofocus e referências de labels/formulários/ARIA; controles copiados recebem tabindex=-1. Texto, classes e valores visuais são mantidos, árvore React original/handlers/rascunhos não são modificados. Teste Node usa uma fixture DOM mínima; posteriormente `auditoria-responsividade/evidencias/clone-refresh.json` registrou clone sem IDs/focáveis, foco fora da cópia e rascunho preservado no browser da fixture real. |

A correção de cache não redefine regras de papéis ou permissões. Não é uma limpeza global de todas as sessões. O fluxo principal continua usando o mesmo Supabase Auth; a fonte de tesouraria e a identidade EBD permanecem independentes.

## Política de service worker encontrada

`public/sw.js` utiliza `ump-cache-v9` e pré-carrega apenas três ícones locais. No handler fetch, ignora métodos diferentes de GET, origem externa, navegação HTML, OAuth e caminhos REST/Auth/Functions/Storage/token ou hostname Supabase. Assim, Auth, Finanças e APIs não são respondidos pelo cache desse worker segundo os testes em VM. Isso não é prova dos cabeçalhos HTTP da publicação ou de todos os caches do navegador.

O worker usa cache-first para imagens locais e arquivos JS/CSS/fontes sob `/assets/`, guardando respostas com `response.ok`. O nome `isHashedAsset` não verifica um hash no nome: verifica caminho e extensão. Imagens em URLs estáveis, como `/images/bg-app.png`, permanecem no cache corrente até sua versão ser substituída ou seu cache removido. Nenhum arquivo visual foi recomprimido nem a política do SW alterada nesta subetapa.

Na ativação, só caches antigos com prefixo `ump-cache` são removidos; caches de outras aplicações são preservados. A leitura `caches.match(request)` consulta caches da origem. A política não fornece um HTML offline: navegações continuam na rede. Não apresentar o PWA como aplicativo operacional offline nem como fila persistente de movimentações.

`src/lib/registerSW.ts` registra `/sw.js?v=2026-09-26-v9` com `updateViaCache: none`, verifica atualização a cada 5 minutos e ao voltar à visibilidade. Em localhost/127.0.0.1/iframe faz limpeza de SW/artefatos de prévia, sem registrar um worker novo. Este caminho não foi exercitado contra registros reais nesta auditoria. A prévia Diretoria barra o SW antes disso e não deve ser usada para certificar uma instalação.

## Atualização, retorno e sincronização

| Caminho | Comportamento encontrado | Evidência/limite |
| --- | --- | --- |
| Atualizar aplicação | `refresh-site.ts` exige online, verifica HTML com no-store e timeout de 12 s, ativa worker waiting quando houver, mantém registro/cache e substitui a URL preservando rota, query e hash | 5 testes específicos aprovados. Falha de rede/resposta não navega. Não mede SW real/iOS/dispositivo instalado. |
| Troca de controller | `registerSW.ts` conserva rota e recarrega; atualização manual possui trava de Promise | A rota é conservada; campos React não persistidos não são automaticamente preservados pelo reload. Não há evidência de restauração universal de rascunhos. |
| Puxar para atualizar | `PullToRefresh.tsx` limita a celular/topo/um toque, ignora modal e campos, considera scroll local, trata cancelamento e erro | Leitura de fonte. Não equivale a emulação de gesto físico/teclado móvel. |
| Queries gerais | Default `refetchOnWindowFocus: false`, `refetchOnReconnect: true`, stale 5 min, retenção 24 h | Retorno de foco não promete atualização imediata de cada módulo. Arquivos adiciona intervalo de 240 s. A limpeza de identidade foi corrigida, sem mudar esses tempos. |
| Auth principal | TOKEN_REFRESHED e eventos repetidos do mesmo usuário preservam perfil/papéis e evitam desmontagem | Não revalida papéis em todo foco. As verificações de autorização no servidor continuam necessárias; não testadas com backend real aqui. |
| EBD | `useEbdSync.ts` observa seis tabelas Realtime, debounce 150 ms, reconcilia ao conectar/foco/online/visível e a cada 10 s visível; usa `createRefreshQueue` | 5 testes `ebd-sync` aprovados: serialização, repetição após evento durante leitura, retry, dispose e preservação de rota/cache na atualização. Não mede servidor/rede/múltiplos dispositivos. |
| Tesouraria | Access revalida no foco e a cada 30 s; dashboard/extrato a cada 60 s com stale 30 s; fila a cada 30 s | Fonte e testes existentes; preview troca hooks e não exercita esses temporizadores/regras reais. |

O worker e a fila de refresh tratam atualização de assets/leituras. A fila de presença e sua reconciliação são avaliadas no diagnóstico específico da chamada; não inferir tempos ou segurança de presença a partir dos testes PWA.

## Árvores, IDs e custo de renderização

- `AppLayout` atual monta `{children}` uma vez e alterna os shells de navegação por CSS. `PastorLayout` atual também contém uma árvore de conteúdo; não há cópias desktop/mobile do formulário nessa fonte atual. Navegações distintas ocultas por breakpoint continuam componentes montados, mas não duplicam o conteúdo de negócio.
- `StableRefreshBoundary`, montado em `pages/Camisas.tsx`, continua observando childList/subtree/atributos e ResizeObserver, identificando atualização por `.animate-spin` e travando/restaurando scroll por até 3,5 s. A cópia decorativa agora é inerte, mas o custo de observer/clonagem não foi medido no navegador. Não reivindicar ganho de frame-time desse patch.
- `SocietyScreenEnhancer` e `IdentityConfirmationEnhancer` observam `document.body` e agendam busca/alteração imperativa por requestAnimationFrame. Reutilizam elementos existentes e verificam seus marcadores antes de acrescentar decoração; não foi encontrada ali montagem deliberada de segunda árvore de formulários. O custo em páginas grandes não foi medido.
- Nos formulários Camisas/Encomendas/Campanhas, 43 associações de Label/controle usam `useId` por instância e sufixo próprio, incluindo índice/tamanho nas linhas repetidas. Isso evita IDs estáticos iguais entre instâncias; a sanitização do snapshot trata a cópia visual posterior. Handlers/valores foram preservados.

## Fontes de carga grande — medição do disco, sem métricas inventadas

| Asset/fonte | Bytes encontrados | Relação com a carga |
| --- | ---: | --- |
| `public/videos/bg-home.mp4` | 7.238.681 | Auth mantém vídeo autoplay/muted/loop/playsInline com preload auto. Pode demandar transferência/decodificação; esta leitura não mede quanto cada navegador transfere. |
| `public/images/bg-app.png` | 2.241.583 | `index.html` faz preload de alta prioridade para qualquer rota; Auth e loading pastoral o usam. |
| `src/assets/logo-ipnc.png` | 1.480.718 | Usado no acesso, navegação, portal, área pastoral e geração PDF; tamanho de arquivo não significa que cada consumidor o baixe novamente. |
| `public/fonts/secretaria/inter-{400,600,700}.ttf` | 324.820 / 326.048 / 326.468 | Arquivos presentes no disco. Presença não prova carregamento no browser ou uso em todas as rotas. |
| `src/assets/vote-confirm.mp3` | 168.228 | Áudio de confirmação eleitoral; não acionado em produção. |

`src/App.tsx` importa suas páginas estaticamente. Há imports estáticos de jsPDF em páginas/utilitários alcançáveis e Recharts em Relatórios. A configuração principal não contém divisão manual de chunks nem lazy por rota. São candidatos concretos para análise de bundle e carregamento; não houve refatoração ampla sem medição. O build da fixture já apontara bundle grande, mas seu tamanho não substitui o bundle da publicação. Não foram coletados Lighthouse, LCP, INP, long tasks, consumo de memória, FPS ou transferência em rede real nesta subetapa.

`worker/index.ts` delega a `env.ASSETS.fetch`. Metatags no-cache no HTML não substituem inspeção dos headers HTTP do ambiente publicado; nenhum resultado de produção é alegado aqui.

## Verificação executada e alcance

Node usado: v24.19.0 (compatível com a exigência >=22.13).

| Comando | Resultado |
| --- | --- |
| `node --experimental-strip-types --test tests/pwa-install.test.mjs tests/refresh-site.test.mjs` | 16/16 aprovados: instalação manual/cancelada/aceita, erro, duplo clique, standalone/iOS/WebView simulados, listeners, manifest/PNG, limites SW e refresh. |
| `node --experimental-strip-types --test tests/ebd-sync.test.mjs` | 5/5 aprovados. |
| `node --experimental-strip-types --test tests/auth-query-cache.test.ts tests/decorative-snapshot.test.ts` | 6/6 aprovados: cinco de QueryClient real/transição e um da transformação do snapshot. |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | Aprovado após os patches de cache/snapshot/labels Camisas. |
| ESLint helpers novos, AuthContext, StableRefreshBoundary, testes novos e backend fixture | Zero erros; dois avisos preexistentes no AuthContext (dependências/exports Fast Refresh). |
| ESLint dos três componentes Camisas | 12 erros `any` e 7 warnings existentes; a comparação com HEAD anterior retornou os mesmos totais/regras. Não declarar lint global aprovado. |
| `git diff --check` | Aprovado. |

A primeira execução do teste DOM encontrou sintaxe de parameter property não suportada por strip-only; a fixture de teste foi corrigida para campos explícitos e a execução final acima passou. Nenhuma dependência foi instalada para esses testes.

Permanecem sem comprovação por esta subetapa: instalação/retomada iOS ou Android real, ciclo de SW publicado entre duas versões, Cache Storage de sessão real, integração AuthProvider/Supabase com troca de contas descartáveis, headers HTTP de produção, entrega ou conciliação financeira, voto real, envio de mensagens e operação offline persistente.

## Revisão complementar: independência das sessões e refetch financeiro

A enumeração atual de `queryKey` encontrou os oito namespaces principais já cobertos pela limpeza. Tesouraria mantém `['treasury', ...]` e `['treasury-directory']`, com cliente separado `ipnc-treasury-auth` em sessionStorage e cancelamento/remoção próprios em `Tesouraria.tsx`/`TreasuryAccessDialog.tsx`. O teste conserva explicitamente ambos os namespaces durante logout principal. EBD utiliza o cliente `ipnc-ebd-auth` em localStorage, `ebd_session` e estado local; seu encerramento continua restrito a `clearStoredEbdSession` e seu próprio cliente. Esses módulos de sessão não foram alterados pela correção principal. A afirmação sobre EBD é inspeção da fonte, não execução integrada de logout no navegador. Mutações em andamento não estão incluídas na prova de cancelamento de leituras.

O novo `snapshot-read.ts` protege as leituras dos painéis financeiros contra substituição de dados confirmados por zero/vazio após erro e bloqueia commits de leituras antigas. Três testes comportamentais aprovados. O patch não acrescenta polling nem temporizador; reutiliza os pontos de atualização existentes e oferece retry explícito. A fixture pode agora emitir callbacks locais de Realtime e mudar a falha de leitura sem recarregar, mas continua sem serviço remoto e sem SW instalado.

## Encerramento visual e medição local

A coleta final da coordenação está consolidada em `auditoria-responsividade/cobertura-navegador.md`: inclui ciclo de Tab/retorno de foco em modal, clone inerte sem IDs/focáveis, rascunho financeiro preservado no refetch, erro/recuperação da apuração e contador 8/20. `useBufferedVoteCount` agora isola fila/ativo/sequência por eleição e conserva dados confirmados em erro; mantém polling 3 s e as mesmas regras de lotes/encerramento/capacidade. Dois testes executam o hook real transpilado com leituras controladas, sem React DOM ou backend. Isso resolve os diagnósticos locais de cache/clone/contagem, sem comprovar sessões remotas ou instalação PWA.

As amostras locais da Chamada, medidas pela coordenação com atrasos fictícios de sessão 150 ms e gravação 450 ms, distinguem resposta visual de persistência:

| Turma | Marca visual p50 antes → final | Marca visual p95 antes → final | Persistência p50 antes → final |
| --- | --- | --- | --- |
|8 alunos|606,3ms →1,7ms|609,2ms →2,1ms|604,6ms →607,2ms|
|150 alunos|613,1ms →6,5ms|614,9ms →7,1ms|604,7ms →611,6ms|

São dez amostras por cenário, conforme `evidencias/resumo-latencia.json` e os arquivos antes/final. O ganho observado é resposta visual imediata com confirmação ainda pendente; não há ganho demonstrado de latência de gravação. Não apresentar esses tempos como INP, rede ou banco de produção.

Revisão de implementação informada pela coordenação após conferência do manifesto de 379 arquivos: `7754b8bc6b4e36e7dfe76fcb60af66d22ec876e4`. O manifesto final e a bateria 193/193 ficam em `auditoria-responsividade/final-checks/`; isso identifica a entrega validada, sem atribuir retroativamente um hash de bundle a cada captura antiga. O custo de CPU/memória do clone e métricas de PWA instalado não foram medidos.
