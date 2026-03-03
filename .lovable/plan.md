

# Modo Tela Cheia (Fullscreen)

## Problema
O manifest.json usa `"display": "standalone"` que ainda mostra a barra de status do sistema. Além disso, o `theme_color` no manifest ainda está `#2f9e6e` (verde), inconsistente com o `#1a1a1a` do index.html.

## Solução

### 1. `public/manifest.json`
- Mudar `"display"` de `"standalone"` para `"fullscreen"` -- esconde completamente a barra de status e navegação do sistema quando instalado como PWA
- Atualizar `"theme_color"` para `"#1a1a1a"` (consistente com index.html)
- Atualizar `"background_color"` para `"#1a1a1a"` (splash screen escuro)

### 2. `index.html`
- Adicionar `<meta name="mobile-web-app-capable" content="yes">` para compatibilidade Android

> **Nota**: O modo fullscreen só funciona quando o app é instalado como PWA (adicionado à tela inicial). No navegador comum, a barra do navegador sempre aparece.

| Arquivo | Ação |
|---|---|
| `public/manifest.json` | `display: fullscreen`, atualizar cores |
| `index.html` | Adicionar meta tag mobile-web-app-capable |

