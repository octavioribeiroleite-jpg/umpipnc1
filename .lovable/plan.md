
# Nova pagina "Visitantes" com filtro por dia + menu lateral

## O que muda

O relatorio de visitantes sai da pagina de Configuracoes e ganha sua propria pagina dedicada (`/visitantes`), acessivel pelo menu lateral para Admin e Pastor. A nova pagina tera filtro por data para saber quantos visitantes tiveram em cada dia.

## 1. Nova pagina `src/pages/Visitantes.tsx`

Pagina dedicada com:
- **Filtro por data**: DatePicker para selecionar um dia especifico (padrao: hoje). Ao selecionar, filtra os registros daquele dia
- **Cards de resumo do dia**: Total de acessos, Membros, Visitantes (apenas do dia selecionado)
- **Secao "Visitantes recorrentes"**: mesma logica atual, agrupando por nome+dispositivo com contagem de visitas
- **Tabela de acessos do dia**: com colunas Nome, Sociedade, Hora, Status (Novo/Retornou)
- Protegida: so acessivel por Admin e Pastor (redireciona se nao tiver permissao)
- Usa `AppLayout` (para admin) ou `PastorLayout` (para pastor) dependendo do perfil

## 2. Adicionar rota no `src/App.tsx`

```text
<Route path="/visitantes" element={<Visitantes />} />
```

## 3. Adicionar item no menu lateral

**`src/components/layout/AppSidebar.tsx`** (admin):
- Adicionar `{ icon: Globe, label: 'Visitantes', path: '/visitantes' }` nos `adminMenuItems`

**`src/components/layout/MobileBottomNav.tsx`** (mobile admin):
- Adicionar item "Visitantes" nos `moreNavItems` para admin

**`src/components/pastor/PastorSidebar.tsx`** (pastor desktop):
- Adicionar `{ path: '/visitantes', label: 'Visitantes', icon: Globe }` nos `mainItems`

**`src/components/pastor/PastorMobileNav.tsx`** e **`src/components/pastor/PastorMobileHeader.tsx`** (pastor mobile):
- Adicionar item "Visitantes" na navegacao

## 4. Remover relatorio do `src/pages/Configuracoes.tsx`

- Remover todo o bloco do "Relatorio do Portal da Igreja" (linhas 628-786)
- Remover estados, interfaces e funcoes relacionadas (`portalVisitors`, `portalSocieties`, `portalLoading`, `onlyVisitors`, `fetchPortalVisitors`, `deviceFirstSeen`, `recurringVisitors`, `filteredVisitors`, `canSeePortalReport`, tipos `PortalVisitor`, `SocietyInfo`, `RecurringVisitor`)
- Remover imports nao mais usados (`Globe`, `Eye`, `RefreshCw`, `Switch`, `format`, `ptBR`)

## 5. Detalhes do filtro por dia

- DatePicker usando o componente `Calendar` do shadcn dentro de um `Popover`
- Estado `selectedDate` (padrao: hoje)
- Filtra `portalVisitors` por `created_at` do dia selecionado
- Cards de resumo refletem apenas o dia filtrado
- Tabela mostra apenas acessos do dia filtrado
- Secao de recorrentes permanece global (todas as datas)
- Botao "Hoje" para voltar rapidamente ao dia atual

## Arquivos criados
- `src/pages/Visitantes.tsx`

## Arquivos modificados
- `src/App.tsx` (nova rota)
- `src/components/layout/AppSidebar.tsx` (menu admin)
- `src/components/layout/MobileBottomNav.tsx` (menu mobile admin)
- `src/components/pastor/PastorSidebar.tsx` (menu pastor)
- `src/components/pastor/PastorMobileNav.tsx` (menu mobile pastor)
- `src/components/pastor/PastorMobileHeader.tsx` (header mobile pastor)
- `src/pages/Configuracoes.tsx` (remover relatorio)
