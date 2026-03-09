

# Melhorar PinPad — Teclado físico + visual responsivo

## Problemas atuais
1. Sem suporte a teclado físico (computador não consegue digitar)
2. Botões sem feedback visual ao clicar (não parece responsivo)
3. Visual genérico e pouco polido

## Mudanças em `src/components/secretaria/PinPad.tsx`

### Teclado físico
- Adicionar `useEffect` com `keydown` listener global:
  - Teclas `0-9` → `handleDigit()`
  - `Backspace` → `handleDelete()`
  - `Enter` (quando 6 dígitos) → `onComplete(pin)`
- Adicionar `useRef` no container com `tabIndex={0}` e `autoFocus` para garantir foco

### Feedback visual nos botões
- Adicionar `active:scale-95 active:bg-primary/10 transition-all duration-100` nos botões numéricos
- Aumentar levemente o tamanho dos botões (`h-14` em vez de `h-12`)
- Botões com `rounded-xl` e sombra sutil (`shadow-sm`)
- Hover suave: `hover:bg-accent/50`

### PIN slots mais bonitos
- Slots maiores: `h-12 w-11` com `rounded-xl`
- Animação de entrada: dot com `scale-0 → scale-100` ao aparecer (transition)
- Dot maior: `h-3 w-3`
- Espaçamento `gap-3`

### Botão confirmar
- Sempre visível quando 6 dígitos, com animação `animate-in fade-in slide-in-from-bottom`

### Layout geral
- Container com `space-y-6` (mais espaçamento)
- Header com ícone decorativo (Lock) acima do título

## Arquivo modificado
- `src/components/secretaria/PinPad.tsx` — refatoração visual completa

