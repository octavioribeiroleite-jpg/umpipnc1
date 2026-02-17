

# Layout Compacto em Todo o App

## Objetivo
Aplicar o mesmo padrao compacto do Dashboard (Index.tsx) em todas as paginas do app, reduzindo tamanhos, paddings e espacamentos no mobile enquanto mantendo o desktop confortavel.

## O que muda

### 1. Financas.tsx - StatCards
- CardContent: `pt-6` -> `p-3 md:pt-6`
- Icone container: `h-12 w-12` -> `h-7 w-7 md:h-9 md:w-9`
- Icone: `h-6 w-6` -> `h-4 w-4 md:h-5 md:w-5`
- Texto valor: `text-2xl` -> `text-lg md:text-2xl`
- Texto titulo: `text-sm` -> `text-xs md:text-sm`
- Icone wrapper: `rounded-xl` -> `rounded-lg`
- Grid stats: `gap-4` -> `gap-2 md:gap-4`

### 2. PageHeader.tsx (afeta todas as paginas)
- Margin bottom: `mb-6` -> `mb-4 md:mb-6`
- Titulo: `text-2xl lg:text-3xl` -> `text-xl md:text-2xl lg:text-3xl`

### 3. AppLayout.tsx
- Mobile padding: `px-4` -> `px-3`
- Desktop container padding: `py-6` -> `py-4 md:py-6`

### 4. Calendario.tsx
- Grid gap: `gap-6` -> `gap-4 md:gap-6`
- Celulas do calendario: `min-h-[80px]` -> `min-h-[60px] md:min-h-[80px]`

### 5. Configuracoes.tsx
- Espacamento entre cards: `space-y-6` -> `space-y-4 md:space-y-6`
- CardHeader icons: manter tamanho mas reduzir padding

### 6. Usuarios.tsx
- Espacamento entre secoes: `space-y-6` -> `space-y-4 md:space-y-6`

### 7. Reunioes.tsx
- Lista spacing: `space-y-4` -> `space-y-3 md:space-y-4`

### 8. Arquivos.tsx
- Grid gap: `gap-4` -> `gap-3 md:gap-4`

## Arquivos modificados
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/pages/Financas.tsx`
- `src/pages/Calendario.tsx`
- `src/pages/Configuracoes.tsx`
- `src/pages/Usuarios.tsx`
- `src/pages/Reunioes.tsx`
- `src/pages/Arquivos.tsx`
- `src/pages/Index.tsx` (ajustes menores de consistencia)

