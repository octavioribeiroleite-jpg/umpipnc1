

# Botao "Acessar sem login" mais evidente e com animacao sutil

## O que muda

O botao atual e discreto (borda tracejada, texto pequeno). Vamos transforma-lo em um card destacado com:

- **Fundo com gradiente emerald sutil** que pulsa suavemente (shimmer/glow)
- **Icone de igreja** (Church do lucide-react) ao lado do texto
- **Texto maior e mais chamativo**: "Acessar sem login" com subtitulo "Programacoes, avisos e dizimos da igreja"
- **Seta animada** que se move sutilmente para a direita (convite ao clique)
- **Brilho de borda animado** (border glow pulsante) para chamar atencao sem ser agressivo

## Visual esperado

```text
+-----------------------------------------------+
|  [Igreja]  Acessar sem login            ->     |
|            Programacoes, avisos e dizimos       |
+-----------------------------------------------+
   (borda com glow pulsante verde esmeralda)
```

## Detalhes tecnicos

### `src/pages/Auth.tsx`
- Importar `Church` e `ArrowRight` do lucide-react
- Substituir o botao simples (linhas 148-153) por um card estilizado:
  - `bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10`
  - Borda solida com `border-primary/40` e animacao de glow
  - Icone Church + texto principal + subtitulo + seta animada
  - Hover: escala sutil (`hover:scale-[1.02]`) e sombra

### `src/index.css`
- Adicionar keyframe `shimmer-border` para o efeito de brilho pulsante na borda
- Adicionar keyframe `bounce-right` para a seta que se move sutilmente para a direita

### Animacoes adicionadas
- `shimmer-border`: borda alterna entre `primary/20` e `primary/50` a cada 2s
- `bounce-right`: seta se move 4px para a direita e volta a cada 1.5s
- Ambas sao sutis e respeitam `prefers-reduced-motion`

