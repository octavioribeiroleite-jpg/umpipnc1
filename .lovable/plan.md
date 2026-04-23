
Usuário quer reformular navegação:

**Mobile (< lg):** Barra inferior fixa (bottom nav) com itens principais + botão "Mais" que abre popup/sheet com itens secundários. Barra não se move ao rolar.

**Desktop (≥ lg):** Sidebar lateral fixa (sticky, não rola com a página). Conteúdo da página rola independente. Se a sidebar tiver muitos itens e estourar a altura, ela mesma rola internamente com indicadores visuais (botões/setas) mostrando que há mais conteúdo.

## Escopo

Aplicar nos 3 layouts existentes:
1. **AppLayout** (Diretoria) — `AppSidebar` + `MobileHeader`
2. **PastorLayout** — `PastorSidebar` + `PastorMobileHeader` (já tem `PastorMobileNav` parcial)
3. **MembroLayout** — só sheet hoje, ganha bottom nav

## Mobile: Bottom Nav fixa

Novo componente `BottomNav` (por contexto: Diretoria, Pastor, Membro):

- Posição: `fixed bottom-0 left-0 right-0 z-50` + `safe-bottom` (padding pra notch)
- Background: `bg-card/95 backdrop-blur-md border-t`
- Layout: 5 slots — 4 itens principais + botão **"Mais"**
- Item ativo: cor `text-primary`, ícone preenchido, label visível
- Item inativo: `text-muted-foreground`, ícone outline
- Altura: `h-16` + safe area
- Botão "Mais" abre `Sheet` (side="bottom") com grid de ícones dos itens secundários

**Itens principais por contexto:**
- Diretoria: Home, Reuniões, Calendário, Tarefas, **Mais**
- Pastor: Visão Geral, Calendário, Comunicados, Sociedades, **Mais**
- Membro: Início, Eventos, Pagamentos, Comunicados, **Mais** (já tem 5 abas, vira bottom nav direto)

**Mais (sheet)** — ícones em grid 4 colunas:
- Diretoria: Finanças, Plenárias, Dízimos, Comunicados, Estudos, Secretaria, Aniversariantes, Arquivos + (admin) Eleições, Visitantes, Usuários, Sugestões + Configurações + Sair
- Pastor: Sugestões, Eleições, Dízimos, Visitantes + Sair

**Header mobile:** mantém só logo + título + botão instalar. Remove menu hambúrguer (substituído pela bottom nav). Header também `fixed top-0`.

**Padding do conteúdo:** `pt-14 pb-20` (espaço pro header + bottom nav).

## Desktop: Sidebar fixa com scroll inteligente

Já é `sticky top-0 h-screen` — bom. Melhorias:

- Container interno: `flex flex-col h-full`
- Header da sidebar: `flex-shrink-0`
- Nav: `flex-1 overflow-y-auto` com **scroll detector**
- Footer (Sair + BuildStamp): `flex-shrink-0`

**Indicadores de scroll:** quando o nav tem overflow:
- Botão flutuante no topo do nav (seta ↑) aparece quando `scrollTop > 0`
- Botão flutuante no fim do nav (seta ↓) aparece quando há conteúdo abaixo
- Clicar no botão rola suavemente (`scrollBy({ top: 200, behavior: 'smooth' })`)
- Gradient fade nas bordas pra sinalizar continuação

Hook simples `useScrollIndicators(ref)` retorna `{ canScrollUp, canScrollDown, scrollUp, scrollDown }`.

**Conteúdo da página:** já rola independente (sidebar é sticky). Manter.

## Arquivos

**Criar:**
- `src/components/layout/BottomNav.tsx` — componente genérico recebe `mainItems`, `moreItems`, contexto
- `src/components/layout/MoreSheet.tsx` — sheet bottom com grid de ícones (ou inline no BottomNav)
- `src/hooks/useScrollIndicators.ts` — detecta overflow + scrollTop/scrollHeight

**Editar:**
- `src/components/layout/AppLayout.tsx` — usar BottomNav mobile, ajustar paddings
- `src/components/layout/AppSidebar.tsx` — adicionar scroll indicators, garantir sticky
- `src/components/layout/MobileHeader.tsx` — simplificar (remover hambúrguer, manter logo + install)
- `src/components/pastor/PastorLayout.tsx` — usar BottomNav
- `src/components/pastor/PastorSidebar.tsx` — scroll indicators
- `src/components/pastor/PastorMobileHeader.tsx` — simplificar (remover menu)
- `src/components/pastor/PastorMobileNav.tsx` — substituir pelo BottomNav genérico ou refatorar
- `src/components/membro/MembroLayout.tsx` — adicionar BottomNav (substitui menu sheet atual ou complementa)

## Comportamento

- Bottom nav **nunca** se move (fixed)
- Sidebar desktop **nunca** rola junto com a página (sticky h-screen)
- Sidebar **rola internamente** se tiver muitos itens, com indicadores visíveis
- Botão "Sair" e BuildStamp sempre visíveis no fim da sidebar (não rolam com nav)
- Bottom nav respeita safe-area-inset-bottom (iPhone)

## Resultado

Navegação mobile mais natural (estilo apps nativos) com bottom nav fixa. Desktop com sidebar verdadeiramente fixa e indicadores claros quando há mais itens fora da viewport.
