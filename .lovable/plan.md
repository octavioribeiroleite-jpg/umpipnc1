

# Ajustar PinPad na tela de login da Diretoria

## Problemas
1. **Logo não aparece** — o PinPad tem `min-h-screen` próprio e é renderizado dentro do Auth que já tem layout, empurrando a logo para fora
2. **Slots do PIN desiguais** — agrupados 4+2 com espaço entre eles, ficam desalinhados
3. **Muito espaço vazio** — layout não é compacto

## Mudanças

### `src/pages/Auth.tsx` (trecho diretoria pin)
- Em vez de renderizar `<PinPad>` diretamente (que tem seu próprio `min-h-screen`), renderizar o PinPad **inline** dentro do layout do Auth, mantendo a logo visível acima
- Manter o header "Bem-vindo" + logo + mostrar o PinPad abaixo, sem wrapper full-screen duplicado

### `src/components/secretaria/PinPad.tsx`
- Adicionar prop `embedded?: boolean` — quando `true`, remove o wrapper `min-h-screen flex items-center justify-center` e renderiza apenas o conteúdo do pad
- Uniformizar os 6 slots do PIN: todos iguais, em uma única linha `flex gap-2`, sem separação 4+2
- Reduzir tamanho dos slots e botões para ficar mais compacto (slots `h-10 w-9`, botões do teclado `h-12`)

