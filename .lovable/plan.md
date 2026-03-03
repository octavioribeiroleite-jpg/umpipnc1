

# App em tela cheia quando instalado como PWA

## Diagnóstico

O `manifest.json` já tem `"display": "fullscreen"`, que deveria ocultar a barra de status. Porém, as cores `background_color` e `theme_color` ainda estão como `#1a1a1a` (preto), o que causa aquela faixa preta visível antes do app renderizar. Além disso, o `apple-mobile-web-app-status-bar-style` está como `black-translucent`, que mostra a barra com fundo preto semi-transparente no iOS.

**Importante**: Depois de alterar o manifest, o PWA precisa ser **desinstalado e reinstalado** na tela inicial para aplicar as mudanças — o manifest é lido apenas na instalação.

## Alterações

### `public/manifest.json`
- `background_color`: `"#1a1a1a"` → `"#1B3A2D"`
- `theme_color`: `"#1a1a1a"` → `"#1B3A2D"`

### `index.html`
- `apple-mobile-web-app-status-bar-style`: `"black-translucent"` → `"default"` (usa a cor do tema como fundo da barra no iOS)

### Após a alteração
Você vai precisar:
1. Remover o app da tela inicial
2. Acessar o site pelo Chrome
3. Instalar novamente (Adicionar à tela inicial)

Isso garante que o manifest atualizado seja aplicado e o app abra em tela cheia real, sem barras.

