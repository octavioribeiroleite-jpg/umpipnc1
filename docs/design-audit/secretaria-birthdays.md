# Secretaria/EBD e aniversariantes — auditoria implementada

Data: 28/09/2026. Escopo: `src/pages/Secretaria.tsx`, `Aniversariantes.tsx`, `secretaria-home.css` e componentes exclusivos de Secretaria e aniversariantes. A revisão usou integralmente a skill `auditar-design-app-completo` e seu checklist.

## Alvo e preservação

- Remote local confirmado: `octavioribeiroleite-jpg/umpipnc1`, branch de trabalho compartilhada com a auditoria geral.
- `.openai/hosting.json`: projeto `appgprj_6a9808f7510c819190f1e078cac5fb8c`, `dist/client`, SPA. A coordenação confirmou via Sites a URL `https://renovo-ipnc.octavioribeiroleite.chatgpt.site`, versão publicada 21. Essa versão não comprova as mudanças locais desta auditoria.
- Alterações de aniversariantes e Secretaria que já estavam no checkout foram preservadas. A base imediatamente anterior à auditoria foi copiada para `/private/tmp/ipnc-design-secretaria-before` para comparação. As cópias com ` 2.tsx` não foram editadas.
- Não houve alteração de hooks, contratos de API, Supabase, RLS, migrações, filtros de autorização, cálculos, dados ou credenciais.

## Evidências do código anterior e correções

| Superfície | Problema identificado na fonte anterior | Implementação local |
|---|---|---|
| Tema EBD | `secretaria-workspace.css` redefinia os tokens do aplicativo e forçava fundo branco, fontes Ebd Inter/Jakarta e cores próprias também nos portais de diálogo. `secretaria-home.css` repetia uma paleta fixa. | Removidas as redefinições de tokens e fontes; superfícies, textos, estados, foco e rodapé herdam os tokens compartilhados, inclusive no tema escuro. Mantida a estrutura existente da Secretaria. |
| Início EBD | Conteúdo limitado a 680px também no desktop, menu em duas colunas estreitas no celular, métricas dependentes de colunas pequenas e divisórias. | Conteúdo de até 1120px, agrupamento resumo/chamada e duas colunas no desktop, menu em linhas abaixo de 480px; métricas adaptáveis com números de 24px e quebra segura. |
| Entrada/PIN | Perfis tinham títulos de 30px, cards e ícones grandes. Os seis slots de PIN tinham 44px fixos e gaps de 12px (324px), excedendo o painel embutido em celulares. | Perfis compactos com título de 24px no celular, mesmos tons do app e foco visível; PIN em grade fluida de seis colunas, painel sem efeito de vidro, controles com rótulos acessíveis. |
| Chamada | Nome e ações disputavam a mesma linha; campo de visitante com botão de envio e cancelamento comprimiam a digitação; rodapé fixo sem reserva da área segura. | Quebra de nomes e resumos, visitante em grade com campo ocupando uma linha no celular, reserva inferior com safe-area; dados e fechamento/reabertura mantidos. |
| Histórico | Badges de altura 16px, melhor/pior domingo sempre lado a lado, diálogos com `ScrollArea` somente `max-height` sem viewport delimitado. | Badges com altura natural, comparação em uma coluna no celular, viewport de lista delimitado e rolável, textos/percentuais sem sobreposição, fundos semânticos adaptáveis ao tema. |
| Turmas e alunos | Formulário de inclusão dependia de placeholders; revisão e ações de nascimento competiam com nomes; busca da planilha tinha ícone fixado à altura antiga do input. | Nome/nascimento com rótulos persistentes, ações podem passar à linha seguinte, controles de edição identificados; ícone de busca centralizado, badges móveis e importação com quebra de linha e modal limitado ao viewport. |
| Configurações EBD/acessos | Regras do workspace forçavam branco e cores locais; credenciais e nomes longos precisam reflow. | Tokens herdados pelo workspace e modais; credenciais com reflow em telas estreitas. Cards de acessos em duas colunas apenas no desktop, nomes quebram linha. |
| Filtros de aniversário | Busca e select de 140px dividiam sempre uma única linha; rótulos apenas por `aria-label`. | Card de filtros com rótulos persistentes associados por `useId`, uma coluna no celular e duas a partir de 640px. |
| Cards/calendário | Ícones de ação 32px, badges 10px; calendário usava linhas 12px com toque pequeno e ícone invisível por falta de `group`. | Ações de 44px, badges 12px, linhas do calendário 14px com foco e área de toque de 44px; nomes completos e estado vazio por mês preservados. |
| Cadastro de aniversário | Rótulos visíveis sem vínculo com os campos; ano opcional pouco explicado, modal sem limite local explícito. | IDs únicos e labels vinculados, descrição do ano opcional, rolagem vertical do modal e espaçamento consistente. Regras de dia/mês/ano intactas. |
| Notificações/comunicados | Cabeçalho sem quebra, botões de 28px, notificações clicáveis sem teclado, comunicado alternativo rosa/laranja destoava do aplicativo. | Cabeçalho e ações refluem, 44px, notificações não lidas acionáveis por teclado, comunicado usa o tema compartilhado. Copiar/gerar mantém os handlers e a autorização existentes. |

## Matriz de cobertura na fonte

Todos os itens abaixo foram inspecionados na fonte, com aplicação local dos componentes/tokens indicados. Isso **não significa validação visual em navegador**.

| Tela/aba | Papel e estados cobertos na fonte | Apresentação tratada |
|---|---|---|
| Perfil EBD | Sem sessão; administrador/professor; voltar | Tipografia, ícones, cards, foco e tela curta |
| PIN | Normal/embutido, preenchimento, erro, carregamento/confirmar, voltar | Slots fluidos, teclado e área segura |
| Nome do professor | Campo vazio/preenchido, entrando, voltar | Card compacto, rótulo persistente |
| Início EBD | Admin/professor, sem sincronização, erro, atualizado, dia aberto/encerrado | Resumo, métricas, menu, comunicado semanal, administração, sair |
| Confirmação de acesso | Sessão expirada; PIN embutido | Cabeçalho/descrição, painel e rolagem |
| Chamada | Lista de turmas, sem turmas, iniciar, aberta, finalizada, dia fechado | Cards, porcentagem, alunos, visitantes, PDF, rodapé e confirmações |
| Histórico | Carregamento, erro, vazio, filtros de período, lista de dias, detalhe e fechamento | Resumo, ranking, listas de frequência e alunos, exportações e diálogos |
| Turmas | Lista/vazio, criação, edição, detalhe, ativos/inativos | Faixa etária, nascimento, inclusão, ativação/transferência e ações |
| Planilha | Filtro turma/status, busca, vazio, tabela desktop/cards mobile, seleção em lote | Edição de nome, status, transferência, importação: arquivo/mapeamento/revisão/confirmação, exportação |
| Configurações EBD | Vazio, carregando, com/sem/antiga senha | Revelar/copiar, definir/trocar, confirmar remoção |
| Acessos EBD | Carregando, sem turma, sem acesso, histórico de acessos | Nomes, horário e cards |
| Aniversariantes (diretoria) | Leitor e gestor/admin, carregando, filtros, vazio, pendências | Cabeçalho, próximo/hoje/semana/mês, calendário, notificações |
| Aniversariantes (EBD) | Somente admin, carregamento, sessão expirada | Mesmos componentes e modais sem alterar o gate de acesso |
| Aniversariante criar/editar | Validação, salvando, cancelar, revisão, excluir | Labels, descrição, campos e confirmação |
| Comunicado semanal/home | Vazio, carregamento, nomes longos, gerar/copiar, sessão expirada | Estado honesto, mensagens roláveis, ações compactas |

## Verificações executadas

- `node --test tests/birthday-regression.test.mjs tests/ebd-sync.test.mjs tests/ebd-birthday-token.test.mjs`: **12 testes aprovados**.
- `tsc --noEmit -p tsconfig.app.json`: nenhum erro novo nos arquivos desta auditoria; persistem apenas dois erros anteriores em `src/pages/Secretaria 2.tsx` (709 e 854), por props ausentes na cópia não rastreada.
- ESLint via API, comparando 22 TSX com a cópia anterior: **34 erros e 2 avisos antes e depois; zero novos**. Os erros existentes são principalmente `no-explicit-any`, e os avisos de dependências de hooks do histórico foram preservados para não mudar comportamento.
- Comparação AST de chamadas de API e handlers existentes (`onClick`, `onSubmit`, `onChange`, `onValueChange`, `onCheckedChange`, `onOpenChange`) com a base, incluindo a segunda etapa administrativa: **24 arquivos, nenhuma diferença**. A adição de teclado às notificações reutiliza a mesma mutação de marcar como lida.
- `git diff --check`: aprovado após as mudanças.
- Build integrado: responsabilidade da coordenação após os demais conjuntos de páginas; não registrado como executado por esta subauditoria.

## Limitações de validação

Não foi aberto servidor local, executada operação pendente de aprovação, criada sessão, feita mutação real ou publicação nesta subauditoria. A inspeção da URL publicada foi centralizada na coordenação para evitar concorrência do navegador. As larguras de **375, 390, 768, 1024 e 1440px** estão contempladas pelas regras responsivas e devem ser conferidas com renderização da versão alterada; não foram declaradas como visualmente aprovadas aqui. Foco real, teclado móvel, modais abertos com sessão válida, textos extensos e estados de rede ainda precisam dessa conferência.
