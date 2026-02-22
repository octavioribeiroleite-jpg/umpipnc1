
# Corrigir Rotas de Sugestoes em Todo o App

## Problema
Quatro componentes de navegacao ainda usam `/pastor-sugestoes` ao inves de `/sugestoes`. Quando um admin clica em "Sugestoes do Pastor" no menu, ele e direcionado para uma rota que pode causar conflito com o layout do pastor.

## Revisao Completa Realizada

Verifiquei **todos** os arquivos de navegacao e paginas do app. O problema esta **limitado a rota de sugestoes** - as demais paginas nao tem esse tipo de conflito porque:

- Paginas do painel do pastor (`/pastor`, `/pastor/calendario`, `/pastor/comunicados`, `/pastor/sociedade/:slug`) usam `PastorLayout` que permite acesso para pastor E admin. Elas so sao acessadas pela navegacao interna do painel do pastor (PastorSidebar, PastorMobileNav, PastorMobileHeader), nunca pelo menu principal.
- Paginas comuns (`/reunioes`, `/tarefas`, `/calendario`, etc.) usam `AppLayout` sem restricao de role.
- `/usuarios` usa `Navigate to="/"` para nao-admins - correto.
- `/membro` redireciona para `/auth` se nao logado - correto.

## 4 Alteracoes Necessarias (apenas strings de rota)

### 1. `src/components/layout/AppSidebar.tsx` (linha 37)
Trocar `path: '/pastor-sugestoes'` para `path: '/sugestoes'`

### 2. `src/components/layout/MobileHeader.tsx` (linha 45)
Trocar `to: '/pastor-sugestoes'` para `to: '/sugestoes'`

### 3. `src/components/layout/MobileBottomNav.tsx` (linha 33)
Trocar `to: '/pastor-sugestoes'` para `to: '/sugestoes'`

### 4. `src/components/pastor/PastorLoginNotification.tsx` (linha 64)
Trocar `navigate('/pastor-sugestoes')` para `navigate('/sugestoes')`

## O que NAO precisa mudar

- **PastorSidebar, PastorMobileHeader, PastorMobileNav**: Usam `/pastor/sugestoes` corretamente (rota interna do painel do pastor, que ja tem o layout adaptativo)
- **PastorNotificationBanner**: Ja foi corrigido no ultimo commit para usar `/sugestoes`
- **App.tsx**: Ja tem as 3 rotas registradas (`/pastor/sugestoes`, `/pastor-sugestoes`, `/sugestoes`)
- **PastorSugestoes.tsx**: Ja tem layout adaptativo (PastorLayout para pastor, AppLayout para admin)

## Resultado
Nenhum link do menu principal (sidebar, header mobile, bottom nav) apontara mais para `/pastor-sugestoes`. Todos usarao `/sugestoes`, que renderiza com o layout correto conforme o papel do usuario.
