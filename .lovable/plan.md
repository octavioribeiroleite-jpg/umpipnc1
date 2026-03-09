

# Melhorias no Historico EBD

## Mudancas em `src/components/secretaria/HistoricoTab.tsx`

### 1. Substituir listas de badges por cards clicaveis compactos
Remover as listas de badges de "Nunca compareceram" e "100% de presenca" que ocupam muito espaco. Substituir por cards compactos com contagem, que ao clicar abrem um dialog/drawer com a lista completa.

### 2. Adicionar alunos com frequencia baixa
Calcular alunos com presenca abaixo de 30% (excluindo os que nunca vieram). Mostrar como um terceiro card clicavel entre os destaques positivos e negativos. Organizar os 3 cards em uma grid:
- **100% presenca** (verde, icone Award)
- **Frequencia baixa < 30%** (amarelo, icone TrendingDown)  
- **Nunca compareceram** (vermelho, icone AlertTriangle)

Cada card mostra apenas o numero e ao clicar abre um ResponsiveDialog com a lista de nomes.

### 3. Remover grafico "Evolucao da presenca"
O grafico de linha nao ficou claro para o usuario. Remover completamente — as informacoes de melhor/pior domingo no Resumo Geral ja cobrem essa funcao.

### Arquivo modificado
- `src/components/secretaria/HistoricoTab.tsx`

