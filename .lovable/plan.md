

# Usar Logo Original Diretamente como Icones PWA

## O que sera feito

Copiar o arquivo `src/assets/logo-ipnc.png` diretamente para os dois icones PWA, sem nenhuma geracao ou edicao de imagem. Isso garante que a logo apareca exatamente como no arquivo original, sem perda de tamanho ou adicao de espaco em branco.

## Arquivos modificados

### 1. `public/icons/icon-512x512.png`
- Substituir pelo conteudo exato de `src/assets/logo-ipnc.png`

### 2. `public/icons/icon-maskable-512x512.png`
- Substituir pelo conteudo exato de `src/assets/logo-ipnc.png`

## Secao Tecnica

Serao usados dois comandos `lov-copy` para copiar o arquivo original diretamente:

```
lov-copy src/assets/logo-ipnc.png public/icons/icon-512x512.png
lov-copy src/assets/logo-ipnc.png public/icons/icon-maskable-512x512.png
```

Nenhuma edicao de imagem sera feita. O `manifest.json` permanece inalterado.

**Nota**: No formato maskable, o Android recorta ~20% das bordas. Se a logo original tiver conteudo muito proximo das bordas, ele pode ser cortado. Caso isso aconteca, podemos ajustar depois. Mas como a logo ja tem fundo branco com alguma margem, deve funcionar bem.

**Apos publicar**: usuarios precisam remover o app da tela inicial e adicionar novamente para ver os icones atualizados.

