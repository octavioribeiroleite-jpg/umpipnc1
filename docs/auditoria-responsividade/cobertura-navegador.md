# Cobertura de navegador — evidência registrada em 05/10/2026

**Estado: coleta final encerrada e consolidada; alcance limitado aos registros identificados.** As tabelas de labels deste relatório resumem `evidencias/geometria.json` e `evidencias/superficies.json`, produzidos pela coordenação durante navegação nas prévias locais. O autor desta consolidação não operou o navegador; leu também os registros específicos de interação e três PNG finais, identificados no complemento abaixo. Inspeções estáticas anteriores estão em `matriz.md`; elas não viraram aprovação visual automaticamente.

Extração: 2026-10-05T13:41:57-03:00. Os arquivos podem receber novas linhas depois desta extração; as contagens abaixo valem para os hashes registrados ao final.

## O que os arquivos comprovam

| Tipo de evidência | Conteúdo disponível | Limite da conclusão |
| --- | --- | --- |
| Geometria DOM | Label, largura solicitada, viewport, scroll do documento, client em parte das amostras e lista de elementos candidatos que excederam o enquadramento | Confirma a medição naquele estado/largura. Não confirma legibilidade, contraste, foco, ações alcançáveis, persistência, integridade nem autorização. |
| Snapshot semântico | Label, path e árvore textual de elementos/controles em `snapshot` | Permite conferir página, aba selecionada e conteúdo montado; não é screenshot nem prova visual da disposição. O snapshot não registra largura própria. |
| Screenshot | Nenhum campo de imagem/captura nesses dois arquivos; PNGs separados listados no complemento | Não é possível atribuir uma captura a cada label/largura apenas com essas fontes. Isso não afirma que a sessão não produziu outras capturas; elas devem ser registradas separadamente. |
| Interação | Labels nomeiam alguns estados alcançados, como modal ou rascunho | A existência do estado é evidência de montagem/medição. Os arquivos não contêm sequência de ações, asserções ou resultado de gravação. Não declarar salvamento, foco, toque, retry, preservação de rascunho ou operação financeira aprovados por inferência. |

Contagem: **1296 medições**, **242 labels geométricos**, **1295 pares únicos label × largura**, **205 snapshots semânticos**. Repetições do mesmo par não representam novos estados. Larguras presentes: 320, 360, 375, 390, 412, 430, 540, 600, 767, 768, 820, 1023, 1024, 1280, 1440, 1920, 2560 CSS px.

Em **0** medições, `scroll` excede a referência registrada em mais de 1 px (`client` quando presente, `viewport` quando ausente). Em **49** medições há candidatos na lista `overflow`. Essa lista também inclui decoração recortada e filhos de tabelas com scroll local; ela não é uma lista automática de defeitos. Diferença de 15 px entre viewport e client/scroll pode corresponder à barra vertical, e não é, sozinha, transbordamento.

## Grupos realmente registrados

| Grupo | Labels geométricos | Medições | Labels com snapshot semântico |
| --- | --- | --- | --- |
| Secretaria/EBD | 21 | 146 | 0 |
| Entrada e acesso | 15 | 79 | 12 |
| Administração e Home | 15 | 73 | 14 |
| Financeiro e tesouraria | 41 | 235 | 31 |
| Reuniões e plenárias | 27 | 145 | 26 |
| Tarefas e calendário | 19 | 78 | 19 |
| Conteúdo e aniversariantes | 28 | 140 | 28 |
| Pastor e sociedades | 19 | 105 | 18 |
| Portal e visitantes | 27 | 133 | 27 |
| Eleições | 28 | 160 | 28 |
| Fundação e componentes compartilhados | 2 | 2 | 2 |

Nenhum total acima equivale a “todas as rotas, todos os perfis ou todos os estados”. Apenas os labels explícitos abaixo entram na cobertura. Um módulo com label de listagem não herda aprovação dos seus modais e subtelas. Professor/admin não são intercambiáveis.

## Label × larguras executadas

A coluna “DOM” indica a quantidade de snapshots semânticos com o mesmo label. “Geom.” é a quantidade de medições, inclusive repetidas. A lista de larguras contém somente valores presentes no JSON.

| Label exato | Larguras CSS px | Geom. | DOM | Larguras com candidatos `overflow` |
| --- | --- | --- | --- | --- |
| EBD Home admin | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| EBD Turmas lista | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Turma edição | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Turma alunos | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Transferência | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Planilha alunos | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Importar CSV passo1 | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Configurações PINs | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD PIN da turma modal | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Acessos vazio | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Aniversariantes preenchido | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Aniversariante modal rascunho | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Histórico lista preenchida | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Histórico encontro detalhe | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Histórico chamada finalizada | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Renovação acesso modal | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| EBD Chamada professor visitante rascunho | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 16 | 0 | Nenhuma registrada |
| EBD Home professor | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Entrada auth anônima | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| EBD Perfil entrada | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD PIN professor | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| Entrada Tesouraria popup sociedades | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Entrada Tesouraria PIN sociedade | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| EBD Professor identificação | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Reset formulário válido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reset link inválido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Membro indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| 404 | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Dashboard admin | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 1 | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280 |
| Admin Configurações Geral | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Admin Usuários diretoria | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Admin Novo usuário modal | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Finanças Cobranças | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390, 768 |
| Finanças Comprovantes | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças Movimentações | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças Relatórios | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças Mais | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças ação Registrar entrada abre Movimentações | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças Registrar pagamento modal | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças Gastos | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Dízimos sociedade e valores | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Camisas Resumo | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Camisas Campanhas | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Camisas Encomendas | 320, 390, 768, 1024, 1440 | 5 | 1 | 320 |
| Camisas Compras | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Camisas Vendas | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Camisas Estoque | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Camisas Nova encomenda modal | 320, 390, 768, 1024, 1440 | 5 | 1 | 320 |
| Tesouraria sociedade recebimentos pendentes | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| Tesouraria recebimento simples cinco campos | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| Tesouraria administrador caixa e pendências | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Tesouraria administrador conferência avançada | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Tesouraria valores altos e negativos | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| Tesouraria consulta indisponível | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Camisas nova encomenda nomes acessíveis corrigidos | 320, 390, 768, 1024, 1440 | 5 | 1 | 320 |
| Reuniões lista preenchida | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reuniões nova reunião | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião ID inexistente redireciona e informa erro | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião detalhe menu | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião Registro anotações | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião rascunho longo resize | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 0 | Nenhuma registrada |
| Reunião Resumo IA | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião Ata | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião WhatsApp | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião Pauta | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião Ações | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Plenárias lista preenchida | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Plenária nova modal | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Plenárias Membros | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Plenária detalhe presença e anotações | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Tarefas quadro | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Tarefas formulário | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Calendário mês | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Calendário dia | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Calendário novo evento | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Arquivos nomes extensos | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Arquivos upload formulário | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Comunicados texto longo | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Estudos lista longa | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Estudos detalhe texto longo | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Estudos novo formulário | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Comunicados edição | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Comunicados texto expandido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Comunicados formulário | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Aniversariantes entrada principal | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Aniversariantes formulário principal | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor painel | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 1 | Nenhuma registrada |
| Pastor navegação vizinhança breakpoint | 767, 768, 820, 1023, 1024 | 5 | 0 | Nenhuma registrada |
| Pastor sociedade | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor calendário | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor comunicados longo | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor novo comunicado | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Sugestões alias /pastor/sugestoes | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Sugestões alias /pastor-sugestoes | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Sugestões alias /sugestoes | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor responder sugestão | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal igreja identificação | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 1 | Nenhuma registrada |
| Portal igreja confirmar identidade | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal igreja início | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal igreja Programações | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal igreja Avisos | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal igreja Dízimos | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal igreja menu | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Visitantes gestão | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleições lista | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleições nova configuração | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição detalhe rascunho | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição presenças | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição dispositivos | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição QR dispositivo fictício | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Votação pública muitos candidatos | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 1 | Nenhuma registrada |
| Votação confirmação sem envio | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Votação urna aguardando | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Votação já realizada | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Votação encerrada | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição apresentação | 320, 360, 375, 390, 412, 430, 540, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 | 15 | 1 | Nenhuma registrada |
| Eleição resultado encerrado | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição apresentação resultados | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleições camisas | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleições aba Camisas | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /reunioes estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /reunioes estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /reunioes estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /tarefas estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /tarefas estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /tarefas estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /calendario estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /calendario estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /calendario estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /arquivos estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /arquivos estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /arquivos estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /comunicados estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /comunicados estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /comunicados estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /estudos estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /estudos estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /estudos estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /aniversariantes estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /aniversariantes estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /aniversariantes estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /plenarias estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /plenarias estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /plenarias estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /financas estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /financas estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /financas estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /camisas estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /camisas estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /camisas estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /usuarios estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /usuarios estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /usuarios estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /configuracoes estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /configuracoes estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /configuracoes estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /visitantes estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /visitantes estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /visitantes estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /eleicoes estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /eleicoes estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /eleicoes estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /igreja estado empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /igreja estado error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /igreja estado loading | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /comunicados erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /estudos erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /plenarias erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /aniversariantes erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /usuarios erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /visitantes?role=pastor erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor?role=pastor erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor/comunicados?role=pastor erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor/sugestoes?role=pastor erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| /pastor/sociedade/ump?role=pastor erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Tabela usuários ações por teclado | 390 | 1 | 1 | Nenhuma registrada |
| Configurações tabela rolagem e teclado | 390 | 1 | 1 | Nenhuma registrada |
| Usuários modal foco e rascunho | 390 | 1 | 1 | Nenhuma registrada |
| Modal foco retorno corrigido | 390 | 1 | 1 | Nenhuma registrada |
| Fundação clone decorativo | 390 | 1 | 1 | Nenhuma registrada |
| Autenticação texto ampliado 200 por cento | 390, 768, 1440 | 3 | 1 | Nenhuma registrada |
| Tarefas texto ampliado 200 por cento | 390, 768, 1440 | 3 | 1 | Nenhuma registrada |
| Modal tarefa texto ampliado 200 por cento | 390, 768, 1440 | 3 | 1 | Nenhuma registrada |
| Eleição apresentação empate corrigida | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reuniões erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Tarefas erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Calendário erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Arquivos erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Configurações erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleições erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Finanças erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Finanças refetch falha conserva saldo | 320, 390, 768, 1024, 1440 | 5 | 0 | 320, 390, 768 |
| Finanças aba Comprovantes leitura indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças aba Movimentações leitura indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças aba Camisas leitura indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças aba Relatórios leitura indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças aba Mais leitura indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Reunião processada menu | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião processada Resumo IA | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião processada Ata | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Reunião processada WhatsApp | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Arquivos busca sem resultado | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Autenticação carregamento final | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Autenticação entrada pronta | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Autenticação login administrativo | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Autenticação PIN diretoria | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Tesouraria sociedade título Recebimentos enviados | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Tesouraria relatórios sociedade expandido | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Autenticação PIN fictício resposta | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Autenticação seleção de identidade | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Tesouraria conferência bancária formulário admin | 320, 390, 768, 1024, 1440 | 5 | 0 | Nenhuma registrada |
| Calendário controles de período | 390 | 1 | 1 | Nenhuma registrada |
| Calendário período Semana | 320, 390 | 2 | 1 | Nenhuma registrada |
| Calendário período Mês | 320, 390 | 2 | 1 | Nenhuma registrada |
| Calendário período 15 dias | 320, 390 | 2 | 1 | Nenhuma registrada |
| Visitantes lista de dias | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Visitantes data preenchida | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal confirmação empty | 390 | 1 | 1 | Nenhuma registrada |
| Portal conteúdo empty | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal confirmação error | 390 | 1 | 1 | Nenhuma registrada |
| Portal conteúdo error | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Apresentação eleitoral erro explícito | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Detalhe eleitoral consulta indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleições lista final | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Eleição formulário rótulos finais | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Detalhe eleitoral erro explícito | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Apuração eleitoral erro refetch conserva resultado | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal identificação consulta indisponível | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal confirmação antes do erro | 390 | 1 | 1 | Nenhuma registrada |
| Portal início erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal Programações erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal Avisos erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Portal Dízimos erro corrigido | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor comunicados final | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Pastor comunicado nomes acessíveis finais | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |
| Entrada final botões nativos | 390 | 1 | 1 | Nenhuma registrada |
| Finanças configurações rótulos finais | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Finanças configurações sociedade rótulos finais | 320, 390, 768, 1024, 1440 | 5 | 1 | 320, 390 |
| Contador eleitoral erro conserva último número | 320, 390, 768, 1024, 1440 | 5 | 1 | Nenhuma registrada |

## Associação de snapshots a caminhos

Os paths são reproduzidos da evidência; alguns são relativos e outros contêm a origem local. A mesma label permite relacionar a árvore semântica à varredura de larguras, mas **não** transforma um único snapshot em captura visual por largura.

| Label | Path registrado | Controle selecionado/diálogo explicitamente presente no snapshot |
| --- | --- | --- |
| Reset formulário válido | `/reset-password?role=admin` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reset link inválido | `/reset-password?role=anonymous&recovery=invalid` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Membro indisponível | `/membro?role=anonymous` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| 404 | `/inexistente?role=anonymous` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Dashboard admin | `/?role=admin` | dialog "Novas Sugestões do Pastor": |
| Admin Configurações Geral | `/configuracoes?role=admin` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Admin Usuários diretoria | `/usuarios?role=admin` | tab "União de Jovens — Exemplo 1" [selected]:; tabpanel "União de Jovens — Exemplo 1": |
| Finanças Cobranças | `/financas?role=admin` | tab "Cobranças" [selected]:; tabpanel "Cobranças": |
| Finanças Comprovantes | `http://127.0.0.1:8083/__diretoria/financas?tab=comprovantes` | tab "Comprovantes" [active] [selected]:; tabpanel "Comprovantes": |
| Finanças Movimentações | `http://127.0.0.1:8083/__diretoria/financas?tab=receitas` | tab "Movimentações" [active] [selected]:; tabpanel "Movimentações": |
| Finanças Relatórios | `http://127.0.0.1:8083/__diretoria/financas?tab=relatorios` | tab "Relatórios" [active] [selected]:; tabpanel "Relatórios": |
| Finanças Mais | `http://127.0.0.1:8083/__diretoria/financas?tab=configuracoes` | tab "Mais" [active] [selected]:; tabpanel "Mais": |
| Finanças ação Registrar entrada abre Movimentações | `http://127.0.0.1:8083/__diretoria/financas?tab=receitas` | tab "Movimentações" [selected]:; tabpanel "Movimentações": |
| Finanças Registrar pagamento modal | `http://127.0.0.1:8083/__diretoria/financas?tab=receitas` | tab [selected]:; dialog "Registrar Pagamento": |
| Finanças Gastos | `http://127.0.0.1:8083/__diretoria/financas?tab=gastos` | tab "Movimentações" [selected]:; tabpanel "Movimentações": |
| Dízimos sociedade e valores | `/dizimos?role=admin` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Camisas Resumo | `/camisas?role=admin` | tab "Resumo" [selected]; tabpanel "Resumo": |
| Camisas Campanhas | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab "Campanhas" [active] [selected]; tabpanel "Campanhas": |
| Camisas Encomendas | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab "Encomendas" [active] [selected]; tabpanel "Encomendas": |
| Camisas Compras | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab "Compras" [active] [selected]; tabpanel "Compras": |
| Camisas Vendas | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab "Vendas" [active] [selected]; tabpanel "Vendas": |
| Camisas Estoque | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab "Estoque" [active] [selected]; tabpanel "Estoque": |
| Camisas Nova encomenda modal | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab [selected]: Encomendas; dialog "Nova Encomenda": |
| Camisas nova encomenda nomes acessíveis corrigidos | `http://127.0.0.1:8083/__diretoria/camisas?role=admin&controls=0` | tab [selected]: Encomendas; dialog "Nova Encomenda": |
| Reuniões lista preenchida | `/reunioes` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reuniões nova reunião | `http://127.0.0.1:8083/__diretoria/reunioes/nova` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião ID inexistente redireciona e informa erro | `/reunioes/meeting-1` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião detalhe menu | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião Registro anotações | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião Resumo IA | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião Ata | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião WhatsApp | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião Pauta | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião Ações | `http://127.0.0.1:8083/__diretoria/reunioes/meeting` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Plenárias lista preenchida | `/plenarias` | tab "Plenárias" [selected]:; tabpanel "Plenárias": |
| Plenária nova modal | `http://127.0.0.1:8083/__diretoria/plenarias?controls=0` | tab [selected]:; dialog "Nova Plenária": |
| Plenárias Membros | `http://127.0.0.1:8083/__diretoria/plenarias?tab=membros` | tab "Membros" [active] [selected]:; tabpanel "Membros": |
| Plenária detalhe presença e anotações | `http://127.0.0.1:8083/__diretoria/plenarias/plenary` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Tarefas quadro | `/tarefas` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Tarefas formulário | `http://127.0.0.1:8083/__diretoria/tarefas?controls=0` | dialog "Nova Tarefa": |
| Calendário mês | `/calendario` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Calendário dia | `http://127.0.0.1:8083/__diretoria/calendario?controls=0` | dialog "Editar Evento": |
| Calendário novo evento | `http://127.0.0.1:8083/__diretoria/calendario?controls=0` | dialog "Novo Evento": |
| Arquivos nomes extensos | `/arquivos?state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Arquivos upload formulário | `http://127.0.0.1:8083/__diretoria/arquivos?state=long&controls=0` | dialog "Enviar arquivo": |
| Comunicados texto longo | `/comunicados?state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Estudos lista longa | `/estudos?state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Estudos detalhe texto longo | `http://127.0.0.1:8083/__diretoria/estudos?state=long&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Estudos novo formulário | `http://127.0.0.1:8083/__diretoria/estudos?state=long&controls=0` | dialog "Novo Estudo": |
| Comunicados edição | `/comunicados?state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Comunicados texto expandido | `http://127.0.0.1:8083/__diretoria/comunicados?state=long&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Comunicados formulário | `http://127.0.0.1:8083/__diretoria/comunicados?state=long&controls=0` | dialog "Comunicado para União de Jovens — Exemplo fictício": |
| Aniversariantes entrada principal | `/aniversariantes` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Aniversariantes formulário principal | `http://127.0.0.1:8083/__diretoria/aniversariantes?controls=0` | dialog "Novo aniversariante": |
| Pastor painel | `/pastor?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor sociedade | `/pastor/sociedade/ump?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor calendário | `/pastor/calendario?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor comunicados longo | `/pastor/comunicados?role=pastor&state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor novo comunicado | `http://127.0.0.1:8083/__diretoria/pastor/comunicados?role=pastor&state=long&controls=0` | dialog "Novo Comunicado": |
| Sugestões alias /pastor/sugestoes | `/pastor/sugestoes?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Sugestões alias /pastor-sugestoes | `/pastor-sugestoes?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Sugestões alias /sugestoes | `/sugestoes?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor responder sugestão | `http://127.0.0.1:8083/__diretoria/sugestoes?role=pastor&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja identificação | `/igreja?role=anonymous&portal=new` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja confirmar identidade | `/igreja?role=anonymous&portal=return` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja início | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&portal=return&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja Programações | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&portal=return&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja Avisos | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&portal=return&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja Dízimos | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&portal=return&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal igreja menu | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&portal=return&controls=0` | dialog "Navegação do portal da igreja": |
| Visitantes gestão | `/visitantes?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleições lista | `/eleicoes` | tab "Cargos" [selected]: |
| Eleições nova configuração | `http://127.0.0.1:8083/__diretoria/eleicoes?controls=0` | tab [selected]:; dialog "Nova Eleição": |
| Eleição detalhe rascunho | `http://127.0.0.1:8083/__diretoria/eleicoes/election` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleição presenças | `http://127.0.0.1:8083/__diretoria/eleicoes/election` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleição dispositivos | `http://127.0.0.1:8083/__diretoria/eleicoes/election` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleição QR dispositivo fictício | `http://127.0.0.1:8083/__diretoria/eleicoes/election` | dialog "Urna de demonstração": |
| Votação pública muitos candidatos | `/vote/election?role=anonymous&state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Votação confirmação sem envio | `http://127.0.0.1:8083/__diretoria/vote/election?role=anonymous&state=long&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Votação urna aguardando | `/vote/election?role=anonymous&mode=urna&token=fixture-urna` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Votação já realizada | `/vote/election?role=anonymous&voted=1` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Votação encerrada | `/vote/election?role=anonymous&election=finished` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleição apresentação | `/eleicao/election/apresentar?state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleição resultado encerrado | `/eleicoes/election?election=finished` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleição apresentação resultados | `/eleicao/election/apresentar?election=finished&state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleições camisas | `/eleicoes?kind=camisa` | tab "Cargos" [selected]: |
| Eleições aba Camisas | `http://127.0.0.1:8083/__diretoria/eleicoes?kind=camisa&controls=0` | tab "Camisas" [active] [selected]: |
| /reunioes estado empty | `/reunioes?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /reunioes estado error | `/reunioes?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /reunioes estado loading | `/reunioes?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /tarefas estado empty | `/tarefas?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /tarefas estado error | `/tarefas?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /tarefas estado loading | `/tarefas?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /calendario estado empty | `/calendario?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /calendario estado error | `/calendario?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /calendario estado loading | `/calendario?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /arquivos estado empty | `/arquivos?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /arquivos estado error | `/arquivos?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /arquivos estado loading | `/arquivos?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /comunicados estado empty | `/comunicados?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /comunicados estado error | `/comunicados?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /comunicados estado loading | `/comunicados?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /estudos estado empty | `/estudos?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /estudos estado error | `/estudos?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /estudos estado loading | `/estudos?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /aniversariantes estado empty | `/aniversariantes?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /aniversariantes estado error | `/aniversariantes?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /aniversariantes estado loading | `/aniversariantes?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /plenarias estado empty | `/plenarias?state=empty` | tab "Plenárias" [selected]:; tabpanel "Plenárias": |
| /plenarias estado error | `/plenarias?state=error` | tab "Plenárias" [selected]:; tabpanel "Plenárias": |
| /plenarias estado loading | `/plenarias?state=loading` | tab "Plenárias" [selected]:; tabpanel "Plenárias": |
| /financas estado empty | `/financas?state=empty` | tab "Cobranças" [selected]:; tabpanel "Cobranças": |
| /financas estado error | `/financas?state=error` | tab "Cobranças" [selected]:; tabpanel "Cobranças": |
| /financas estado loading | `/financas?state=loading` | tab "Cobranças" [selected]:; tabpanel "Cobranças": |
| /camisas estado empty | `/camisas?state=empty` | tab "Resumo" [selected]; tabpanel "Resumo": |
| /camisas estado error | `/camisas?state=error` | tab "Resumo" [selected]; tabpanel "Resumo": |
| /camisas estado loading | `/camisas?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /usuarios estado empty | `/usuarios?state=empty` | tab "União de Jovens — Exemplo 1" [selected]:; tabpanel "União de Jovens — Exemplo 1": |
| /usuarios estado error | `/usuarios?state=error` | tab "Geral 0" [selected]:; tabpanel "Geral 0": |
| /usuarios estado loading | `/usuarios?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /configuracoes estado empty | `/configuracoes?state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /configuracoes estado error | `/configuracoes?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /configuracoes estado loading | `/configuracoes?state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor estado empty | `/pastor?role=pastor&state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor estado error | `/pastor?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor estado loading | `/pastor?role=pastor&state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /visitantes estado empty | `/visitantes?role=pastor&state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /visitantes estado error | `/visitantes?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /visitantes estado loading | `/visitantes?role=pastor&state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /eleicoes estado empty | `/eleicoes?role=admin&state=empty` | tab "Cargos" [selected]: |
| /eleicoes estado error | `/eleicoes?role=admin&state=error` | tab "Cargos" [selected]: |
| /eleicoes estado loading | `/eleicoes?role=admin&state=loading` | tab "Cargos" [selected]: |
| /igreja estado empty | `/igreja?role=anonymous&portal=return&state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /igreja estado error | `/igreja?role=anonymous&portal=return&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /igreja estado loading | `/igreja?role=anonymous&portal=return&state=loading` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /comunicados erro corrigido | `/comunicados?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /estudos erro corrigido | `/estudos?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /plenarias erro corrigido | `/plenarias?state=error` | tab "Plenárias" [selected]:; tabpanel "Plenárias": |
| /aniversariantes erro corrigido | `/aniversariantes?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /usuarios erro corrigido | `/usuarios?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /visitantes?role=pastor erro corrigido | `/visitantes?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor?role=pastor erro corrigido | `/pastor?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor/comunicados?role=pastor erro corrigido | `/pastor/comunicados?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor/sugestoes?role=pastor erro corrigido | `/pastor/sugestoes?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| /pastor/sociedade/ump?role=pastor erro corrigido | `/pastor/sociedade/ump?role=pastor&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Tabela usuários ações por teclado | `/usuarios` | tab "União de Jovens — Exemplo 1" [selected]:; tabpanel "União de Jovens — Exemplo 1": |
| Configurações tabela rolagem e teclado | `/configuracoes` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Usuários modal foco e rascunho | `/usuarios` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Modal foco retorno corrigido | `/usuarios` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Fundação clone decorativo | `/__boundary` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação texto ampliado 200 por cento | `/auth?role=anonymous&font=200` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Tarefas texto ampliado 200 por cento | `/tarefas?font=200` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Modal tarefa texto ampliado 200 por cento | `http://127.0.0.1:8083/__diretoria/tarefas?font=200&controls=0` | dialog "Nova Tarefa": |
| Eleição apresentação empate corrigida | `/eleicao/election/apresentar?election=finished&state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reuniões erro corrigido | `/reunioes?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Tarefas erro corrigido | `/tarefas?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Calendário erro corrigido | `/calendario?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Arquivos erro corrigido | `/arquivos?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Configurações erro corrigido | `/configuracoes?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Eleições erro corrigido | `/eleicoes?state=error` | tab "Cargos" [selected]: |
| Finanças erro corrigido | `/financas?state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Finanças aba Comprovantes leitura indisponível | `http://127.0.0.1:8083/__diretoria/financas?tab=comprovantes` | tab "Comprovantes" [active] [selected]:; tabpanel "Comprovantes": |
| Finanças aba Movimentações leitura indisponível | `http://127.0.0.1:8083/__diretoria/financas?tab=receitas` | tab "Movimentações" [active] [selected]:; tabpanel "Movimentações": |
| Finanças aba Camisas leitura indisponível | `http://127.0.0.1:8083/__diretoria/financas?tab=camisas` | tab "Camisas" [active] [selected]:; tabpanel "Camisas": |
| Finanças aba Relatórios leitura indisponível | `http://127.0.0.1:8083/__diretoria/financas?tab=relatorios` | tab "Relatórios" [active] [selected]:; tabpanel "Relatórios": |
| Finanças aba Mais leitura indisponível | `http://127.0.0.1:8083/__diretoria/financas?tab=configuracoes` | tab "Mais" [active] [selected]:; tabpanel "Mais": |
| Reunião processada menu | `/reunioes/meeting?processed=1&state=long` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião processada Resumo IA | `http://127.0.0.1:8083/__diretoria/reunioes/meeting?processed=1&state=long&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião processada Ata | `http://127.0.0.1:8083/__diretoria/reunioes/meeting?processed=1&state=long&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Reunião processada WhatsApp | `http://127.0.0.1:8083/__diretoria/reunioes/meeting?processed=1&state=long&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Arquivos busca sem resultado | `http://127.0.0.1:8083/__diretoria/arquivos?controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação carregamento final | `/auth?role=anonymous` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação entrada pronta | `http://127.0.0.1:8083/__diretoria/auth?role=anonymous&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação login administrativo | `http://127.0.0.1:8083/__diretoria/auth?role=anonymous&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação PIN diretoria | `http://127.0.0.1:8083/__diretoria/auth?role=anonymous&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação PIN fictício resposta | `http://127.0.0.1:8083/__diretoria/auth?role=anonymous&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Autenticação seleção de identidade | `http://127.0.0.1:8083/__diretoria/auth?role=anonymous&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Calendário controles de período | `/calendario` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Calendário período Semana | `http://127.0.0.1:8083/__diretoria/calendario?controls=0` | tab "Semana" [active] [selected] |
| Calendário período Mês | `http://127.0.0.1:8083/__diretoria/calendario?controls=0` | tab "Mês" [active] [selected] |
| Calendário período 15 dias | `http://127.0.0.1:8083/__diretoria/calendario?controls=0` | tab "15 dias" [active] [selected] |
| Visitantes lista de dias | `/visitantes?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Visitantes data preenchida | `http://127.0.0.1:8083/__diretoria/visitantes?role=pastor&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal confirmação empty | `/igreja?role=anonymous&returning=1&state=empty` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal conteúdo empty | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&returning=1&state=empty&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal confirmação error | `/igreja?role=anonymous&returning=1&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal conteúdo error | `http://127.0.0.1:8083/__diretoria/igreja?role=anonymous&returning=1&state=error&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Apresentação eleitoral erro explícito | `/eleicao/election/apresentar?election=finished&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Detalhe eleitoral consulta indisponível | `/eleicoes/election?election=finished&state=error` | tab "Cargos" [selected]: |
| Eleições lista final | `/eleicoes` | tab "Cargos" [selected]: |
| Eleição formulário rótulos finais | `http://127.0.0.1:8083/__diretoria/eleicoes?controls=0` | tab [selected]:; dialog "Nova Eleição": |
| Detalhe eleitoral erro explícito | `/eleicoes/election?election=finished&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Apuração eleitoral erro refetch conserva resultado | `http://127.0.0.1:8083/__diretoria/eleicoes/election?election=finished&controls=1` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal identificação consulta indisponível | `/igreja?portal=new&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal confirmação antes do erro | `/igreja?portal=return&state=error` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal início erro corrigido | `http://127.0.0.1:8083/__diretoria/igreja?portal=return&state=error&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal Programações erro corrigido | `http://127.0.0.1:8083/__diretoria/igreja?portal=return&state=error&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal Avisos erro corrigido | `http://127.0.0.1:8083/__diretoria/igreja?portal=return&state=error&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Portal Dízimos erro corrigido | `http://127.0.0.1:8083/__diretoria/igreja?portal=return&state=error&controls=0` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor comunicados final | `/pastor/comunicados?role=pastor` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Pastor comunicado nomes acessíveis finais | `http://127.0.0.1:8083/__diretoria/pastor/comunicados?role=pastor&controls=0` | dialog "Novo Comunicado": |
| Entrada final botões nativos | `/auth?role=anonymous` | Sem tab/modal específico identificado nessa extração; consultar snapshot |
| Finanças configurações rótulos finais | `/financas?tab=configuracoes` | tab "Mais" [selected]:; tabpanel "Mais": |
| Finanças configurações sociedade rótulos finais | `http://127.0.0.1:8083/__diretoria/financas?tab=configuracoes&controls=0` | tab "Mais" [selected]:; tabpanel "Mais": |
| Contador eleitoral erro conserva último número | `http://127.0.0.1:8083/__diretoria/eleicao/election/apresentar?election=finished&result=hidden&controls=1` | Sem tab/modal específico identificado nessa extração; consultar snapshot |

## Diagnóstico dos candidatos de overflow por fonte

### Dashboard admin

O candidato `DIV.pointer-events-none.absolute.-right-12.-top-16...` é o círculo decorativo vazio em `src/pages/Index.tsx`, dentro da seção `diretoria-welcome` com `overflow-hidden` no mesmo componente. A posição negativa é intencional para recortar o desenho no card. Não contém texto nem ação e não recebe ponteiro. As medições disponíveis desse label não mostram `scroll` maior que a referência do documento. Classificação por fonte + geometria: **recorte decorativo local legítimo**, sem defeito global demonstrado. Isso não é justificativa para ocultar overflow do documento.

### Finanças: cobranças e outras abas

Os candidatos com texto `DataSociedadeTipoDescriçãoValorStatus` pertencem a **Movimentações recentes**, em `src/pages/Financas.tsx`. Essa tabela fica acima do tabpanel e reaparece sob labels de Cobranças, Comprovantes, Movimentações, Relatórios e Mais. Não atribuir automaticamente seu candidato à aba nomeada.

O candidato de 768 px com `MembroCobrança anualPagoRestanteStatusVencimentoAções` pertence à tabela de `src/components/financas/CobrancasTab.tsx`, montada no card desktop. Ambas usam `src/components/ui/table.tsx`, cujo wrapper contém `min-w-0 max-w-full w-full overflow-auto overscroll-x-contain`. Os filhos podem ter bounding boxes além da viewport enquanto o ancestral mantém scroll horizontal local. Os registros existentes não mostram aumento correspondente do documento. Classificação por fonte + geometria: **compatível com scroll local legítimo**, sem prova de corte irrecuperável. O complemento registra acesso por teclado/scroll na tabela de Configurações/Usuários; não generalizar essa prova às tabelas financeiras sem registro próprio. A lista bruta não registra esse teste nem os estilos computados/ancestrais.

Outros candidatos que apareçam em labels posteriores não estão automaticamente cobertos por esse diagnóstico. Devem ser classificados pela origem e pelo ancestral de scroll/clip, sem descartar conteúdo importante apenas porque a página não rolou horizontalmente.

## Limites das fixtures e de estados substitutos

- Diretoria/entrada/pastor/portal/voto executam componentes reais sob `/__diretoria`, mas substituem os clientes Supabase e a identidade. Papéis da query são simulações de contexto, não contas autenticadas. A fixture não monta `FinancialRoute`; seus testes não aprovam essa guarda.
- As URLs `/__diretoria/secretaria` e `/__diretoria/tesouraria` exibem **um aviso de prévia separada**. Não contam como Secretaria ou tesouraria operacional. O label “Membro indisponível” conta somente o aviso que o produto monta, sem liberar MembroHome.
- EBD possui fixtures próprias para navegação/histórico/latência. Sessões sintéticas, validação/falhas/fechamento simulados não provam RLS, PIN real, revogação nem concorrência remota. Um label de PIN demonstra o formulário montado; não sua aceitação pelo servidor.
- O popup da tesouraria em Auth usa diretório fictício; login financeiro está desabilitado nessa fixture. Tesouraria completa tem outra prévia com hooks em memória. A variante visitante dessa prévia monta Dashboard diretamente e não valida o gate privado da rota.
- Mock de voto, IA, upload e portal não faz chamadas externas. Mensagem de sucesso nesses ambientes demonstra somente a resposta simulada. Não autoriza declarar voto único, publicação de aviso, recebimento financeiro, emissão de sessão ou download íntegro real.
- “Empty”, “error” e “loading” são estados artificiais. Podem revelar fallback inadequado da tela real, mas não descrevem disponibilidade do serviço em produção. Nome do cenário não confirma sozinho o conteúdo efetivamente renderizado.
- Os dois arquivos não registram altura, orientação, zoom, aparelho real, teclado virtual, engine ou hash do bundle por amostra. `browser-engine.json` documenta o ambiente geral e a emulação CSS de texto; esse dado global não cria metadados individuais ausentes.
- A geometria não prova contraste, semântica acessível completa, foco inicial/retorno, ordem de Tab, preservação de formulário durante rotação ou acesso às ações fora do viewport. Essas validações precisam de registros específicos.

## Evidência ainda necessária para ampliar a conclusão

Para um fluxo ser descrito como interativamente verificado, registrar label/URL, perfil/fixture, ação realizada, resultado observado/asserção, largura e altura, revisão e arquivo de evidência. Para screenshots, acrescentar path e estado exatos; para integração, usar ambiente isolado legítimo e identificar o que o mock não cobre. Não contar abas, modais e cenários existentes no código mas ausentes dos labels como executados.

## Identidade dos arquivos desta extração

| Arquivo | SHA-256 | Registros |
| --- | --- | --- |
| `evidencias/geometria.json` | `90bb30c6f2b96666005ed071db7613246986c29c26f1840c666786594d319be2` | 1296 |
| `evidencias/superficies.json` | `426d676fbd0a862f92bef3794f816d18bd7b911ab35075a665898649f45c1a8c` | 205 |

## Interações registradas separadamente

Os registros abaixo complementam os dois inventários; sustentam somente as ações e estados descritos. Uma árvore textual continua diferente de imagem, e nenhuma resposta do mock comprova persistência remota.

| Arquivo | Resultado registrado | Limite |
| --- | --- | --- |
| `arquivos-busca.json` | Busca `inexistente-qa` mostra Nenhum arquivo encontrado; `Relatório` retorna o PDF fictício; espera registrada de 700 ms. | Debounce + filtro mínimo do mock; não é collation/ordenação real. |
| `auth-sociedade-teclado.json` | Campo action relata Enter no botão nativo UMP abrindo Identificação. | O snapshot salvo ainda está na seleção; transição comprovada pelo relato de ação, não por essa árvore isolada. PIN/sessão são fictícios. |
| `foco-ciclo-tab.json` | 12 posições de Tab permanecem no diálogo de usuário, incluindo retorno aos primeiros campos. | Um diálogo/fluxo; não certifica leitor de tela nem teclado virtual. |
| `foco-modal.json` e `foco-modal-depois.json` | Antes, fechamento deixava foco em BODY; depois retorna ao botão Novo usuário. Rascunho com comprimento 10 permaneceu após resize; diálogo altura 286/scroll 657. | Registro anterior preservado como reprodução histórica; resultado posterior não generaliza todos os modais. |
| `tabela-teclado.json` | Scroll local 414,5 de largura 721/client 307; foco Usuários aprovados; ação visível em x92,8–272,8. | Confere essa tabela/ação por teclado, não toda tabela nem gesto touch. |
| `clone-refresh.json` | Clone com 0 IDs, 0 names, 0 focáveis e aria-hidden; um ID original; foco fora do clone; ao retomar, inertCount0 e rascunho EXEMPLO PRESERVADO. | Fixture específica com componente real; não certifica toda atualização de Camisas. |
| `financas-refetch.json` | Antes/falha/recuperação; saldo fictício R$12.345,67 conservado, aviso de desatualização durante falha e removido na recuperação. | Realtime local manual; não houve lançamento real. |
| `financas-rascunho-refetch.json` | RASCUNHO FINANCEIRO PRESERVADO permanece em falha e recuperação. | Captura anterior aos últimos labels de Configurações; labels finais estão em superficies. Não grava o rascunho. |
| `eleicao-contador-refetch.json` | Contador 8/20 confirmado; falha conserva8 com aviso/retry; recuperação mantém8 e remove aviso. | Hook real com backend fictício e polling existente; sem votos reais. |
| `eleicao-refetch.json` | Apuração3–3–2 permanece empatada/0vaga, com aviso de dados anteriores após erro. | Dados fictícios; não certifica escrutínio real nem autorização remota. |
| `chamada-orfa-renovacao.json` | Renovação/remontagem preservam marcação sem confirmação e bloqueio; conferência manual leva a 1/8 confirmado com uma gravação; leitura antiga 5002 ms não regride. | Sessão/rede/banco simulados; as contagens do relatório são somente da fixture. |
| `chamada-ultima-linha.json` | Clique no aluno008 após rolagem, presença confirmada; botão y392–456, footer y788–832. | Uma lista de8 e ação documentada; não é prova de todos os extremos/teclados. |
| `pastor-navegacao.json` | Entre767–1023, menu móvel visível e lateral com caixa0; em1024 ocorre inversão. | Geometria dos dois menus; não prova todos os links ou autorização. |
| `tesouraria-banco-relatorios.json` | Snapshot registra Relatórios e prestação de contas, filtros, botões PDF/anexos, Conferência bancária e formulário admin. | Abertura de superfícies; nenhum banco, vínculo ou PDF remoto executado. |
| `resumo-latencia.json` + `chamada-antes/depois/final-{8,150}.json` | Dez amostras por cenário; separa marcação visual, feedback e persistência simulada, além de renders. | Medição local com atrasos fixos de sessão 150 ms/gravação 450 ms; não equivale a INP/latência de produção. |

`browser-engine.json` informa Chrome154 em macOS, viewport emulado via CDP, altura padrão844, scaleFactor1, mobilefalse e estabilização260ms. A fonte a200% usa CSS 32 px; o atalho nativo não confirmou zoom200%. Não foi testado aparelho físico, teclado virtual ou PWA instalado. Alturas curtas aparecem nos registros de modal/captura específica, não em todas as linhas geométricas.

## Capturas PNG separadas

Foram lidas visualmente nesta consolidação `eleicao-resultado-final-390.png` (empate 3–3–2, 0/1 vaga, sem vencedor fabricado), `tesouraria-formulario-final-390.png` (formulário de recebimento com campos e ações visíveis) e `chamada-incerta-final-390.png` (aviso de marcação sem confirmação e ação Conferir, linhas com estados distintos). São capturas 390×844; a imagem da chamada não contém todo o fim da lista, que possui registro separado. A coordenação relatou inspeção do PNG eleitoral final após restaurar zoom. As demais imagens estão enumeradas para rastreio, sem nova aprovação visual por este documento.

| PNG | Dimensão em pixels |
| --- | --- |
| [chamada-antes-390.png](evidencias/chamada-antes-390.png) | 65536 × 4292542531 |
| [chamada-confirmada-final-390.png](evidencias/chamada-confirmada-final-390.png) | 390 × 844 |
| [chamada-incerta-final-390.png](evidencias/chamada-incerta-final-390.png) | 390 × 844 |
| [chamada-pendente-390.png](evidencias/chamada-pendente-390.png) | 65536 × 4292542531 |
| [ebd-modal-paisagem.png](evidencias/ebd-modal-paisagem.png) | 65536 × 4292542531 |
| [eleicao-candidatos-390.png](evidencias/eleicao-candidatos-390.png) | 390 × 844 |
| [eleicao-resultado-final-390.png](evidencias/eleicao-resultado-final-390.png) | 390 × 844 |
| [tesouraria-formulario-final-390.png](evidencias/tesouraria-formulario-final-390.png) | 390 × 844 |

## Correções rastreáveis e contexto final

`contexto-final-browser.json` preserva as quatro medições de encerramento: Chamada390×844/client375, EBD1440×844/client1425, módulos1440×844/client1425 e tesouraria390×844/client390, DPR 1/fonte 16 px. O registro explica que capturas finais usaram clip CSS explícito e scale1. Esses metadados não foram aplicados retroativamente às varreduras.

As contagens antigas1135/170 desse contexto provinham de arrays externos desatualizados da sessão. Por orientação da coordenação, os JSON no disco foram a autoridade:1301/206 antes da correção. Foram removidas somente5 medições e1 snapshot da label Arquivos busca revalidada, cujo DOM estava vazio durante HMR;5 medições e1 snapshot de Autenticação revalidação final foram renomeados Autenticação carregamento final. Resultado final:1296 medições/205 snapshots. A trilha dessa correção está no próprio contexto; nenhum registro recente foi substituído por arrays antigos.

Os estados antigos de Portal empty/error que ainda montam confirmação de identidade não comprovam as abas internas. A validação final usa Portal início/Programações/Avisos/Dízimos erro corrigido. Aniversariantes loading mostrou dados normais devido ao RPC do mock: a label não comprova um estado pendente.

## Integridade dos registros complementares

| Arquivo | SHA-256 |
| --- | --- |
| `evidencias/arquivos-busca.json` | `87cf2bfafe57b44135f63571c0fdbdfc9c583b342eb8c946330acd55cddd03e8` |
| `evidencias/auth-sociedade-teclado.json` | `9d1a6f55b63d02d37d22232fd4f2e0a4e4e7837a13cf632dead2ab0f8a17da5a` |
| `evidencias/browser-engine.json` | `10fd59eb852da476b1b1e9828c9cd4373337847ce9d38f98ab8ec427e5844d8e` |
| `evidencias/chamada-antes-150.json` | `cf4eb36092254b53a4c4ad801e9cadcbfbd54d580be74aadfa24e7f9176526f4` |
| `evidencias/chamada-antes-390.png` | `8527999210580591193ea12147452e9ee3b621bbd87834f8a45d5b5b91bc4551` |
| `evidencias/chamada-antes-8.json` | `7b36dd58c384deea2d0a8d73fc5da4ce3743c33734f2ae9c6993cd352cf35420` |
| `evidencias/chamada-cenarios.json` | `2213755af89b2eb54ad4782f2cded3ff08b9d9be19b52be33201e3ea775c4d22` |
| `evidencias/chamada-confirmada-final-390.png` | `7d1ec64b6a3df8c49990d79ad8e4b934bd8afb0f53a01b4d3791636553524eae` |
| `evidencias/chamada-depois-150.json` | `e5a57f03aaa622139208ed7ec253e320443a868794a0ef3130da8c6a3c7b47c9` |
| `evidencias/chamada-depois-8.json` | `fc33e507385986f8ee20dc248e6da90dfed94910a09bbb80afc7448dd82e716c` |
| `evidencias/chamada-final-150.json` | `5faf73d560c9c1960af6d34e9525b9105c1ed093a73b1c1594e14dbd9a0ee353` |
| `evidencias/chamada-final-8.json` | `d74788d324ff2e80b378ebfb52be9a2e593511dea18b5a12d3202dd122ce5721` |
| `evidencias/chamada-incerta-final-390.png` | `7ee5ba173aa153468076577e2970ae60f30617584405740736ec6322b0e4b0b6` |
| `evidencias/chamada-orfa-renovacao.json` | `c67e24cc5f6730c6590dc8188762356610cf0b0fb557f3342b3f2ca05a34ec45` |
| `evidencias/chamada-pendente-390.png` | `e8342960ebe7cb9708147dee0a09f0a459238cb4a2021fb7fd1ee25e3d4c07bd` |
| `evidencias/chamada-ultima-linha.json` | `7669e8b9452c2ee61c9582ad6ed21672b32fdcda13b893b86f99e5cc34b9e828` |
| `evidencias/clone-refresh.json` | `ff3cf4776708954082f1310dbd4d8b8aff0727713e6e4d4649b3f155b445c2bd` |
| `evidencias/contexto-final-browser.json` | `996cec2800c7f13f764c13d6263dd1f355262e68b9ba41d9cc387e3175ad9c10` |
| `evidencias/ebd-modal-paisagem.png` | `a2dd52fd6af7267a9716c53edb801bd7542161282bf6b46a5575a0aa8d7dda3c` |
| `evidencias/eleicao-candidatos-390.png` | `8e38ad96b14d1d2a8aee2cfa055ba97f67c7191a940aa946deba49aed0789527` |
| `evidencias/eleicao-contador-refetch.json` | `284670e3f0263fa6d3344436bddc120b44f58bdb95dc0f46af211269e7813a95` |
| `evidencias/eleicao-refetch.json` | `77d2581061d9c914fea8e1aec14d6b5741bde210ca5298a9cd34caff19a50b8b` |
| `evidencias/eleicao-resultado-final-390.png` | `378d72c61d0f1cc6d25680862e9b236ca8e5e904315844da0662291f8e8fedd1` |
| `evidencias/financas-rascunho-refetch.json` | `0545396f487248841b9164b09d9d909e47192199eda4eb66f20535f92f04b0f6` |
| `evidencias/financas-refetch.json` | `6e4aa28460f9e2cb9b0908be8ffc65c2f3d97dde299c8e8dd1393d8e8f368fcf` |
| `evidencias/foco-ciclo-tab.json` | `1417321274924b3e1ffbf5782724fc8f5eb168275df6d7b036e8cc4f7534bf84` |
| `evidencias/foco-modal-depois.json` | `c74d82a4fc46d21d4eb718ea2eacdf13e7cfd77b85b46f9bfc645f515ea78585` |
| `evidencias/foco-modal.json` | `e45e152b267f19e31f782a855878646dff59a468da65bed79508fefb31533274` |
| `evidencias/pastor-navegacao.json` | `4f87c08be26784e57428ec97fb7d9657ec7a3516d1acd9acfa490982a8d26e58` |
| `evidencias/resumo-latencia.json` | `826ff57e8a3f660cc02dff8db5d23356a836c91d17e243841e6b9e7949b02666` |
| `evidencias/tabela-teclado.json` | `dcedc2e74a9d37aefdfd2247f9d55978ca254d8d6e8828dc91aeaae25be5fc54` |
| `evidencias/tesouraria-banco-relatorios.json` | `d5a864f3be3a4eee912f65f3b5c5973c74345135281e4fe3e35f4d593b2398df` |
| `evidencias/tesouraria-formulario-final-390.png` | `b1a47a7405a0ba3e97d5975d13333aa5e73055d9af6ec4ab81e34f542ed6a970` |
