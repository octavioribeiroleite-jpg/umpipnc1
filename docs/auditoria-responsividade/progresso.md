# Auditoria de responsividade e chamada — 05/10/2026

Responsável técnico: agente Astra, raciocínio Ultra, com subtarefas delegadas ao mesmo modelo/configuração. Trabalho isolado na branch `codex/auditoria-responsividade-ipnc`, baseline `1ca403eb1739d411a8de4e6d5b4d83219fc83f99`. A referência antiga do roteiro não foi restaurada. GitHub e fonte Sites versão 26 foram reconciliados pelo agente coordenador antes desta etapa. Publicação será feita pelo coordenador somente depois da revisão final.

- [x] Ler roteiro integral, AGENTS, skill visual/checklist, Supabase/browser, README, configurações e fluxo recente da tesouraria.
- [x] Inventário de 36 rotas/abas/modais/perfis (matriz.md; não equivale a teste de navegador).
- [x] Linha de base: tipos, 122 testes e build passaram; lint preexistente 316 erros e 63 avisos.
- [x] Reproduzir latência em fixture isolada: 10 amostras por turma de 8 e 150 alunos, antes/depois comparáveis.
- [x] Feedback imediato por registro, concorrência limitada a três, reconciliação e barreiras de fechamento/PDF.
- [x] Secretaria: estados, acesso, histórico, navegação e responsividade em componentes reais com fixtures (limites em regressao-secretaria.md).
- [x] Fundação compartilhada e todos os grupos de módulos executados; revalidação final de erros e interações concluída nas fixtures.
- [x] PWA/desempenho por fonte/testes, regressão integrada, documentação e revisão do diff. Limites reais registrados.
- [ ] Integração/publicação pelo coordenador, sem mutações de dados de produção.

## Causa confirmada no baseline

No baseline, `ChamadaTab` aguardava `saveEbdAttendance` antes de atualizar a marcação, usava `savingRef` global e desabilitava todos os alunos. O helper validava a sessão por RPC antes de enviar a escrita; essa autorização foi preservada. `Secretaria/readData` substituía as presenças sem comparar revisão de escrita. `HistoricalChamada` já continha uma proteção parcial por revisão, preservada. Esses achados demonstram a ordem das operações, não medem latência do Supabase em produção.

## Limites

Somente dados sintéticos; nenhuma escrita de presença, voto, lançamento, comunicado ou cadastro real. Fixtures de UI não provam RLS. Nenhuma migration/schema/policy foi aplicada à produção. Patch isolado do guard de chamada finalizada exige autorização específica e é gate crítico de publicação; ver propostas/.

## Checkpoint de execução

EBD: componentes reais executados com dados fictícios; histórico transferido/inativo e renovação conferidos. Operação incerta permanece bloqueada após renovar acesso e desmontar/remontar; conferência manual autoriza leitura, confirma 1/8 sem segunda gravação e resposta antiga não regride o estado. PostgreSQL nativo isolado: 29 cenários de concorrência passaram; PGlite cobre funções e policies. Foram fechados 54 testes EBD direcionados, incluindo 20 de snapshots/PDF/eventos e regressão dos três geradores reais.

Entrada, administração, financeiro, camisas, tesouraria, reuniões, plenárias, tarefas, calendário, arquivos, comunicados, estudos, aniversariantes, pastor, visitantes, portal e eleições executados. Evidências finais: `evidencias/geometria.json` e `evidencias/superficies.json`; cobertura conciliada pelos hashes em `cobertura-navegador.md`. Não há aprovação de todos os cruzamentos de estados/perfis.

Verificações finais: tipos 0, 193/193 testes, build 0, diff-check 0. Lint: 298 erros/65 avisos contra 316/63 no baseline; quatro avisos novos somente em fixtures e dois antigos removidos. Nenhum aumento por arquivo/regra em produção. Fonte congelada de 379 arquivos comparada antes/depois e depois do commit: `final-checks/commit-verificado.json`. SQL ainda não autorizado; publicação bloqueada até resolver esse gate.

Correções adicionais: navegação Pastor entre 768 e 1023 px, debounce de Arquivos com limpeza, nomes acessíveis em Camisas e título simples Recebimentos enviados para sociedade. Cache após troca de conta e cópia visual de refresh validados por testes; clone real sem IDs/foco e rascunho preservado também conferido no navegador. Tabela percorrida por teclado até última ação; modal com ciclo de Tab, altura 320 e retorno de foco corrigido. Apresentação eleitoral usa a mesma apuração do painel e não declara vencedor sem maioria. Leituras indisponíveis agora geram erro explícito; refetch financeiro preserva saldo e rascunho em falha/recuperação. Geometria usa Chromium local via Browser suportado e espera 260 ms depois de resize; não equivale a teste físico/Safari. Texto ampliado 200% foi emulado por fonte raiz; zoom nativo do navegador não confirmado.
