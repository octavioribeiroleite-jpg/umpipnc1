

# Melhorar Visibilidade da Logo na Barra Lateral

## Problema

A logo da IPNC e predominantemente verde e esta sobre o fundo verde escuro da sidebar, fazendo com que ela se misture e fique quase invisivel.

## Solucao

Adicionar um fundo circular branco (com leve sombra) atras da logo, criando contraste sem mudar as cores do app. Isso funciona tanto no tema claro quanto no escuro.

## Mudancas

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Envolver a `<img>` da logo em um `<div>` com fundo branco arredondado e padding |
| `src/components/pastor/PastorSidebar.tsx` | Mesma mudanca para manter consistencia |

### Detalhe visual

A logo recebera um container com:
- Fundo branco (`bg-white`)
- Bordas arredondadas (`rounded-lg`)
- Padding interno (`p-1`)
- Isso cria um "cartao" branco pequeno que destaca a logo do fundo verde escuro

### Resultado esperado

```
Antes:  [logo verde sobre fundo verde] = invisivel
Depois: [logo verde sobre circulo branco sobre fundo verde] = destaque claro
```

Nenhuma mudanca de cor no tema do app - apenas um container de contraste atras da imagem.

