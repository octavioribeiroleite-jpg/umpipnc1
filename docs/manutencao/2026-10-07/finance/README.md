# Exportação financeira com comprovante indisponível

Revisão de 07/10/2026 a partir da fonte `41642b51e304cd7532bd281e6dd9dd3cc8830b97`. Reprodução e regressões usam somente dados fictícios locais, sem rede, backend ou download em disco. A revisão do banco foi somente de leitura, com resultados agregados e catálogo; não houve movimentação financeira.

## Defeito confirmado

O gerador legado de `/financas` capturava falhas ao obter a URL ou incorporar uma imagem de comprovante, continuava a exportação e chegava a `pdf.save`. Como a função resolvia normalmente, a tela anunciava “PDF completo gerado com sucesso!”, mesmo com um anexo ausente. O PDF mostrava o erro no espaço do anexo, mas o download e a mensagem de sucesso continuavam. Esse comportamento antecede esta entrega; não é uma regressão introduzida pela revisão visual atual.

Referências anteriores: `src/components/financas/financialReportPdf.ts`, tratamento do índice de comprovantes e de `addReceiptPage`, seguido de `pdf.save`; `src/components/financas/RelatoriosTab.tsx`, sucesso após `await generateFinancialReportPdf`.

## Correção

As falhas de comprovantes passam a interromper a geração antes do download. O gerador rejeita com uma mensagem útil sem nomes, caminhos ou URLs; a tela exibe erro e libera uma nova tentativa. Foram removidos os caminhos que convertiam falha de comprovante em um anexo vazio com exportação bem-sucedida.

A política existente dos comprovantes PDF foi preservada: o relatório contém links assinados e a identificação do anexo. Imagens válidas continuam incorporadas. Esta correção não transforma o relatório legado na prestação anual da tesouraria, que incorpora integralmente os arquivos e usa um snapshot financeiro próprio.

O import de jsPDF usa o export nomeado, como o gerador da tesouraria, permitindo testar o gerador real também no Node. Nenhuma alteração em dados, acesso, saldo, fórmulas, banco ou layout.

## Verificação isolada

`tests/financial-report.test.mjs` usa o gerador e jsPDF reais, intercepta exclusivamente `save` e substitui `fetch`/`FileReader` com fixtures. Não consulta o Supabase ou arquivos reais.

- Antes da correção: **3 testes passaram, 5 falharam**, por ausência da rejeição esperada nas falhas de anexo.
- Depois da correção: **8/8 passaram**. Cobrem URL indisponível no índice e no anexo, resposta HTTP de erro, imagem corrompida e leitura de imagem indisponível; todos exigem rejeição e **zero downloads**.
- Os casos válidos preservam relatório sem comprovantes, PDF com links e PNG efetivamente incorporado. O teste da imagem inspeciona os objetos de imagem do PDF; não basta a função resolver.
- Mensagens de erro não podem conter a descrição, caminho ou URL fictícios dos comprovantes nem os detalhes da falha original.

As verificações completas de tipos, suíte, build e publicação pertencem ao relatório coordenado da entrega.

## Tesouraria e limites restantes

A revisão confirmou que as migrations de tesouraria constam no histórico remoto. Os corpos de 22 funções finais coincidem com os arquivos locais; o diretório público usa o binding esperado. RLS, grants, triggers de guard/auditoria e o bucket privado permanecem conforme o fluxo documentado. A proteção temporal de reserva de 06/10 continua aplicada.

O livro novo está vazio na consulta agregada desta revisão. Não foram encontradas violações de composição, conciliação, referência única ou reserva histórica; um livro vazio não comprova concorrência entre sessões. O limite já documentado de PGlite em uma conexão permanece.

No livro legado, consultas de painel/extrato/relatório continuam sem paginação explícita, e os conjuntos do relatório são obtidos em consultas distintas. Esses riscos de escala/consistência não foram ampliados nem corrigidos nesta entrega. A consulta agregada registrou **54 transações**, **0 sociedades acima de 1.000 linhas** e **0 períodos anuais de sociedade acima de 1.000 linhas**; portanto, não se confirmou truncamento atual. Coincidência entre data, valor e descrição não comprova duplicidade financeira.

A atualização PostgreSQL anunciada pelo fornecedor permanece acompanhamento operacional: versão informada e anúncio, isoladamente, não confirmam exploração ou CVE aplicável ao módulo. A mudança anunciada de pgcrypto envolve cifragem PGP legada; o PIN da tesouraria usa bcrypt. Não foi aplicada atualização de banco.
