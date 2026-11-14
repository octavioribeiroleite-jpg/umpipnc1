# Vistoria de composição mobile — 14/11/2026

## Problema e resultado

A fonte uniforme da entrega anterior não resolvia a composição dos cards. Na lista de reuniões, data e ações comprimiam o título em uma coluna estreita. O título agora ocupa a largura do card, data/status ficam acima, horário/participantes abaixo, ações no rodapé e informações de acompanhamento em “Detalhes”. Na prévia de 390px, o espaço do título passou de aproximadamente 177px para 326px.

O mesmo princípio foi aplicado aos módulos: identidade e conteúdo primeiro; metadados separados; ações em rodapé com área de toque; campos e tabelas adaptados ao espaço disponível. Foi preservada a escala de leitura 14px/20px da Ata, sem alteração de permissões ou regras de negócio.

## Correções

- Reuniões: cards, filtros, títulos longos, histórico aberto/encerrado e detalhes expansíveis.
- Tarefas, arquivos e calendário: títulos independentes das ações, responsáveis legíveis, rodapés organizados, upload e detalhes de arquivo com nomes longos.
- Finanças/camisas: tabelas como registros identificados no celular; campos e ações reorganizados; visão complementar recolhível; remoção de navegação duplicada; Cor em linha inteira e Tamanho/Quantidade lado a lado na encomenda.
- Tesouraria: navegação administrativa horizontal, cards e formulários compactos, linhas do extrato adaptadas.
- Configurações/usuários: tabelas administrativas como registros mobile, relatório de criação de logins em cards.
- Comunidade: visitantes em cards, ações de aniversariantes/sugestões no rodapé, conteúdo do portal com largura disponível.
- EBD: turma/aluno com status e ações separados, importação com título curto e etapa separada.
- Eleições: etapas, candidatos e controles reorganizados; recorte de imagem adaptado à altura.
- Componentes comuns: rótulos de abas não quebram palavras, títulos/descrições acomodam conteúdo longo, menu Mais usa duas colunas em telefones estreitos.

## Método e cobertura

Inspeção pelo DOM do Chrome, conforme AGENTS.md. Nenhuma captura de tela ou clique por coordenada. Prévia isolada em `tests/vite.system-theme.config.ts`, com clientes substituídos por fixtures fictícias, CSP e bloqueio de endpoints/Service Worker reais. Foram inspecionados conteúdo visível, geometria, fontes computadas, ordem dos controles, rolagem e navegação. A matriz é uma verificação de layout, não prova de todos os fluxos de negócio.

`dom-evidence.json` registra 216 verificações de rota/largura (36 rotas × 320, 375, 390, 768, 1024 e 1440px), além de 106 inspeções intermediárias/detalhadas e 23 observações de janelas. Observações intermediárias incluem carregamento/animação; registros `final`, `populated` e `settled` documentam reconferências. Não houve overflow horizontal de página na matriz final.

Rotas percorridas: Home, reuniões/lista/nova/detalhe, tarefas, calendário, finanças, tesouraria, camisas, arquivos, configurações, usuários, plenárias/lista/detalhe, estudos, aniversariantes, visitantes, comunicados, dízimos, eleições/lista/detalhe/apresentação, painel pastoral/sociedade/calendário/comunicados/sugestões, portal, secretaria, acesso, redefinição de senha, acesso de membro indisponível, votação pública, sala, ensaio e 404. Os aliases de sugestões usam o mesmo componente.

Inspeções internas adicionais:

- Reunião: Registro, Pauta, Ata, Resumo IA e WhatsApp; estados com e sem processamento; resumo fictício com todas as categorias; menu de ações e detalhes; histórico de reunião encerrada.
- Fold aberto: 768px com toque emulado. Registro com 469px e pauta com 235px lado a lado; navegação inferior visível.
- Camisas: Resumo, Campanhas, Encomendas, Compras, Vendas e Estoque; compras/vendas com registros; formulário Nova Encomenda.
- Finanças: Cobranças, Comprovantes, Receitas, Gastos, Relatórios, Mais e visão geral expandida; escopo geral e sociedade; formulário Novo Gasto.
- Tesouraria: dashboard, extrato, recebimentos pendentes, Novo lançamento, Conferir lançamento e Nova sociedade.
- EBD: Início, Chamada, chamada de turma em andamento, Histórico, Turmas/detalhe, Alunos, Acessos, PINs e Aniversariantes.
- Portal: Início, Programações, Avisos e Dízimos após identificação fictícia.
- Plenária: Chamada, Anotações e Ata. Estudos: anotações, resumo salvo, Novo Estudo e retrospectiva.
- Janelas: tarefa, evento, usuário/edição, plenária, aniversário, eleição, comunicado, estudo/retrospectiva, arquivo/envio, encomenda, gasto, tesouraria, menu Mais e relatório de logins com falha simulada.
- Sala/ensaio eleitoral: espera, votação, indicações, voto registrado, resultado e conclusão via fixtures somente leitura.
- Tema escuro conferido em reuniões; contraste usa tokens existentes.

## Verificações técnicas

- `tsc -p tsconfig.app.json --noEmit`: aprovado.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: 638 aprovados, zero falhas.
- `npm run build`: aprovado; avisos já existentes de tamanho de chunk/importação dinâmica.
- `git diff --check`: aprovado.
- Teste antigo que exigia `flex` no formulário de encomenda foi atualizado para verificar a grade e impedir o conflito de display observado no Chrome.

## Limites

Não foram executados pagamentos, votos, envios ou alterações de dados reais. O Chrome não tinha sessão autenticada do aplicativo de produção; as páginas privadas foram conferidas com dados fictícios isolados e os mesmos componentes de produção. Estados que exigem upload de arquivo, criação real de credencial, processamento de IA ou escrita externa tiveram apresentação revisada no código; não foram apresentados como operações reais validadas. A geometria emulada do Fold não equivale a teste físico no aparelho. A publicação deve ser confirmada separadamente pelo status do Sites e pela versão dos assets servidos.
