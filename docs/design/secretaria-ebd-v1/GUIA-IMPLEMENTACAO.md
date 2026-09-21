# Secretaria EBD — referência visual v1

Data: 21/09/2026. Status: proposta visual; não implementada nem publicada.

## Objetivo e referência

Reorganizar a página inicial da Secretaria EBD para destacar a chamada, reduzir o peso do resumo e uniformizar os acessos. Referência visual: `mockup.png`, nesta pasta, gerada com a ferramenta integrada ImageGen. O prompt integral está em `PROMPT-IMAGEM.txt`.

A imagem define composição, ordem, hierarquia e aparência. Este guia define medidas CSS, comportamento e adaptações responsivas. Uma imagem gerada não é uma especificação pixel a pixel: não reproduzir pequenas texturas, sombras irregulares ou distorções de letras. Recriar a interface com HTML/CSS e componentes reais, nunca como imagem de fundo.

Os nomes, números, data, atualização e estados da imagem são demonstrativos. Não gravá-los no banco nem fixá-los no código. A data 20/09/2026 é apenas o domingo escolhido para a composição; não é uma correção autorizada da regra de seleção do encontro.

## Composição obrigatória

1. Cabeçalho branco com voltar, título “Secretaria EBD”, subtítulo “Escola Bíblica Dominical” e botão de usuário circular à direita.
2. Informação discreta de atualização, com ponto verde apenas quando a sincronização realmente tiver sucesso.
3. Cartão branco “Resumo do encontro”: selo do estado à direita, data do encontro, três métricas lado a lado, divisórias verticais suaves e mensagem contextual ao final.
4. Botão verde sólido “Abrir chamada”, ocupando toda a largura, com prancheta à esquerda e seta à direita.
5. “Gestão da EBD”: cartões Turmas, Alunos, Histórico e Aniversariantes, nesta ordem, em grade 2 × 2 quando houver espaço.
6. Cartão “Aniversariantes da semana”: total, link “Ver todos”, até três pessoas, datas em pequenos selos verdes e botões secundários “Copiar lista” e “Gerar mensagem”.
7. “Administração”: lista branca dividida em duas linhas, Configurações e Acessos.

Não adicionar banner, ilustração, gráfico ou navegação inferior. O botão da chamada deve ser a única grande superfície preenchida de verde. Manter o acesso de saída no menu de usuário com o rótulo explícito “Sair da Secretaria” e identificação do perfil. O ícone sozinho não elimina essas funções.

## Tokens de estilo

Aplicar tokens apenas ao escopo da Secretaria EBD, sem mudar o tema global inadvertidamente.

| Token | Valor |
|---|---|
| Fundo | `#F6F8F7` |
| Superfície | `#FFFFFF` |
| Texto principal | `#182C23` |
| Texto secundário | `#617168` |
| Primário | `#1F8959` |
| Primário hover | `#176D46` |
| Texto/ícone verde | `#126344` |
| Fundo de ícones e datas | `#E7F5ED` |
| Borda | `#E1E8E3` |
| Selo pendente | fundo `#FFF0CC`, texto `#925400` |
| Raio de cartão | `16px` |
| Raio de botão | `12px` |
| Borda de cartão | `1px solid #E1E8E3` |
| Sombra opcional | `0 2px 8px rgb(24 44 35 / 3%)` |
| Espaçamento | escala `4, 8, 12, 16, 20, 24, 32px` |

Sem gradientes, brilho, desfoque de fundo ou uma cor diferente para cada atalho. Usar ícones Lucide já disponíveis, traço uniforme de aproximadamente 1,8 px. Ícones comuns: 20–24 px; círculo de suporte: 44–48 px.

## Tipografia e dimensões

As fontes Inter e Plus Jakarta Sans já aparecem na configuração Tailwind do projeto. Verificar carregamento real antes de comparar capturas; declarar a família não garante que esteja disponível.

| Elemento | Especificação CSS |
|---|---|
| Título da página | Plus Jakarta Sans, 20/26 px, peso 700 |
| Títulos de seção/cartão | Plus Jakarta Sans, 18/24 px, peso 700 |
| Título de atalho | Inter, 16/22 px, peso 600 |
| Texto e descrições | Inter, 14/20 px, peso 400 |
| Informação de atualização | Inter, 12/18 px |
| Métricas | Inter, 30/36 px, peso 700, números tabulares |
| Botão principal | Inter, 16/24 px, peso 600, altura mínima 52 px |
| Botões secundários | 14/20 px, altura mínima 44 px |
| Cabeçalho | altura mínima 72 px, sem cortar texto |
| Padding interno de cartão | 20 px; 16 px em telas estreitas |
| Distância entre grandes seções | 24 px |
| Distância entre cartões da grade | 12 px |

Usar alturas automáticas nos cartões; evitar cortar nomes ou textos para forçar a altura do mockup. Todas as áreas clicáveis devem ter pelo menos 44 × 44 px. A chamada fica 12 px abaixo do resumo.

## Proporções da imagem e responsividade

A imagem final tem 1024 × 1536 px. Sua coluna principal vai aproximadamente de x=102 a x=923, com 80% da largura total. Esses pixels são coordenadas da imagem, não medidas CSS de um celular. A imagem ficou mais larga e compacta que uma tela de 390 px; não reduzir tudo proporcionalmente até tornar os textos ilegíveis.

Para comparação visual, usar inicialmente um viewport de 640 px de largura, container central de aproximadamente 512 px e a hierarquia da imagem. Posições aproximadas no raster: cabeçalho y=0–90; resumo y=146–482; chamada y=494–582; gestão y=610–899; aniversariantes y=918–1315; administração y=1340–1525. São guias de proporção, não alturas rígidas.

- **320–479 px:** margens laterais de 16 px. Atalhos em duas colunas, ícones acima dos títulos, descrições com quebra natural. Se o conteúdo não couber sem cortes em 320 px, usar uma coluna. Resumo mantém três métricas, com rótulos em até duas linhas. O título do resumo e selo podem ocupar linhas diferentes. Título de aniversariantes e “Ver todos” podem ser empilhados. Botões secundários empilham se necessário. Não comprimir a tipografia para encaixar.
- **480–767 px:** coluna central com largura de até 512 px e margens mínimas de 20 px. Atalhos podem usar ícone ao lado do texto, como no mockup, quando couberem.
- **768 px ou mais:** preservar a composição em coluna central de até 680 px. Esta é uma extensão responsiva proposta; não foi desenhada uma segunda imagem desktop. Não inventar uma barra lateral nesta etapa.

É esperado que a versão de celular tenha rolagem e altura maior que a composição. A fidelidade significa manter identidade, hierarquia e relações espaciais, preservando legibilidade.

## Integração com a tela existente

Arquivo encontrado: `src/pages/Secretaria.tsx`. Confirmar o import usado pelo roteador antes de editar, pois também existe `src/pages/Secretaria 2.tsx`.

| Elemento novo | Destino existente |
|---|---|
| Abrir chamada | view `chamada` / `ChamadaTab` |
| Turmas | view `turmas` / `TurmasTab` |
| Alunos | view `planilha` / `PlanilhaAlunosTab` |
| Histórico | view `historico` / `HistoricoTab` |
| Aniversariantes e Ver todos | view `aniversariantes` |
| Configurações | view `configuracoes` |
| Acessos | view `acessos` |

“Alunos” é um rótulo visual mais curto para o acesso à planilha existente. “Gerar mensagem” deve preservar a ação atual de gerar com IA, incluindo seus estados e eventual reautenticação. Não implementar envio automático. Preservar também o comportamento de copiar lista.

Reutilizar os handlers existentes. Não alterar permissões de administrador/professor, autenticação, regras de presença, sincronização, banco ou encerramento do encontro como parte da mudança visual. Exibir somente os acessos permitidos pelo perfil atual; a grade reorganiza o espaço dos itens autorizados.

Presença zero não comprova que a chamada não começou. A frase “Aguardando registros de presença” só aparece quando houver estado que sustente essa conclusão; caso contrário, usar texto neutro. Estado aberto não deve significar erro. Encontro encerrado, carregamento, ausência de aniversariantes e falha de sincronização precisam de representações próprias, sem números falsos.

## Roteiro para implementação fiel

1. Ler esta especificação e abrir o mockup antes de editar.
2. Confirmar a versão ativa da página e identificar handlers, estados e permissões já existentes.
3. Criar estilos locais e reorganizar apenas o dashboard inicial; aproveitar os componentes internos já funcionais.
4. Conferir primeiro o resultado a 640 px e depois adaptar para 320, 390, 768 e 1440 px. Comparar capturas com dados de teste equivalentes à referência quando possível, sem modificar registros reais.
5. Comparar ordem dos blocos, larguras relativas, alinhamentos, fontes, cor, bordas, ícones e espaços. Corrigir diferenças por componente; não apenas afirmar que está parecido.
6. Verificar título e nomes longos, zoom de 200%, teclado, foco visível, ausência de rolagem horizontal, estados vazios e carregamento. Não usar cor como único indicador de estado.
7. Verificar destinos de todos os atalhos e manter funcionalidades/permissões. Testar ações que gravem dados somente em ambiente apropriado, sem criar registros reais para testar estética.
8. Executar build e verificações adequadas ao projeto; apresentar capturas reais da implementação e registrar diferenças justificadas em relação à referência.

## Instrução reutilizável

Implemente a proposta da Secretaria EBD usando `docs/design/secretaria-ebd-v1/mockup.png` como referência visual e este guia como especificação. Preserve a hierarquia, a paleta, a tipografia, a composição e as proporções; aplique as adaptações responsivas documentadas. Reutilize os fluxos existentes, mantenha dados dinâmicos e permissões e não incorpore dados demonstrativos. Valide no navegador com capturas comparáveis, corrija divergências e informe qualquer desvio necessário. Publicação depende do escopo autorizado na solicitação de implementação.
