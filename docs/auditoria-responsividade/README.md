# Auditoria IPNC — entrega técnica de 05/10/2026

Responsável técnico: Astra, raciocínio Ultra, com duas subtarefas no mesmo modelo/configuração. Baseline: `1ca403eb1739d411a8de4e6d5b4d83219fc83f99`, reconciliado pelo coordenador com GitHub e fonte Sites versão 26. Trabalho na branch `codex/auditoria-responsividade-ipnc`, sem escrita de dados reais. Esta entrega técnica não equivale a publicação.

Revisão final da implementação/fixtures: `7754b8bc6b4e36e7dfe76fcb60af66d22ec876e4`. Seus 379 arquivos correspondem ao manifesto validado `9bb787a9794deb385860bb424504ed7e4f4928954e1b2bd1867163659be13f0a`; a documentação foi commitada depois, sem alterar comportamento. Etapas: `b2187a6` fundação/cache/foco; `3de2266` chamada/reconciliação/PDF; `271dcfb` consultas/apuração/rótulos; `7754b8b` fixtures isoladas.

## Resultado e gate de publicação

A marcação de presença passa a responder imediatamente por aluno, mostrando pendência até a confirmação. A auditoria corrigiu também leituras antigas, acessibilidade de formulários/diálogos, navegação pastoral, dados financeiros indisponíveis apresentados como zero/vazio, cache da conta principal e uma divergência no resultado eleitoral apresentado.

**A publicação permanece bloqueada pela autorização específica do patch SQL de chamada finalizada.** O guard atual foi reproduzido aceitando presença depois de finalizar a turma. A função proposta foi homologada em PostgreSQL nativo isolado com duas conexões e 29 cenários. A fila permite até três escritas por instância, portanto publicar apenas a UI sem o guard manteria uma corrida conhecida. Nenhuma função, policy, trigger ou dado de produção foi alterado nesta auditoria. Ver [rollout e rollback](propostas/rollout-rollback.md), incluindo escopo, hash, preflight somente leitura e backup exato privado.

O coordenador é responsável por integrar a revisão validada na main/GitHub/fonte Sites e confirmar o deploy. Após autorização humana, a aplicação do patch precisa ser executada pelo Astra com novo preflight, transação e verificação de metadados, conforme o roteiro. Não reaplicar migrations históricas.

## Causas comprovadas e solução

| Achado comprovado | Correção | Prova e limite |
| --- | --- | --- |
| O checkbox só mudava depois de validar sessão e salvar; `savingRef` desabilitava toda a turma. Já havia spinner rápido. | Intenção visual imediata; estado por registro; até três saves na fila; apenas o mesmo aluno/data bloqueado. Totais continuam confirmados. | Medição local comparável com 8/150 alunos; não é latência de produção nem INP. |
| Uma leitura iniciada antes de uma gravação podia repor o array antigo. Respostas de status/dia podiam reabrir visualmente um fechamento observado. | Tickets de revisão/ordem, mesclagem de registros confirmados e descarte de leitura atravessada por mutação observada. | Promises controladas executam helpers/callbacks reais; ensaio UI de leitura antiga e renovação. |
| Fila vazia não garantia que dados do PDF haviam sido lidos depois da última alteração. Evento Realtime tinha janela antes do refetch. | Ticket capturado antes da leitura e invalidado ao aceitar/confirmar alteração e observar evento. Dia relido antes do PDF; período/trimestre recusam snapshot antigo e atualizam a consulta. | Geradores reais de dia/período/trimestre com jsPDF em memória, estatísticas reais do histórico; sem download de dados reais. |
| Resposta perdida/timeout não prova rollback. | `unknown`, barreira de fechamento/PDF e consulta autorizada, sem reenvio cego. Pendência enviada sobrevive à troca de scope/desmontagem. | Conferência manual no novo scope confirmou 1/8 com uma só escrita; leitura anterior de 5 s não regrediu o estado. |
| A função de banco não verificava turma finalizada. | Proposta isolada, sob o mesmo lock do dia, bloqueando presença/visitante após finalização. | Baseline reproduz falha; proposta passa 29 cenários PostgreSQL nativo. Aplicação remota não autorizada. |
| Menu pastoral sumia entre 768 e 1023 px; formulários tinham controles sem nome; modal controlado retornava foco ao body. | Breakpoint coerente, rótulos associados, botões nativos nas sociedades e restauração de foco em diálogos. | UI real em fixtures; Tab, Enter, resize, altura curta e última ação de tabela. Não certifica leitor de tela ou dispositivo físico. |
| Erro de consulta era mostrado como lista vazia/saldo zero em vários módulos. | Aviso e retry; snapshot anterior identificado como possivelmente desatualizado; grupos financeiros só publicam depois de todas as leituras bem-sucedidas. | Falha inicial e refetch local: R$ 12.345,67 e rascunho preservados, recuperação remove erro. Não valida RLS remota. |
| Projetor declarava o primeiro colocado vencedor em empate 3–3–2 sem maioria. | Mesma função de apuração do painel, preservando fórmula existente e gate `show_result`; erro de leitura explícito. | Casos de maioria/empate/escrutínio e tela final 0/1 vaga, 8 cédulas, maioria 5. Nenhum voto emitido. |
| QueryClient podia conservar consultas da conta principal anterior; clone visual copiava IDs e campos. | Limpeza somente dos namespaces principais na mudança de usuário; clone inerte, sem identificadores/controles focáveis. | QueryClient real e clone DOM; browser conservou rascunho e um único input. Sessões EBD/tesouraria não foram limpas. |

O transporte Supabase em produção, velocidade da conexão e características físicas do aparelho não foram medidos. Nenhum deles foi declarado causa única. A otimização não remove validação de sessão, autoria, unicidade, sincronização periódica nem autorização do servidor.

## Medições finais da chamada

Chromium local via Browser suportado, viewport CSS 390 × 844, dados fictícios; atraso configurado de sessão 150 ms + escrita 450 ms; dez marcações/retiradas sequenciais por turma em cada rodada. p95 é o maior valor destas dez amostras, não estimativa de população. O relatório preserva rodada intermediária e rodada final; usar os arquivos `chamada-final-*` para a entrega.

| Turma | Marcação antes p50/p95 | Marcação final p50/p95 | Primeiro frame final p95 | Confirmação final p50/p95 |
| --- | --- | --- | --- | --- |
| 8 alunos | 606,3 / 609,2 ms | 1,7 / 2,1 ms | 11,6 ms | 607,2 / 607,7 ms |
| 150 alunos | 613,1 / 614,9 ms | 6,5 / 7,1 ms | 13,5 ms | 611,6 / 613,6 ms |

A meta local de feedback aproximado de 100 ms foi atendida. O spinner anterior já aparecia em cerca de 10 ms; o ganho demonstrado é a marcação imediata e a liberação dos outros alunos. Cada marcação normal mantém uma RPC de validação e uma escrita; leituras extras ocorrem para confirmação desconhecida. Os dois `getSession` locais protegem troca de sessão e não são duas requisições de rede adicionais. Renderizações medidas: 23 antes, 33 depois; máximos finais de 3,2/9,3 ms para 8/150. Não houve redução fictícia da latência de persistência.

As medições usam build de desenvolvimento e React Profiler na fixture, não o bundle minificado nem carga real. Há três escritas por instância de fila; chamadas já enviadas de um scope anterior podem coexistir com as três do novo. O mesmo aluno/data permanece deduplicado na aba. Não existe fila persistida/offline, cancelamento garantido no servidor ou coordenação entre navegadores pelo JavaScript.

## Cobertura e evidências

A consolidação final contém **1.296 medições de geometria, 242 labels e 205 snapshots semânticos**. Isso descreve as amostras registradas, não 1.296 testes funcionais nem aprovação universal. Nenhuma amostra registrou overflow da página; os candidatos locais incluem filhos de tabelas com rolagem própria e não são, automaticamente, defeitos. Interações e screenshots têm arquivos separados e alcance próprio.

- [Matriz de rotas e limites](matriz.md): 36 entradas ativas, fontes/abas/perfis e componentes históricos separados.
- [Cobertura efetiva no navegador](cobertura-navegador.md): labels e larguras extraídos das evidências; não converte inspeção estática em aprovação de estado.
- [Diagnóstico da chamada](diagnostico-chamada.md), [regressão EBD](regressao-secretaria.md), [testes de fila e permissões](testes-fila-permissoes.md).
- [Mudanças nos módulos](modulos-alterados.md), [fundação](fundacao-estatica.md), [PWA e desempenho](../desempenho-pwa.md).
- [Roteiro manual](verificacao-manual.md) distingue passos já executados de homologação dependente de aparelhos/serviços.
- `baseline/results.json` e `final-checks/` registram comandos, códigos e diagnósticos da árvore verificada. O lint preexistente falha; não apresentar como aprovado.

Resultado final: **193/193 testes**, tipos, build e diff-check aprovados. Lint: **298 erros/65 avisos**, contra 316/63 no baseline; 18 erros antigos removidos, quatro avisos novos de Fast Refresh somente nas fixtures e dois avisos antigos removidos. Sem aumento de diagnósticos por arquivo/regra em produção. O build mantém avisos de chunk grande e import dinâmico de sonner também importado estaticamente. Evidências e logs sanitizados foram incluídos explicitamente no Git, inclusive os `.log` normalmente ignorados.

A execução usou os componentes/CSS reais em previews locais com clientes, identidade e dados substituídos. Não ocorreu teste autenticado completo de cada perfil no Supabase real. Testes PGlite/PG cobrem os cenários descritos de autorização e integridade; não substituem JWT/PostgREST/PIN remotos, browser físico ou produção. Redirecionamento para login e a tela placeholder de outra fixture não foram contados como tela protegida validada.

As larguras centrais são 320, 390, 768, 1024 e 1440; casos compartilhados/EBD/problemáticos receberam extensões até 2560, fronteiras 767/768/1023/1024 e altura 320. Espera após resize: 260 ms. Evidência antiga sem campo de altura não recebe metadado retroativo inventado. Texto 200% foi emulado por fonte raiz. Zoom nativo, Safari/iOS/Android físicos, teclado virtual real, leitor de tela, safe areas reais e PWA instalado entre versões permanecem sem comprovação. Screenshot e DOM não provam sozinhos interação ou contraste integral.

## Preservação do produto

O formulário da sociedade na tesouraria continua com cinco campos: valor, data, pessoa, descrição e Pix/Dinheiro. “Recebimentos enviados” simplifica o título da sociedade; administrador mantém “Conferência de recebimentos”, composição, banco e confirmação. Pendentes não entram no saldo. Nenhuma fórmula financeira, permissão, PIN ou migração dessa área foi alterada.

Relatórios tesouraria/anexos mantêm seus testes reais de geração, documentos fictícios e falha explícita de anexo. A prévia da tesouraria deliberadamente não gera relatórios nem exercita upload/assinatura reais. PWA foi revisado por fonte e testes existentes; a fixture bloqueia worker, portanto não foi chamada de instalação aprovada.

## Pendências externas

1. Autorização humana e aplicação/verificação do patch SQL isolado. **Gate crítico.**
2. Integração/publicação da revisão validada pelo coordenador e confirmação da versão Sites.
3. Homologação em aparelhos e sessões descartáveis de staging para os limites explicitados. Nenhum teste com dado real foi usado para preencher essas lacunas.

Não é declaração de responsividade perfeita, cobertura de todos os cruzamentos estado × perfil × viewport, conformidade integral de acessibilidade ou auditoria de segurança completa.
