# Auditoria visual — finanças, camisas, dízimos e tesouraria

Implementação local em 28/09/2026, no repositório Aplicativo IPNC. A confirmação da hospedagem e a validação global são coordenadas pela tarefa principal. Skills `auditar-design-app-completo/SKILL.md` e `references/checklist-visual.md` lidas integralmente. Não houve alteração de banco, autenticação, papéis, cálculos, RPCs ou estado de formulários.

## Evidências e alterações

| Superfície / evidência anterior no código | Correção implementada |
| --- | --- |
| `Financas.tsx`: cabeçalho próprio branco/slate, seis ações de 112 px de altura, seis abas em uma grade declarada de cinco colunas; `camisas-separation.css` ocultava a quarta aba por posição | PageHeader compartilhado, barra de contexto com dados não interativos em vez de botões sem ação, ações de 56 px em linhas, abas com nome completo e rolagem controlada; nenhuma aba funcional oculta via CSS |
| `finance-responsive.css`: seletores `.grid.grid-cols-2` alteravam qualquer grade; colunas 3–7 de tabelas com dez colunas eram ocultadas e labels chegavam a 0,62rem | Folha reduzida a classes semânticas; grades financeiras adaptativas, valores 24–28 px, texto mínimo 12 px, preservação das colunas e rolagem interna de tabelas |
| `camisas*.css`: pilha de quatro refinamentos com `nth-child` e `!important`, valor Encomendado oculto e títulos substituídos por pseudo-elementos | Uma folha em `CamisasTab` atende a rota e a aba embutida; todo dado e rótulo continua no JSX, sem regras de ocultação; folhas antigas preservadas no disco mas sem importação |
| Camisas / resumo, campanhas, estoque | Grades `finance-summary-grid` e classes explícitas `shirt-campaign-*`; moeda quebra quando necessário; menu de campanha não é cortado pelo card; estoque e ações envolvem linhas |
| Camisas / encomendas | Filtros com largura adaptativa, estados em navegação horizontal controlada, pedido em uma coluna no celular, duas no tablet e linha no desktop amplo; nomes, itens, pagamento e entrega preservados |
| Comprovantes | Botões Ver Comprovante/Aprovar/Rejeitar envolvem linhas; status não espreme nome ou observações |
| Cobranças, receitas, gastos | Totais e composição sem corte; filtros mês/ano podem envolver linhas; ações de gastos adaptativas; cards de cobrança com nomes, datas, badges e ações de toque acessíveis |
| Relatórios e extrato privado | Totais em grades adaptativas em vez de três/cinco colunas fixas; métricas 24 px; cores semânticas e eixo de valores do gráfico com 80 px; descrições e valores do extrato envolvem linhas |
| Configurações e diálogos financeiros | Geração anual empilha no celular; pares de campos de formulários empilham quando estreitos; portais recebem `finance-dialog` com rolagem interna e limite 90dvh; campos de 16 px no celular |
| Dízimos | Cabeçalho institucional e ícone; labels associados aos campos PIX, botão copiar com nome acessível, prévia em português e exemplo da igreja correta; papel de administrador/pastor/membro preservado |
| `treasury-dashboard.css`: paleta própria fixa clara, muitos labels de 9–11 px e métricas 36 px no celular | Tokens compartilhados `--background`, `--card`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, cores de entrada/saída semânticas; título móvel 24 px, valores 24–28 px e rótulos >=12 px; cards adaptativos e resumo móvel em linhas |
| Tesouraria / filtros e formulários | Busca ganhou rótulo persistente e contêiner do ícone; estados públicos/admin, extrato, saldo, gráficos e filtros conservados; formulários usam os tokens, rolam no viewport e empilham valor/data em tela estreita |

## Matriz de cobertura por código

| Tela | Abas, estados e componentes inspecionados | Implementação | Navegador |
| --- | --- | --- | --- |
| Finanças | Contexto/sociedade, métricas, atalhos, pendências, resumo por sociedade, recentes, gráficos; abas Cobranças, Comprovantes, Movimentações (Receitas/Gastos), Camisas, Relatórios, Mais | Sim | Pendente na tarefa principal |
| Cobranças | Resumo anual, status pago/parcial/pendente/isento, pesquisa, tabela/cards, baixa, detalhe, reversão/exclusão; vazio/loading | Sim | Pendente |
| Comprovantes | Pendente/aprovado/rejeitado, visualização, rejeição, vazio | Sim | Pendente |
| Receitas | Competência, contribuições, outras receitas, registro/edição/exclusão, vazio/loading | Sim | Pendente |
| Gastos | Total, histórico, comprovantes, wizard com passos, editar/excluir, vazio/loading | Sim | Pendente |
| Camisas | Resumo, Campanhas (criar/editar/adicionar lote/histórico/excluir), Encomendas (andamento/finalizados/todos, filtros, criar/editar/pagar/entregar/excluir), Compras, Vendas, Estoque | Sim | Pendente |
| Relatórios | Ano/exportação, caixa, cobranças, movimento mensal, categorias, composição, receitas/gastos e anexos, vazio/loading | Sim; exportador PDF preservado | Pendente |
| Mais / Configurações | Valores, total, geração anual, histórico, exclusão de pendentes | Sim | Pendente |
| Componentes auxiliares | ChargeCard, MembrosTab, BulkLoginDialog, ExtratoDialog | Apresentação/portais revisados; nenhuma ação de dados executada | Pendente |
| Dízimos | Administração/pastor com configuração e prévia; membro continua usando componente existente | Sim | Pendente |
| Tesouraria pública e admin | Visão geral, sociedades, gráficos com tabela textual, extratos/filtros/paginação, atualização, indisponibilidade/erro/vazio/loading, cadastro/edição de lançamento e sociedade | Sim; apenas visual | Pendente |

## Validação executada

- ESLint direcionado às três páginas, `components/financas` e `components/treasury`: 45 diagnósticos anteriores e 45 após alterações; comparação de arquivo/regra/mensagem sem novo diagnóstico (os existentes incluem `any` e dependências de hooks). Não foi declarado lint global limpo.
- `node --test tests/treasury.test.mjs tests/treasury-render.test.mjs`: 22 testes existentes passaram, incluindo centavos e fronteira, idempotência/resposta perdida, permissão, exibição pública/admin, datas, filtros, erros, texto escapado e paginação após edição.
- Typecheck e build globais ficam centralizados na tarefa principal para incorporar as mudanças paralelas dos demais módulos.
- Os rótulos de ações e loaders usados pelo `StableRefreshBoundary` foram preservados. `TreasuryEntryDialog` mantém `submissionId`, revisão e ciclo de submissão; não há mudança de hooks ou bibliotecas financeiras.

## Limitação de evidência

Esta etapa foi auditada pelo código e por testes SSR/lógica; não houve inspeção visual em navegador nem execução de ações autenticadas. As larguras 375, 390, 768, 1024 e 1440 px estão cobertas por regras responsivas implementadas, mas **não são apresentadas como testadas visualmente** neste relatório. Nenhum servidor local foi aberto e nenhuma operação de aprovação pendente foi repetida. A tarefa principal deve conferir as rotas, os papéis e as larguras na prévia/ambiente permitido antes de afirmar validação completa. Nenhuma publicação foi feita por esta etapa.
