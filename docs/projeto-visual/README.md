# Projeto visual IPNC — primeira etapa, 05/10/2026

Referência: `IPNC_Projeto_Visual_Completo.pdf`, enviado pelo proprietário, com 78 páginas, 61 pranchas e 36 entradas de rotas. O documento usa uma revisão anterior à auditoria já publicada; a implementação parte da revisão `f631756` e preserva seus controles de acesso e regras de negócio.

Esta entrega inicia a aplicação do projeto por sua base compartilhada. Não constitui uma reprodução individual de todas as 61 pranchas.

## Implementação

- Entrada com logo oficial, fundo sólido e quatro acessos: Diretoria, Secretaria EBD, Tesouraria e Portal da Igreja. PIN, acesso administrativo, recuperação de senha e sessões mantêm seus fluxos existentes.
- Inter local, paleta, contraste, títulos, campos, botões, bordas, espaçamento e diálogos compartilhados. A apresentação de eleições e o portal também receberam a base visual sólida.
- Navegação da Diretoria, Pastor e EBD: inferior abaixo de 700 px, trilho de 76 px entre 700 e 1099 px e lateral de 224 px a partir de 1100 px. Conteúdo principal único, sem duplicar formulários por tamanho de tela. O shell de membros conserva seu breakpoint anterior; seu acesso continua fechado.
- EBD com destinos filtrados por perfil. O rodapé da chamada respeita a altura real da navegação inferior, incluindo fonte ampliada.
- Finanças da Diretoria com as seis seções existentes antes do conteúdo e seletor no celular; Tarefas com seletor de situação no celular e uma única instância de cada tarefa; próximos eventos antes do calendário no celular; ajustes nos cards de arquivos, tarefas e sociedades.
- Tesouraria preserva o desktop aprovado e o layout móvel de entradas e saídas. Cards de sociedades em duas colunas, sigla e proporção quadrada com fonte normal; com valores longos ou fonte ampliada, crescem sem cortar o conteúdo. Formulário da sociedade continua com valor, data, pessoa, descrição e Pix/Dinheiro. Conferência, divisão e vínculo bancário continuam restritos ao formulário administrativo existente.

Não há mudança de esquema, migração, regra financeira, voto ou gravação de chamada nesta etapa.

## Validação

- Node.js 24; `npx tsc -p tsconfig.app.json --noEmit`: passou.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: 195 testes passaram, sem falhas. Inclui dois novos testes da navegação da EBD para professor e administrador e montagem única do conteúdo.
- `npm run build`: passou. Persistem os avisos de tamanho de bundle e de importação dinâmica já existentes.
- `git diff --check`: passou.
- ESLint: 298 erros e 65 avisos no projeto, sem novos diagnósticos em relação à base. A dívida anterior de lint não está resolvida por esta entrega.
- Browser do Codex, Chromium: 20 rotas da Diretoria em 320 e 1440 px; cinco rotas do Pastor em 320, 700, 1100 e 1440 px; 11 telas representativas com nomes longos e fonte base CSS de 200%; estados de entrada, recuperação, portal, rota inexistente e acesso de membros. Sem transbordamento horizontal nas medições finais. Evidência em [2026-10-05-geometria.json](2026-10-05-geometria.json).
- EBD: navegação permitida ao professor, oito destinos administrativos, lista fictícia da chamada e separação entre ações e navegação inferior; fonte ampliada e trilho de tablet conferidos.
- Tesouraria: formulário simples, ferramentas administrativas, saldos zerados e valores altos/negativos, celular e desktop. Em 320 px com fonte normal, cards mediram 130,5 × 130,5 px. Com fonte de 200%, as duas primeiras linhas cresceram para 449 e 314 px, com altura igual dentro de cada linha e sem corte de conteúdo. Desktop em 1440 px conserva lateral de 232 px e cards alinhados.

Testes de interface usaram fixtures locais com transporte isolado e dados fictícios. Não foram realizadas movimentações financeiras, votos, mensagens ou gravações de presença reais. Emulação e fonte CSS ampliada não comprovam Safari, aparelho físico, teclado virtual ou zoom nativo.

## Verificação manual

1. Abrir `/auth` em sessão anônima, conferir os quatro acessos e abrir/cancelar o seletor da Tesouraria. Entrar com o perfil autorizado e conferir o destino correto.
2. Redimensionar para 320, 700, 1100 e 1440 px; conferir a troca de navegação, títulos legíveis e ausência de rolagem horizontal.
3. Na Diretoria, alternar as seis seções de Finanças e as situações de Tarefas; abrir e cancelar um formulário para conferir que o rascunho não foi duplicado ao redimensionar.
4. Na fixture isolada da EBD, comparar professor e administrador e conferir que a barra de ações da chamada fica acima da navegação inferior. Não usar presença real como teste de publicação.
5. Na fixture isolada da Tesouraria, comparar tesoureiro e administrador, abrir/cancelar os formulários e alternar cenários zerados, negativos e indisponíveis; ampliar a fonte para conferir que valores e paginação cabem.

Comandos de prévia isolada:

```sh
npx vite --config tests/vite.diretoria.config.ts --port 8083
npx vite --config tests/vite.ebd.config.ts --port 8092 --host 127.0.0.1 --strictPort
IPNC_TREASURY_PREVIEW_DIR=/tmp/ipnc-visual-treasury-ui IPNC_TREASURY_PREVIEW_PORT=8091 node scripts/treasury-ui-preview.mjs --serve
```

Na Diretoria, usar `/__diretoria/<rota>?role=admin&controls=0`; na EBD, `/tests/fixtures/ebd-back.html?role=professor`; na Tesouraria, `/`. As fixtures de Diretoria e EBD aceitam `state=long` e/ou `font=200` conforme o cenário; a Tesouraria aceita `font=200`.

## Continuidade do projeto

A próxima camada é a comparação individual das pranchas e os refinamentos próprios de cada tela. Esta entrega aplica a entrada, a base visual, os shells e os ajustes descritos acima; não declara concluídos todos os detalhes do PDF nem a validação em dispositivos físicos.
