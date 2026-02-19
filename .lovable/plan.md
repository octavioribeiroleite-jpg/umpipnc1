

# Ajustar Texto do Icone Maskable para Branco

## O que sera feito

Regenerar o arquivo `public/icons/icon-maskable-512x512.png` com o texto "RENOVO ipnc" em cor branca (#FFFFFF) sobre o fundo verde (#2f9e6e), mantendo o logo centralizado nos 80% internos. Isso garante contraste adequado e boa legibilidade em qualquer formato de icone adaptativo do Android.

## Secao Tecnica

### Arquivo: `public/icons/icon-maskable-512x512.png`

Recriar o icone SVG-to-PNG com as seguintes especificacoes:

- Canvas: 512x512px
- Fundo: #2f9e6e (verde solido)
- Logo e texto: centralizado, ocupando 80% da area interna (~410px)
- Cor do texto "RENOVO ipnc": branco (#FFFFFF) em vez da cor atual escura
- O simbolo grafico (arvore/folha) tambem em branco para uniformidade

Apenas 1 arquivo sera modificado: `public/icons/icon-maskable-512x512.png`.

