

# Reduzir opacidade do fundo

O problema: os containers de conteudo usam `bg-background/85` (85% opaco), o que cobre demais a imagem de fundo (bg-app.png). Preciso reduzir essa opacidade para deixar a planta mais visivel.

## Alteracoes

Trocar `bg-background/85` por `bg-background/60` nos 3 layouts:

| Arquivo | Linhas |
|---|---|
| `src/components/layout/AppLayout.tsx` | linhas 17, 25 |
| `src/components/pastor/PastorLayout.tsx` | linhas 46, 58 |
| `src/components/membro/MembroLayout.tsx` | linha 123 |

Isso reduz a opacidade de 85% para 60%, permitindo que a imagem de fundo fique mais visivel enquanto mantém legibilidade com o `backdrop-blur-sm`.

