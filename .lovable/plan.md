
# Melhorias no Layout do Painel do Pastor

## Problemas Identificados

1. **Resumo IA ocupa muito espaco vertical** - O card do resumo pastoral com IA e muito grande e empurra todo o conteudo importante para baixo
2. **Alertas misturam eventos futuros com pendencias reais** - Eventos proximos aparecem como "alertas", poluindo a secao com itens que nao sao problemas
3. **Cards de sociedade ocupam muito espaco** - Cada sociedade tem um card separado com muito padding, fazendo o usuario rolar muito
4. **Resumo financeiro basico** - Mostra apenas 3 numeros sem contexto visual
5. **Secao de eventos duplicada** - Eventos aparecem tanto nos Alertas quanto na secao "Proximos Eventos"

## Solucao Proposta

### 1. Saudacao compacta com hora do dia
Substituir o card grande de IA por uma saudacao simples ("Bom dia, Pastor!") com a data atual e um botao discreto para gerar/ver o resumo IA em um drawer/dialog separado.

### 2. Cards de metricas rapidas (grid 2x2)
Quatro mini-cards compactos no topo:
- Total de Membros ativos (soma de todas as sociedades)
- Saldo Consolidado
- Tarefas Pendentes (total)
- Proximos Eventos (contagem)

### 3. Alertas apenas para pendencias reais
Manter na secao de alertas somente:
- Tarefas atrasadas
- Reunioes sem ata
Remover eventos proximos dos alertas (eles ja tem secao propria).

### 4. Sociedades em grid compacto (2 colunas)
Reduzir os cards de sociedade para um formato mais compacto em grid de 2 colunas no mobile, mostrando apenas: sigla colorida, nome, e numero de membros. Ao clicar, navega para detalhes.

### 5. Proximos Eventos compacto
Manter a secao de eventos, mas limitada a 3 itens com link "Ver todos" para o calendario.

### 6. Resumo IA sob demanda
Mover o resumo da IA para um botao flutuante ou um drawer acessivel por um botao "Resumo IA" na saudacao, em vez de ocupar o topo da pagina.

## Detalhes Tecnicos

### Arquivos a modificar:
- **`src/pages/PainelPastor.tsx`**: Reorganizar a ordem dos blocos, adicionar saudacao, criar grid de metricas 2x2, mover IA para drawer
- **`src/components/pastor/SocietyOverviewCard.tsx`**: Tornar mais compacto, reduzir padding
- **`src/components/pastor/AlertsSection.tsx`**: Filtrar para remover `upcoming_event` dos alertas (deixar apenas `overdue_task` e `no_minutes`)

### Nova ordem do layout:
1. Saudacao + botao "Resumo IA"
2. Grid 2x2 de metricas globais (membros, saldo, tarefas pendentes, eventos)
3. Alertas (somente pendencias reais, se houver)
4. Sociedades (grid 2 colunas, compacto)
5. Proximos Eventos (max 3)

### Componentes novos:
- Drawer/Dialog para o Resumo IA (reaproveitando a logica existente do `fetchAISummary`)

### Sem alteracoes no banco de dados.
