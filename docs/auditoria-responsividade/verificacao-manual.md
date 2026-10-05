# Verificação manual e manutenção

Usar exclusivamente fixtures ou ambiente de homologação com pessoas fictícias. O roteiro não autoriza operar dados reais.

## Executado nesta auditoria

| Percurso | Resultado observado | Evidência |
| --- | --- | --- |
| Chamada 8/150 alunos, marcar/retirar, falha/perda/expiração/refetch | Feedback imediato; totais confirmados; falha isolada e desconhecido distintos | `chamada-cenarios.json`, `chamada-final-*.json`, diagnóstico |
| Pendência perdida → renovar acesso → desmontar/montar → Conferir | Linha/fechamento continuam bloqueados; uma escrita; confirmação por leitura; retorno antigo sem regressão | `chamada-orfa-renovacao.json` |
| Rolar até aluno 008 e tocar | Confirmado; botão terminou acima do rodapé de finalizar | `chamada-ultima-linha.json` |
| Tabela de usuários em 390 px, setas até última ação | Rolagem local alcança Cargo; página sem overflow | `tabela-teclado.json` |
| Modal usuários, Tab/resize 390→600 × 320/fechar | Foco fica no diálogo e retorna ao botão Novo usuário | `foco-modal-depois.json`, `foco-ciclo-tab.json` |
| Seleção de sociedade por Enter | Abre Identificação pelo botão nativo | `auth-sociedade-teclado.json` |
| Refresh visual com formulário real | Clone inerte, sem id/name/tabstop; rascunho e input único preservados | `clone-refresh.json` |
| Finanças normal→falha de refetch→recuperação | Último saldo mantido com aviso; rascunho permanece | `financas-refetch.json`, `financas-rascunho-refetch.json` |
| Arquivos buscar termo inexistente→Relatório | Empty state e resultado correspondente depois do debounce | `arquivos-busca.json` |
| Apuração 3–3–2 e erro de refetch | Sem vencedor, maioria5, aviso preservando último resultado | `eleicao-refetch.json`, screenshot final |
| Tesouraria sociedade/admin | Cinco campos preservados; pendentes fora saldo; banco/relatórios só perfis previstos | `tesouraria-banco-relatorios.json`, screenshot formulário final |
| Reunião Registro com texto longo/resize | Rascunho preservado; Ata/Resumo/WhatsApp pré-preenchidos também montados | `superficies.json` |
| Demais rotas, abas, formulários e estados | Cobertura por label/largura; nenhuma escrita remota | `cobertura-navegador.md` |

Os JSON acima estão em `evidencias/`. Somente as interações descritas foram comprovadas; abrir um modal não prova salvamento. Estados `empty/loading/error` são fixtures de consultas e não modelos completos dos serviços. Alguns estados antigos estavam apenas na confirmação de identidade; a coleta final acrescentou conteúdo do portal após confirmar.

## Repetir depois de alterar a chamada

1. Iniciar `tests/vite.latency.config.ts` na porta 8082 e abrir `/tests/fixtures/ebd-latency.html?count=8` ou `150`. Não usar o cliente Supabase real. Resetar preview entre rodadas e manter atrasos iguais.
2. Marcar e retirar; observar intenção pendente, contador confirmado e indicador estável. Tocar três alunos diferentes rapidamente e repetir o mesmo aluno antes da confirmação. Não deve duplicar a mesma chave.
3. Acionar os controles fictícios rejected/lost/expired/unavailable; conservar outro aluno confirmado. Renovar acesso/remontar durante desconhecido. Conferir por leitura autorizada; não reenviar automaticamente.
4. Iniciar leitura antiga antes de gravar e entregá-la depois. Marcação confirmada não pode voltar. Fechar/finalizar em outra sessão fictícia; queued não enviado deve parar. Executar testes de duas conexões no PostgreSQL isolado para a garantia do servidor.
5. Enquanto houver pendência, finalizar/fechar/PDF devem recusar. Após confirmação, releitura gera relatório coerente. Período/trimestre com snapshot antigo devem solicitar atualização, nunca baixar dados antigos silenciosamente.
6. Repetir navegação/back/renovação em Histórico, incluindo aluno transferido/inativo, limites de professor e administrador. Confirmar que datas/turmas históricas permanecem originais.

## Repetir fundação e módulos

1. Montar prévia Diretoria na porta8083 com configuração `tests/vite.diretoria.config.ts`; validar 320/390/768/1024/1440 e casos de largura extrema da matriz. Após resize esperar pelo menos260ms para estabilizar transição. Coletar viewport real, altura, estado/perfil e revisão.
2. Abrir formulários, preencher rascunho, alternar tamanhos e retornar foco. Navegar só por teclado até todas as ações, menus e selects. Tabelas largas devem rolar dentro de seu contêiner.
3. Em `controls=1`, usar Simular falha de leitura/Disparar refetch local e Leitura normal para testar erro/recuperação nas assinaturas existentes. Controles não conectam a Realtime real. Contas/perfis são substituídos; não usar isso como prova de autorização.
4. Tesouraria: gerar preview em diretório/porta exclusivos com `IPNC_TREASURY_PREVIEW_DIR`/`IPNC_TREASURY_PREVIEW_PORT`. Validar cinco campos da sociedade, pendências, admin avançado, valores altos/negativos, erro e relatórios/anexos nos testes separados.
5. Eleições: muitos candidatos/fotos; seleção e cancelamento da confirmação; apuração empatada/maioria/escrutínios nos testes; zero votos reais. Divulgação WhatsApp/IA/redefinição de senha/lançamentos só inspecionados ou simulados, nunca executados contra serviços reais.

## Homologação que exige ambiente externo

Em staging com contas descartáveis: sessão real expirada/revogada, RLS/PostgREST/PIN por sociedade/turma, duas abas/dispositivos, respostas reais fora de ordem e recuperação de conexão. Depois, iOS/Safari e Android com teclado virtual, orientação, safe areas, zoom nativo e leitor de tela. PWA: instalar, fechar/retomar, atualizar entre duas revisões e conferir rota/cache/logout sem apagar storage global. Registre versões e resultados reais. Esses cenários não foram declarados aprovados pelas fixtures locais.
