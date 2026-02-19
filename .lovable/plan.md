
# Corrigir Icones PWA - Logo Maior e Centralizada

## Problema

Ambos os icones (`icon-512x512.png` e `icon-maskable-512x512.png`) mostram a logo original com muito espaco em branco ao redor, fazendo com que ela apareca pequena na tela inicial do Android. Alem disso, no formato maskable, o Android recorta ~20% das bordas, reduzindo ainda mais a logo visivel.

## Solucao

Usar a API de edicao de imagem para recriar ambos os icones a partir da logo original (`src/assets/logo-ipnc.png`), com as seguintes especificacoes:

### 1. `public/icons/icon-512x512.png` (icone principal)
- Fundo branco 512x512px
- Logo original centralizada ocupando ~85-90% do canvas
- Reduzir drasticamente o espaco em branco ao redor

### 2. `public/icons/icon-maskable-512x512.png` (icone adaptativo Android)
- Fundo branco 512x512px
- Logo original centralizada ocupando ~70% do canvas (para caber na "safe zone" de 80% do maskable)
- O Android recorta as bordas, entao a logo precisa estar bem centralizada

### 3. Manifest (`public/manifest.json`)
- Sem alteracoes necessarias - a configuracao atual ja esta correta com `"purpose": "any"` e `"purpose": "maskable"` separados

## Secao Tecnica

Serao modificados 2 arquivos de imagem usando a API de edicao de imagens (Gemini), passando a logo original como referencia e instruindo para centralizar e aumentar o tamanho dentro do canvas 512x512.

**Nota importante**: Apos publicar, os usuarios precisarao remover o app da tela inicial e adicionar novamente para ver os icones atualizados.
