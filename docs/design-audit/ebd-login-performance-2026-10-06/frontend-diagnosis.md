# Entrada EBD: diagnóstico e correção no frontend

Fonte inicial: `24297c6`. Verificação realizada em 06/10/2026, exclusivamente com dados e serviços fictícios isolados. As medições de navegador e seus atrasos controlados estão no relatório da fixture; não representam latência do backend publicado.

## Causas confirmadas

- A entrada do administrador chama a Edge Function e depois `auth.setSession`. A entrada do professor segue PIN → nome, chamando a Edge apenas ao enviar o nome. A validação `/auth/v1/user` efetuada pelo SDK faz parte da confirmação da sessão e foi preservada.
- O envio do nome liberava `loading` antes de `setSession` terminar. Um segundo Enter nesse intervalo repetia a chamada de entrada. Agora uma referência bloqueia solicitações concorrentes, e `finally` libera a entrada após sucesso ou falha. Nenhum acesso ou sessão local nova é gravado antes da aceitação pelo SDK.
- O hook de aniversários iniciava consultas ainda sem acesso EBD. Ele agora aguarda o acesso; a opção `enabled` mantém o comportamento padrão dos outros consumidores.
- Cada snapshot buscava alunos ativos e todos os alunos separadamente. A mesma consulta autorizada de todos os alunos agora fornece também os ativos, mantendo a ordem e os guardas de versão/acesso existentes. São sete solicitações por snapshot, em vez de oito.
- A primeira assinatura Realtime podia enfileirar outro snapshot durante a leitura inicial. A leitura começa imediatamente, sem espera artificial. Somente a primeira `SUBSCRIBED` recebida antes das consultas de dados é coberta pelo snapshot que ainda vai começar. A Secretaria sinaliza essa fase após `ebd_session_valid` autorizar e imediatamente antes das consultas paralelas. Uma assinatura posterior ao disparo, uma reconexão ou uma mudança observada continua solicitando atualização. `HistoricalChamada`, que não sinaliza a fase, mantém o comportamento conservador anterior.

Uma falha da leitura inicial após uma assinatura coalescida mantém uma tentativa adicional na fila. Falhas persistentes aguardam os gatilhos normais de atualização; não há repetição indefinida. A fila e a informação de fase pertencem ao escopo de acesso, e a limpeza cancela leituras pendentes desse escopo.

## Validação

- `tests/ebd-login-performance.test.mjs`: 25 casos executando funções e hook reais com dependências fictícias. Cobrem administrador, professor, renovação, dupla submissão durante aceitação, PIN inválido, falhas e retomada, consulta única de alunos, aniversário antes/depois do acesso, assinatura antes/depois das consultas, empate com a conclusão da validação, reconexão, mudanças em voo, ausência de Realtime, falha da validação coalescida, eventos de ciclo de vida e limpeza/renovação do escopo.
- Com os testes de sincronização, proteção de PDF/snapshots, aniversários, capacidades e PWA: 74 testes passaram.
- TypeScript passou. `git diff --check` passou. Lint dos hooks, cache e testes alterados: zero erros e um aviso já existente sobre as dependências intencionais da fila por escopo. A Secretaria conserva exatamente os 13 `no-explicit-any` existentes no `HEAD` inicial, sem novos erros.
- Cache estático do PWA atualizado de `ump-cache-v20` para `ump-cache-v21`, registro `/sw.js?v=2026-10-06-ebd-speed-v13`. Teste confirma remoção somente dos caches estáticos antigos do aplicativo, preservando o cache atual e o de outro aplicativo. Regras de rede e armazenamento de sessão permanecem iguais.

O frontend exibe o menu assim que a sessão é aceita, antes de concluir o snapshot. Por isso, reduzir consultas afeta o carregamento dos dados e a sincronização; a confirmação da sessão continua dependendo dos serviços de autenticação. A comparação deve manter os mesmos atrasos sintéticos e informar separadamente os cenários Realtime rápido, empatado e tardio.
