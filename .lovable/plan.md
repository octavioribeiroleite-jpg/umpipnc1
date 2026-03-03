

# Tela de carregamento com imagem de fundo

## O que muda

A splash screen (tela inicial preta com logo pulsando) vai trocar o fundo preto pela imagem do app (`bg-app.png`), manter o logo pulsando, o texto "Igreja Presbiteriana de Nova Carapina" e adicionar "Carregando" embaixo.

## Alteração

**`src/pages/Auth.tsx`** (linhas 849-871) — Splash screen:

- Trocar `bg-black` por fundo com a imagem `bg-app.png` (cover, center) + overlay semitransparente para legibilidade
- Manter logo pulsando (`animate-logo-pulse`)
- Manter título "Igreja Presbiteriana" e "de Nova Carapina"
- Substituir os 3 pontinhos animados por texto "Carregando..." com animação suave

**`src/components/pastor/PastorLayout.tsx`** (linhas 23-28) — Loading do pastor:

- Mesmo padrão: fundo com `bg-app.png`, logo pulsando, texto "Carregando..."

Os demais loadings internos (dentro de tabs/cards) ficam como estão, pois só os de tela cheia precisam dessa identidade visual.

