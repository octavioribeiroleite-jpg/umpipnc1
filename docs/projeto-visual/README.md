# Projeto visual IPNC — implementação completa do escopo documental

Referência: `IPNC_Projeto_Visual_Completo.pdf`, enviado pelo proprietário em 05/10/2026: 78 páginas, 61 pranchas e 36 declarações de rota no aplicativo, incluindo aliases e a rota curinga. As pranchas agrupam telas, abas e estados; não correspondem a 61 rotas independentes.

A implementação foi integrada ao worktree e validada por tipos, testes e build. A [matriz das 61 pranchas](matriz-61-pranchas.md) relaciona cada proposta ao código responsável e à evidência disponível. Este documento substitui o acompanhamento da primeira etapa: a entrega inclui a base compartilhada e os ajustes específicos das áreas descritas na matriz. Cobertura documental e código implementado não equivalem a uma captura individual de cada prancha nem a certificação em todos os dispositivos.

## Estado da entrega

| Entrega | Estado confirmado |
| --- | --- |
| Base visual inicial | Publicada anteriormente, revisão `a25509f`. |
| Correção urgente do acesso à Secretaria | Publicada separadamente, revisão `690f888`, versão `v29`. [Diagnóstico, preservação dos acessos e reprodução](incidente-secretaria-2026-10-05.md). |
| Implementação das demais pranchas | Integrada e validada no worktree. |
| Nova publicação do projeto visual completo | **Pendente da raiz da tarefa.** Commit, sincronização dos repositórios, revisão e versão do Site devem ser registrados somente depois de confirmados. |

O deploy urgente da Secretaria não comprova a publicação das alterações visuais posteriores. Prévia local, build e sincronização do código também não substituem a confirmação de deploy do Site existente.

## Base e aplicação às áreas

A base usa Inter local, marca oficial, superfícies sólidas, cores semânticas e hierarquia de títulos, leitura, tabelas e apoio. Campos e ações usam o alvo de conforto de 48 CSS px; nomes e valores longos recebem quebra de linha ou rolagem localizada da tabela. As larguras são variantes por função, não um limite único para todos os módulos.

Diretoria, Pastor e Secretaria compartilham a lógica visual de navegação inferior abaixo de 700 px, trilho de 76 px entre 700 e 1099 px e lateral de 224 px a partir de 1100 px, mantendo destinos e autorização próprios. A Tesouraria preserva sua exceção aprovada. Urna, apresentação eleitoral e portal conservam a navegação adequada à sua função.

Diálogos compartilham o mesmo componente em todas as larguras, com variantes de acesso, padrão, formulário e leitura ampla. A mudança de largura não troca um formulário por uma nova instância. Fechamento, retorno de foco, rótulos e mensagens de falha foram tratados nos componentes comuns. Seções internas usam abas legíveis e seletor no celular conforme a área.

- **Entrada e acesso:** quatro acessos principais, PIN/identificação em etapas, administração secundária, erros junto aos campos e estados explícitos de recuperação, indisponibilidade e rota inexistente.
- **Secretaria EBD:** chamada como ação principal, turmas com status sem competição visual, feedback por aluno, visitantes identificados, ações separadas da navegação, planilha completa, confirmações administrativas e estados honestos de consulta. Histórico filtra período e turma usando registros históricos e totais de fechamento.
- **Tesouraria, finanças e camisas:** contexto financeiro identificado, navegação por seção, pendências separadas de valores confirmados, prévias de comprovantes, controles de relatório visíveis e PINs em diálogo próprio. Os livros continuam separados.
- **Reuniões e plenárias:** registro principal e pauta de apoio, editores preservados entre seções, autosave serializado, distinção entre rascunho e texto confirmado, cancelamento sem publicação indevida e presença com situação textual. [Detalhamento e testes de rascunhos/histórico](reunioes-historico-implementacao-2026-10-05.md).
- **Tarefas, calendário, conteúdo e administração:** organização responsiva, textos completos, leitura de atas/estudos, upload com falha recuperável e navegação de configurações. A integração não implementada aparece indisponível.
- **Pastor, portal, visitantes e eleições:** prioridades de leitura, filtros, compositor pastoral, sugestões com ações distintas, conteúdo público sem dados administrativos, tabela de visitantes, etapas eleitorais reais e confirmação explícita de voto.

Os arquivos comuns estão em [interface-system.css](../../src/interface-system.css), [responsive-foundation.css](../../src/responsive-foundation.css), [AppLayout](../../src/components/layout/AppLayout.tsx), [ResponsiveSectionNavigation](../../src/components/layout/ResponsiveSectionNavigation.tsx), [Dialog](../../src/components/ui/dialog.tsx) e [ResponsiveDialog](../../src/components/ui/responsive-dialog.tsx). A matriz aponta os arquivos próprios de cada tela.

## Exceções e limites funcionais preservados

1. **Tesouraria desktop:** conservar a apresentação aprovada, incluindo a lateral de **232 px**, em vez de impor a lateral geral de 224 px.
2. **Tesouraria no celular:** conservar o desenho aprovado de entradas/saídas. Os quatro cards de sociedades continuam compactos, em duas colunas, com **sigla sem o nome por extenso**. Valores longos ou fonte ampliada podem aumentar a altura para não cortar conteúdo.
3. **Recebimento da sociedade:** exatamente **valor, data, pessoa relacionada, descrição e Pix/Dinheiro**. O caixa vem da sessão. Composição, reserva, conferência, vínculo bancário, saída, anexos e concessão de acesso permanecem restritos ao fluxo administrativo já autorizado. Recebimento enviado é pendente, não saldo confirmado. O [workflow atual da Tesouraria](../treasury/WORKFLOW.md) prevalece sobre inventários antigos.
4. **Portal de membros:** `/membro` permanece fechado. A tela explica a indisponibilidade e oferece retorno; não cria cadastro, coleta adicional ou acesso a funções não liberadas.
5. **Google Calendar:** a conexão automática ainda não está implementada. Configurações informa **Conexão indisponível**, sem botão que simule êxito.
6. **Marca e fotografias:** o símbolo oficial e os arquivos reais existentes foram preservados. Não foram inventados retratos de pessoas, fotos de candidatos, estampa ou dados reais. A imagem eleitoral sintética pertence exclusivamente à fixture local identificada como teste.
7. **Permissões e dados:** a padronização não reúne sessões nem amplia autorização de professor, diretoria, pastor, sociedade ou público. Esta implementação visual não criou migração, voto, presença, mensagem, lançamento financeiro ou credencial real para testar a entrega. As mudanças de banco anteriores documentadas no workflow da Tesouraria não são parte desta publicação visual.
8. **Histórico EBD:** a turma da presença gravada e os totais do fechamento continuam sendo a fonte histórica. Para aluno sem marcação não foi criada uma história de matrícula inexistente; permanece a elegibilidade já definida por `buildDayRoster`.

## Validação da integração

Resultados informados pela execução final da raiz em 05/10/2026, antes da nova publicação:

| Verificação | Resultado |
| --- | --- |
| `npx tsc -p tsconfig.app.json --noEmit` | Aprovado, saída 0. |
| `node --experimental-strip-types --test tests/*.mjs tests/*.ts` | **223 testes aprovados; 0 falhas.** |
| `npm run build` | Aprovado, saída 0. |
| ESLint | Base auditada: 308 erros / 66 avisos. Integração: 278 erros / 55 avisos. Nenhum diagnóstico novo pela comparação de arquivo, regra, severidade e mensagem, sem depender do número da linha. **O lint do projeto ainda não está zerado.** |

Os testes usam dados sintéticos, mocks e, quando aplicável, PostgreSQL isolado via PGlite. Há cobertura de snapshots/PDFs, fila e autorização da EBD, regras e relatórios da Tesouraria, limites de sessão, rascunhos concorrentes, resposta de voto, formulários e acessibilidade de controles. Teste de código ou mock não comprova o comportamento de RLS, rede e dispositivos em produção.

Inspeção representativa no navegador da integração, com **55 registros de medição** em [2026-10-05-geometria-final.json](2026-10-05-geometria-final.json). O arquivo conserva dois registros do calendário pastoral antes da correção, identificados como superados e ligados ao reteste final sem overflow; não devem ser contados como falhas atuais nem apagados da evidência:

- Reunião em 768 e 1024 px, sem overflow horizontal nas medições; sequência de digitar A, salvar, digitar B e alternar para Pauta observada. Os testes do hook verificam ordenação, falha/retry, refresh e desmontagem.
- Finanças em 390, 700 e 1100 px, sem overflow horizontal nas medições.
- Calendário pastoral em 320 px, conteúdo longo e fonte CSS de 200%: largura de conteúdo e rolagem medidas em 305 px, sem transbordamento horizontal.
- Calendário pastoral em 1440 px, sem overflow horizontal na medição.
- PIN administrativo da Tesouraria na fixture: confirmação divergente rejeitada; salvamento fictício exibiu **Acesso ativo** e ações **Trocar/Desativar**. Diálogo padrão com 358 px em viewport de 390 px.
- Histórico EBD em 390 px com turma histórica selecionada; plenária em 390 px e criação de reunião em 320 px com nomes longos/fonte CSS de 200%.
- Urna em 320 px/fonte CSS de 200%: erro simulado manteve seleção e confirmação; nova tentativa simulada concluiu. Portal em 320 px com identificação fictícia e em 1440 px com lateral de 224 px. Recuperação válida/inválida, retorno público da página não encontrada e mensagem de membros fechados também foram observados.
- Tesouraria: lateral desktop de 232 px preservada, conferência bancária com total/vinculado/disponível, recebimento simples de cinco campos e pendências fora dos saldos. Desativação de PIN foi aberta e cancelada na fixture.
- Secretaria em 320 px: sessão própria válida do professor continuou acessível com falha da conta principal; sessão EBD expirada exigiu novamente o PIN. A correção urgente da Secretaria tem cenários próprios de falha da conta principal, professor autorizado e renovação de PIN no [registro do incidente](incidente-secretaria-2026-10-05.md).

O arquivo [2026-10-05-geometria.json](2026-10-05-geometria.json) conserva medições da **primeira etapa**, incluindo rotas da Diretoria, Pastor, entrada, fonte ampliada e estados especiais. Ele é referência da base publicada, não uma nova varredura de todas as telas após os ajustes finais. A coluna de evidência da matriz distingue essa referência das inspeções atuais.

Não houve captura individual de todas as 61 pranchas. Emulação de viewport em Chromium e ampliação da fonte por CSS não comprovam aparelho físico, Safari, teclado virtual real, zoom nativo nem todos os recursos assistivos. Também não se declara uma certificação integral de acessibilidade.

## Reprodução local e publicação

Usar Node.js 22 ou superior e as dependências de `package-lock.json`. As prévias abaixo são isoladas e não são pontos de entrada de produção:

```sh
npx vite --config tests/vite.diretoria.config.ts --port 8083
npx vite --config tests/vite.ebd.config.ts --port 8092 --host 127.0.0.1 --strictPort
IPNC_TREASURY_PREVIEW_DIR=/tmp/ipnc-visual-treasury-ui IPNC_TREASURY_PREVIEW_PORT=8091 node scripts/treasury-ui-preview.mjs --serve
```

Diretoria: `/__diretoria/<rota>?role=admin&controls=0`. EBD: `/tests/fixtures/ebd-back.html?role=professor`; histórico: `/tests/fixtures/ebd-history.html`. Tesouraria: `/`. Os cenários disponíveis e as restrições da fixture principal estão em [tests/fixtures/diretoria/README.md](../../tests/fixtures/diretoria/README.md).

A raiz conclui a entrega conforme `AGENTS.md`: integrar alterações existentes, publicar exatamente o código validado, sincronizar `main` nos dois repositórios e confirmar o estado do deploy no Site existente. Após essa confirmação, registrar aqui ou no relatório final a revisão, a versão e a URL realmente publicadas. Até lá, o estado desta nova publicação permanece pendente.
