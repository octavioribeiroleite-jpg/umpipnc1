

# PWA Edge-to-Edge — Plano Atualizado

## Alterações

### 1. `index.html`
- Viewport: adicionar `viewport-fit=cover`
- `theme-color`: → `#000000`
- `apple-mobile-web-app-status-bar-style`: → `black-translucent`

### 2. `public/manifest.json`
- `display`: `fullscreen` → `standalone`
- `background_color`: → `#000000`
- `theme_color`: → `#000000`

### 3. `src/index.css`
- Adicionar `*, *::before, *::after { box-sizing: border-box; }`
- `html, body`: `margin: 0; padding: 0; background-color: #000;`
- `body`: `padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);`
- `:root`: `min-height: 100vh; width: 100vw;`

### 4. `src/components/layout/AppLayout.tsx`
- Remover qualquer margin/border/shadow no container raiz, garantir `min-h-screen w-screen`

### Após a alteração
Desinstalar PWA → limpar cache → reinstalar.

