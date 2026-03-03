

# Corrigir vídeo de fundo piscando ao trocar de step

## Problema
O `VideoBgWrapper` está definido **dentro** do componente `Auth`, então cada vez que o estado muda (troca de step), o React recria o `<video>` do zero — causando o flash/piscar preto.

## Solução
Extrair o vídeo para **fora** do wrapper condicional. Em vez de cada `return` ter seu próprio `VideoBgWrapper` com um `<video>` novo, a estrutura será:

1. **Um único `<video>` e overlay** renderizados uma vez no topo do componente, fora de qualquer condicional
2. **O conteúdo condicional** renderizado por cima, em `relative z-20`

### Mudança em `src/pages/Auth.tsx`
- Remover o componente `VideoBgWrapper` interno
- No `return` principal (e nos returns condicionais), unificar tudo em um único return com:
  - `<video>` fixo (sempre presente, nunca remontado)
  - Overlay fixo
  - Conteúdo condicional por cima
- A transição `isExiting` será aplicada apenas no container de conteúdo, não no vídeo

```text
┌─────────────────────────┐
│ <video> (sempre montado)│ z-0, fixed
│ <overlay>               │ z-10, fixed  
│ <div conteúdo>          │ z-20, relative — muda conforme step
│   {renderContent()}     │ ← lógica condicional aqui dentro
│ </div>                  │
└─────────────────────────┘
```

### Arquivo

| Arquivo | Ação |
|---|---|
| `src/pages/Auth.tsx` | Refatorar para um único `<video>` persistente |

