

# Restringir Eleições para Admin/Pastor e ajustar Dashboard da Diretoria

## O que muda

O item "Eleições" sai do menu geral (acessível a toda diretoria) e passa a ser exclusivo para Admin e Pastor. A página de Eleições também ganha proteção de acesso.

## 1. Mover "Eleições" para menus restritos

### `src/components/layout/AppSidebar.tsx`
- Remover `{ icon: Vote, label: 'Eleições', path: '/eleicoes' }` do array `menuItems` (geral)
- Adicionar ao array `adminMenuItems` (já restrito a `isAdmin`)

### `src/components/layout/MobileHeader.tsx`
- Remover `{ to: '/eleicoes', icon: Vote, label: 'Eleições' }` do array `navItems` (geral)
- Adicionar ao array `adminItems` (já restrito a `isAdmin`)

### `src/components/layout/MobileBottomNav.tsx`
- Mover `{ to: '/eleicoes', icon: Vote, label: 'Eleições' }` de `moreNavItems` (seção geral) para dentro do bloco condicional `isAdmin`

### `src/components/pastor/PastorSidebar.tsx`
- Adicionar `{ path: '/eleicoes', label: 'Eleições', icon: Vote }` aos itens do menu do pastor

### `src/components/pastor/PastorMobileNav.tsx` e `PastorMobileHeader.tsx`
- Adicionar item "Eleições" na navegação mobile do pastor

## 2. Proteger a página de Eleições

### `src/pages/Eleicoes.tsx`
- Importar `isAdmin` e `isPastor` do `useAuth()`
- Adicionar verificação: se o usuário não é admin nem pastor, redirecionar para `/` (ou mostrar mensagem de acesso negado)

## 3. Ajustar descrição do Dashboard

### `src/pages/Index.tsx`
- Alterar a descrição do `PageHeader` de "Visão geral do painel da Diretoria de Jovens" para algo mais genérico ou condicional, já que admins e diretoria veem o mesmo dashboard

## Arquivos modificados
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileHeader.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/pastor/PastorSidebar.tsx`
- `src/components/pastor/PastorMobileNav.tsx`
- `src/components/pastor/PastorMobileHeader.tsx`
- `src/pages/Eleicoes.tsx`

