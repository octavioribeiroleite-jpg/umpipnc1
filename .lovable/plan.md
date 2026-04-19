
Usuário quer:
1. Adicionar de volta **algumas** infos úteis (não técnicas) na tela de apresentação durante votação
2. Melhorar layout (mais bonito)
3. Melhorar responsividade
4. Resolver fundo demorando para carregar

## O que adicionar (informações úteis, não técnicas)
- "**Aguardando votos…**" / "**Votação em andamento**" / "**Votação encerrada**" — status amigável
- "**X% concluído**" — visual, fácil de entender
- "**Faltam N votos**" — contagem regressiva motivadora
- Hora atual ou tempo decorrido (opcional, descartado pra não poluir)

Remover (continua fora): badge técnico "atualiza a cada 5 votos", "Acompanhamento anônimo".

## Melhorias visuais
- **Background**: a imagem `/images/bg-app.png` (definida no `body` do `index.css`) demora porque é grande e carrega via CSS. Solução: aplicar gradient sólido bonito como fallback imediato + preload da imagem no `<head>`.
- **Tipografia maior** no contador (responsivo: `text-8xl md:text-[10rem] lg:text-[14rem]`)
- **Glow/sombra** no número grande pra projetor
- **Animação suave** de pulse no contador quando muda
- **Card glassmorphism** envolvendo o contador (consistente com design system)
- **Header mais compacto** em mobile, mais arejado em desktop
- **Barra de progresso**: gradiente com brilho, altura maior, animação shimmer sutil

## Responsividade
- Mobile (atual viewport 384px): contador `text-7xl`, header em coluna se necessário
- Tablet: `text-9xl`
- Projetor/desktop grande: `text-[14rem]` ocupando bem a tela
- Garantir que header não quebre com nomes longos
- Padding seguro em todos os breakpoints

## Background lento
- Adicionar `<link rel="preload" as="image" href="/images/bg-app.png">` no `index.html`
- Aplicar `background-color` semântico (gradient emerald) imediato no body antes da imagem carregar
- Já existe gradient na página `from-background via-background to-muted/40`, garantir que cubra enquanto bg carrega

## Arquivos
- `src/pages/EleicaoApresentar.tsx` — redesign do PROGRESS VIEW
- `index.html` — preload do bg-app.png
- `src/index.css` — fallback color sólido no body antes da imagem

## Resultado
Tela limpa, bonita, com 3 infos: contador grande / barra de progresso / status amigável + % concluído + faltam N. Tudo responsivo e com fundo aparecendo rápido.
