

# Plano: Background Global + Dashboard Premium do Pastor

## 1. Background Global com Imagem da Planta

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `public/images/bg-app.png` | Copiar imagem enviada |
| `src/index.css` | Background fixo no body + classe overlay |
| `index.html` | Mudar `theme-color` de `#2f9e6e` para `#1a1a1a` (remove barra verde) |
| `src/components/layout/AppLayout.tsx` | Overlay translúcido + backdrop-blur |
| `src/components/pastor/PastorLayout.tsx` | Overlay translúcido + backdrop-blur |
| `src/components/membro/MembroLayout.tsx` | Overlay translúcido + backdrop-blur |
| `src/components/layout/MobileHeader.tsx` | Header glass (`bg-card/80 backdrop-blur-md`) |
| `src/components/pastor/PastorMobileHeader.tsx` | Header glass |
| `src/pages/Auth.tsx` | Esconder background image (já tem vídeo) |

### Detalhes técnicos
- Body recebe `background-image` fixo via CSS
- Cada layout recebe `bg-background/85 backdrop-blur-sm` para legibilidade
- Headers mobile recebem `bg-card/80 backdrop-blur-md` (efeito glass)
- Auth.tsx recebe override `bg-transparent` no container (vídeo prevalece)
- `theme-color` muda para cor escura, eliminando a barra verde no mobile

---

## 2. Dashboard Premium do Pastor (`PainelPastor.tsx`)

### Conceito visual
Estilo minimalista clean, com hub central de society cards premium. Tipografia leve, cards com glassmorphism sutil, acentos de cor por sociedade.

```text
┌─────────────────────────────────┐
│  Bom dia, Pastor               │
│  terça, 03 de março      [IA]  │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐   │
│  │ ● UMP        12 membros  │   │
│  │   R$ 450    2 pendentes  │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ ● SAF        8 membros   │   │
│  │   R$ 320    0 pendentes  │   │
│  └──────────────────────────┘   │
│  ...                            │
├─────────────────────────────────┤
│  Acesso Rápido                  │
│  [📅 Cal] [📢 Com] [💰 Díz] [🗳️]│
├─────────────────────────────────┤
│  ⚠️ Alertas (se houver)        │
├─────────────────────────────────┤
│  Próximos Eventos (max 3)      │
└─────────────────────────────────┘
```

### Mudanças no `PainelPastor.tsx`
- **Remover** grid 2x2 de métricas genéricas (Membros/Saldo/Pendentes/Eventos)
- **Society Cards Premium**: cards grandes, full-width, com borda esquerda na cor da sociedade, mostrando membros, saldo e pendências. `bg-card/70 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md`
- **Acesso Rápido**: 4 botões ícone (Calendário, Comunicados, Dízimos, Eleições) com glass effect
- **Tipografia**: `text-2xl font-light tracking-tight` na saudação
- Manter `AlertsSection` e `Próximos Eventos`
- Manter `AISummaryDrawer`

### Mudanças no `SocietyOverviewCard.tsx`
- Redesign para card premium: full-width, `border-l-4` com cor da sociedade, layout com 3 mini-stats (membros, saldo, pendências), fundo translúcido

