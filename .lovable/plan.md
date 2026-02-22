

# Melhorias na Pagina de Comunicados do Pastor

## Problemas Identificados

1. **Formulario ocupa muito espaco** - O card de "Novo Comunicado" domina a tela inteira no mobile, empurrando o historico para baixo
2. **Historico vazio sem contexto** - A area de historico mostra apenas "Nenhum comunicado enviado" sem oferecer dicas ou orientacoes
3. **Sem confirmacao visual apos envio** - O fluxo de envio nao tem feedback visual alem do toast
4. **Sem opcao de excluir comunicados** - Nao ha como remover um comunicado enviado por engano
5. **Formulario sempre visivel** - Em mobile, seria melhor esconder o formulario e mostrar o historico por padrao, com um botao para criar novo comunicado

## Melhorias Propostas

### 1. Formulario colapsavel / em dialog
Substituir o formulario fixo por um botao "Novo Comunicado" no topo que abre um dialog/drawer. Isso libera espaco para o historico ser a visao principal da pagina.

### 2. Historico como foco principal
O historico passa a ser o conteudo principal da pagina, com cards mais compactos mostrando:
- Titulo + badge de prioridade
- Mensagem (truncada em 2 linhas com "ver mais")
- Destinatarios + tempo relativo
- Indicador de leitura (quantas sociedades ja visualizaram, usando o campo `read_by` da tabela)

### 3. Indicador de leitura
Aproveitar o campo `read_by` (jsonb array) que ja existe na tabela `pastor_announcements` para mostrar quantos usuarios ja leram cada comunicado (ex: "3 leituras").

### 4. Estado vazio mais amigavel
Quando nao houver comunicados, mostrar uma mensagem mais acolhedora com icone e sugestao de acao, apontando para o botao de criar.

### 5. Contador no cabecalho
Adicionar um badge com a quantidade de comunicados enviados ao lado do titulo da pagina.

## Detalhes Tecnicos

### Arquivo a modificar:
- **`src/pages/PastorComunicados.tsx`**: Refatorar para mover formulario para um Drawer, tornar historico o foco, adicionar contagem de leituras, truncar mensagens longas

### Alteracoes especificas:

1. Importar `Drawer` (ou `Sheet`) e mover todo o formulario para dentro dele
2. Adicionar botao flutuante ou botao no topo "Novo Comunicado" que abre o drawer
3. No historico, truncar `a.message` com `line-clamp-2` e adicionar botao "ver mais"
4. Exibir contagem de `read_by.length` em cada card do historico
5. Melhorar estado vazio com texto sugestivo

### Sem alteracoes no banco de dados.
O campo `read_by` (jsonb) ja existe na tabela `pastor_announcements`.

