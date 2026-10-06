# QA final da marca aprovada v4 nos PDFs — 05/10/2026

Resultado: aprovado nos quatro geradores reais, em oito páginas, com o helper real do worktree e compressão PNG FAST. Nenhum override temporário foi aplicado nesta geração final. Foram usados somente dados fictícios em processo isolado, sem cliente de autenticação, navegador, cookies ou backend. O processo rejeita imports de autenticação/Supabase e bloqueia fetch.

O PNG incorporado é RGBA 1254 × 1254, SHA256 `2df611f147250f6df0caeb189051cea1cd0748c05ed90bb752501125021f7081`. Os pixels e o canal alpha extraídos de cada PDF são idênticos ao master. A proporção 1:1 é preservada: imagem de 18 × 18 mm nos três EBD e de 20 × 20 mm no calendário, com 1 mm de margem em moldura branca RGB 255/255/255. Logo integral, sem cortes ou sobreposição dos títulos nos quatro cabeçalhos.

FAST usa filtro PNG Sub e zlib nível 1 no RGB e no alpha. Ambos os streams PDF usam FlateDecode. O teste confirmou ausência de perda dos pixels e da transparência. O conteúdo dos relatórios e os pixels renderizados do corpo e da marca são idênticos aos PDFs sem compressão, exceto o horário de geração no rodapé. A redução de tamanho fica entre 81,98% e 82,51%.

Os três guards reais de snapshot obsoleto bloquearam a exportação. As exportações válidas não alteraram o snapshot nem as entradas fictícias. Paginação e remoção do evento cancelado foram confirmadas. Os hashes do master, dos geradores, do helper e da fila foram registrados e reconferidos depois da geração.

Todos os PDFs finais foram renderizados com Poppler a 150 DPI e as oito páginas foram inspecionadas visualmente. O escopo deste QA é a marca e a compressão sem perda; textos, cálculos, ordenação e composição legados não foram editados.

| Exportação real | Páginas | Tamanho final |
| --- | ---: | ---: |
| chamada-ebd-20261004.pdf | 1 | 1113401 bytes |
| relatorio-chamadas-ebd.pdf | 1 | 1103464 bytes |
| relatorio-trimestral-ebd.pdf | 3 | 1128294 bytes |
| cronograma-ipnc---dados-ficticios-outubro-2026.pdf | 3 | 1143892 bytes |

Os PDFs finais têm entre 1,10 e 1,14 MB. `pdf-lossless-compression.json` registra a comparação do experimento isolado e a prova com o código real aplicado.

Evidências: `pdf-generation.json`, `pdf-inspection.json`, `pdf-visual-inspection.json`, `pdf-evidence-manifest.json`, `pdf-lossless-compression.json`, quatro PDFs, oito PNGs de páginas e as pranchas `pdf-four-brand-headers.png` e `pdf-all-eight-pages.png`. Scripts de reprodução isolada: `/tmp/ipnc-brand-pdf-qa-v4/generate.mjs` e `/tmp/ipnc-brand-pdf-qa-v4/verify_pdfs.py`. Baseline sem compressão preservado em `/tmp/ipnc-brand-pdf-qa-v4-uncompressed-baseline`; experimento preservado em `/tmp/ipnc-brand-pdf-fast-experiment`.

Nenhum componente, asset, handler, gerador, helper ou arquivo PWA foi editado por esta tarefa de QA. Nenhum stage, commit, push ou deploy foi realizado.
