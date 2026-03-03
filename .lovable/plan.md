

# Ajustes na Splash Screen

## Problemas identificados

1. **Barra preta no topo**: O `meta theme-color` esta `#1a1a1a` (preto) e o `apple-mobile-web-app-status-bar-style` esta `black-translucent`. A splash nao cobre a area da status bar. Preciso usar a classe `safe-top` ou garantir que o container cubra tudo com padding adequado.

2. **Logo pequena**: Atualmente `h-28 w-28` (112px). O usuario quer 200% maior, ou seja ~224px. Vou usar `h-56 w-56`.

3. **Logo mais acima**: Atualmente centralizada verticalmente. Preciso posicionar mais para o topo da tela.

4. **Splash muito rapida**: Atualmente depende do video carregar (`videoReady`). Preciso garantir minimo 2 segundos de splash.

5. **Animacoes na transicao**: Ao sair da splash para a tela de selecao, adicionar animacoes mais elaboradas.

## Alteracoes

### `index.html`
- Mudar `theme-color` para uma cor escura verde que combine com o app (ex: `#1B3A2D` - emerald escuro) para eliminar a barra preta.

### `src/pages/Auth.tsx`

**Splash screen (linhas 849-869)**:
- Logo: `h-28 w-28` → `h-56 w-56` (200% maior)
- Posicionar conteudo mais para cima: trocar `items-center justify-center` por `items-center justify-start pt-[20vh]`
- Garantir que o container usa `safe-top` para cobrir area da status bar

**Timing da splash (linhas 101-112)**:
- Adicionar timer minimo de 2 segundos: a splash so começa o zoom-out apos `videoReady` E pelo menos 2s terem passado
- Isso garante que tudo carrega antes de mostrar o conteudo

**Animacao de transicao**:
- Na saida da splash, usar `scale-110` com fade-out (ja existe)
- Ao mostrar os cards (`showCards`), adicionar animacoes de entrada mais elaboradas - fade-up escalonado com slide suave

### `src/components/pastor/PastorLayout.tsx` (linhas 23-34)
- Mesmas mudancas na logo: `h-56 w-56`, posicao mais alta, safe-top

