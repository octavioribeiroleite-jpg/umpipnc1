# IPNC — configuração PWA e ícones, 06/10/2026

O manifest preserva `id`, `start_url` e `scope` como `/`, nome e orientação `portrait-primary`. Antes usava `display: standalone` e as duas cores `#123b2e`. Agora usa `display: standalone`, `display_override: ["fullscreen", "standalone"]` e `theme_color`/`background_color` `#f7fbf8`, o mesmo fundo claro global. O HTML continua com um único viewport com `viewport-fit=cover` e `black-translucent` para o app instalado no iOS.

| Asset novo | Dimensões | Composição |
| --- | --- | --- |
| `icon-192x192-v5.png` | 192 × 192 | Arte completa, canvas completo, transparente |
| `icon-512x512-v5.png` | 512 × 512 | Arte completa, canvas completo, transparente |
| `icon-maskable-512x512-v5.png` | 512 × 512 | Arte completa em 320 × 320, fundo `#f7fbf8` |
| `apple-touch-icon-v5.png` | 180 × 180 | Arte completa em 180 × 180, fundo `#f7fbf8` |

Fonte: `src/assets/logo-ipnc.png`, PNG RGBA oficial de **1254 × 1254**, SHA-256 `2df611f147250f6df0caeb189051cea1cd0748c05ed90bb752501125021f7081`. O mestre permaneceu byte a byte idêntico. Não houve recorte, remoção de pixels alpha, alteração de proporção, redesenho, mudança de cores ou ampliação artificial. As reduções usam Lanczos e os arquivos PNG usam codificação lossless.

Os ícones comuns deixaram de receber um quadrado opaco; a arte ocupa o canvas disponível. O Apple Touch usa o fundo da página porque o ícone do iOS exige uma composição opaca. O maskable passa de 280 para 320 px de arte: todos os cantos dos pixels com alpha maior que zero ficam dentro do círculo garantido de raio 204,8 px, com folga mínima de 6,76 px. Círculo, quadrado arredondado e squircle não cortam nenhum pixel da arte. Evidências: [contato visual](qa-pwa-icons-v5.png) e [metadados verificáveis](pwa-asset-metadata-v5.json).

O service worker utiliza `ump-cache-v18`, precache exclusivo dos três ícones do manifest e URL de registro versionada. O manifest e o Apple Touch têm URLs novas. Favicon e preview social v4 continuam corretos porque já usam a mesma logo aprovada; não participam da composição do splash.

## Limitações reais e verificação necessária no aparelho

- `display_override` considera o primeiro modo suportado; quem não reconhece a propriedade usa `display: standalone`. Android pode oferecer fullscreen; desktop e iPadOS mantêm fallback conforme o navegador. Não é usado pedido de Fullscreen API automático. [Chrome](https://developer.chrome.com/docs/capabilities/display-override), [web.dev](https://web.dev/learn/pwa/app-design).
- O splash nativo de Chrome/Android utiliza cor sólida e ícone do manifest. Curvas, folhas e animação de CSS só podem aparecer quando o documento carregar. A cor clara e o ícone transparente aproximam as duas fases, mas não fornecem uma imagem de fundo ao splash do sistema. [Chrome — splash](https://developer.chrome.com/docs/lighthouse/pwa/splash-screen).
- `black-translucent` permite que a página instalada no iOS ocupe a região da barra de status; não autoriza o site a ocultar relógio/bateria em todas as versões. A proteção de conteúdo precisa continuar nas safe areas. [Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).
- No Chrome 144+, mudar URL/metadados de ícones é necessário para solicitar atualização; alterações importantes de identidade podem depender da revisão do usuário no navegador. O service worker não pode forçar atualização do ícone do launcher. [Chrome — atualizações, 21/01/2026](https://developer.chrome.com/blog/improvements-to-web-app-updates).

Validação executada nesta etapa: geração com asserções de integridade e máscaras; inspeção do contato visual; **15 testes PWA aprovados** com o helper real de modos de instalação, incluindo supressão de convites em fullscreen/minimal-ui, mudanças de modo e remoção de listeners; lint pertinente e `git diff --check` sem erros. Instalação, fechamento e reabertura pelo ícone em Android/iOS reais não foram realizadas nesta etapa. Emulação de viewport não comprova status bar nativa, barra de gestos, splash do sistema ou atualização do launcher.

Nenhuma regra de negócio, dado, permissão, rota ou autenticação foi alterada nesta etapa.
