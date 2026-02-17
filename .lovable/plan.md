

# Melhorar o Design do PDF de Presenca

## Objetivo
Deixar o PDF da chamada mais profissional e visualmente atraente, com cabecalho estilizado, cores, linhas divisorias e layout estruturado.

## Melhorias planejadas

### Cabecalho
- Faixa azul escura no topo com o titulo "Chamada de Presenca" em branco
- Subtitulo com o nome da plenaria e data formatada
- Linha divisoria decorativa abaixo do cabecalho

### Resumo com destaque visual
- Caixa com fundo colorido mostrando os numeros: presentes, ausentes, total e porcentagem
- Indicador de quorum com cor verde (atingido) ou vermelho (nao atingido)
- Barra de progresso visual desenhada no PDF

### Listas de presentes e ausentes
- Titulo de secao com fundo colorido (verde para presentes, vermelho para ausentes)
- Tabela com linhas alternadas (zebra striping) para facilitar leitura
- Numeracao e nomes alinhados em colunas
- Icone visual (circulo preenchido) indicando status

### Rodape
- Data e hora da geracao do documento
- Numeracao de paginas ("Pagina 1 de 2")

## Detalhes tecnicos

### Arquivo editado
- `src/pages/PlenariaDetalhe.tsx` - apenas a funcao `handleDownloadPDF`

### Tecnicas usadas com jsPDF
- `doc.setFillColor()` + `doc.rect()` para retangulos coloridos
- `doc.setDrawColor()` + `doc.line()` para linhas divisorias
- `doc.setTextColor()` para texto branco sobre fundo escuro
- Linhas alternadas com cinza claro para efeito zebra
- Rodape com numeracao de pagina em cada pagina

Nenhuma dependencia nova sera adicionada - tudo usando a API nativa do jsPDF.

