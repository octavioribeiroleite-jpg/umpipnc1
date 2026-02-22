
# Melhorar header do Portal da Igreja

## Resumo

Aumentar o tamanho da logo e reorganizar o header do portal publico para ficar mais espaçado e visualmente agradavel.

## Mudancas em `src/pages/PortalIgreja.tsx`

### Header (linhas ~253-325)

- Aumentar a logo de `h-9 w-9` para `h-12 w-12`
- Aumentar o padding vertical do header de `py-3` para `py-4`
- Aumentar o titulo "Portal da Igreja" de `text-sm` para `text-base`
- Aumentar a saudacao "Ola, nome!" de `text-xs` para `text-sm`
- Ajustar gap entre elementos para melhor respiro visual

### Resultado esperado

O header ficara com a logo maior (48px), titulo e saudacao mais legiveis, e melhor espacamento geral, mantendo o mesmo layout (hamburguer | logo + texto | login).
