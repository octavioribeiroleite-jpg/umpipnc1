# Carregamento dos ícones de sociedades — 07/10/2026

A seleção de sociedades baixava seis PNGs de 384 × 384 px somente depois de abrir. O conjunto somava 835.040 bytes, apesar de os cards exibirem os ícones em 76 px no desktop e 56 px no celular.

## Correção

- Versões WebP de 96, 192, 256 e 384 px, selecionadas pelo navegador conforme viewport e densidade. Codificação sem perdas; apenas redução proporcional nos tamanhos menores.
- Pré-carregamento dos mesmos recursos responsivos na Home, com prioridade baixa e decodificação assíncrona. A navegação não espera pelas imagens.
- Registro único de imagens para cards e antecipação; tentativas bem-sucedidas são reutilizadas, falhas podem ser tentadas novamente.
- Cache PWA atualizado para v26; URLs de produção têm hash de conteúdo e o cache de imagens existente já aceita WebP.

As seis matrizes PNG continuam intactas. O gerador `scripts/generate-society-icons.py --check` verifica hashes das matrizes, dimensões, transparência e igualdade de todos os pixels RGBA com o redimensionamento esperado. A versão de 384 px preserva exatamente os pixels da matriz. Nenhum rótulo, ordem, cor, permissão ou fluxo de acesso foi alterado.

| Conjunto dos seis ícones | Bytes de arquivo | Redução sobre os PNGs |
| --- | ---: | ---: |
| PNG original, 384 px | 835.040 | — |
| WebP, 96 px | 65.616 | 92,1% |
| WebP, 192 px | 197.012 | 76,4% |
| WebP, 256 px | 311.048 | 62,7% |
| WebP, 384 px | 573.166 | 31,4% |

## Verificação

- Node 24.19.0; tipos com `npx tsc -p tsconfig.app.json --noEmit`: passou.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: 443 testes passaram, sem falhas ou casos ignorados.
- `npm run build`: passou. Permanecem avisos preexistentes sobre tamanho de chunks e importação estática/dinâmica de Sonner.
- ESLint dos seis arquivos TypeScript/TSX alterados e `git diff --check`: passaram.
- Verificação dos 24 WebPs e das seis matrizes com o gerador: passou.

No Chrome, cache HTTP desativado apenas na aba de QA:

| Ensaio | Variante escolhida | Bytes transferidos, incluindo cabeçalhos | Downloads extras ao abrir a seleção |
| --- | --- | ---: | ---: |
| Antes, ambos os ensaios | PNG 384 px | 838.622 | 6 |
| Depois, desktop 1440 × 900, DPR 1 | WebP 96 px | 69.190 | 0 |
| Depois, celular 390 × 844, DPR 3 | WebP 192 px | 200.588 | 0 |

Depois da correção, os seis pedidos terminaram na Home e os seis elementos estavam completos na primeira leitura após clicar em Diretoria. Arte e cores conferidas nas capturas [desktop](desktop.png) e [celular](mobile.png). Os dados de [antes](baseline-summary.json) e [depois](after-summary.json) registram as variantes e a condição de cada imagem. A largura natural informada pelo navegador com `srcset` é corrigida pela densidade; a resolução do arquivo está no nome de `currentSrc`.

Os [pedidos de rede](network-summary.json) confirmam ausência de transferências duplicadas. Os seis ciclos sociedade → PIN → Voltar retornaram à seleção sem buscar novamente as imagens; [registro da navegação](navigation-summary.json). A [captura mobile completa](mobile-full.png) mostra os seis cards. Emulação e cache foram restaurados e a aba temporária de QA foi fechada.

Os ensaios de navegador usam o preview isolado em 127.0.0.1:8086, com backends fictícios e bloqueio de acesso ao Supabase real. Nenhum dado de produção foi escrito. Os tempos de localhost não são uma medição da conexão celular do proprietário. Um clique imediato na primeira abertura ainda pode aguardar a rede; a melhoria reduz os bytes necessários e inicia a busca mais cedo.
