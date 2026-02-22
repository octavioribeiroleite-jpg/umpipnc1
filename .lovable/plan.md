
# Mover Dizimos para pagina propria (mantendo formato atual)

## Resumo

Mover a aba "Dizimos" de dentro da pagina Financas para uma pagina independente em `/dizimos`, mantendo exatamente o mesmo componente `DizimosTab` sem alteracoes visuais. A pagina sera acessivel apenas para admin e pastor, com item de menu nos dois paineis.

## Mudancas

### 1. Nova pagina `src/pages/Dizimos.tsx`
- Usa `AppLayout` para admin ou `PastorLayout` para pastor
- Renderiza `PageHeader` com titulo "Dizimos e Ofertas" + `DizimosTab` (mesmo componente, sem mudancas)
- Protege acesso: so admin ou pastor

### 2. Remover aba Dizimos de `src/pages/Financas.tsx`
- Remover import de `DizimosTab`
- Remover `<SelectItem value="dizimos">` (mobile)
- Remover `<TabsTrigger value="dizimos">` (desktop)
- Remover `<TabsContent value="dizimos">` com `<DizimosTab />`

### 3. Adicionar rota em `src/App.tsx`
- `<Route path="/dizimos" element={<Dizimos />} />`

### 4. Menu da diretoria (admin only)
- `AppSidebar.tsx`: adicionar `{ icon: Heart, label: 'Dizimos', path: '/dizimos' }` em `adminMenuItems`
- `MobileHeader.tsx`: adicionar nos `adminItems`
- `MobileBottomNav.tsx`: adicionar nos `moreNavItems` condicional `isAdmin`

### 5. Menu do pastor
- `PastorSidebar.tsx`: adicionar item `/dizimos` com icone `Heart`
- `PastorMobileHeader.tsx`: adicionar nos `navItems`
- `PastorMobileNav.tsx`: adicionar nos items de navegacao

### 6. Sem alteracoes
- `DizimosTab.tsx` permanece identico
- `MembroDizimos.tsx` (visao do membro no portal) permanece identico
