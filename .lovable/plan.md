

# Reestruturar Pagina de Usuarios com Cards de Diretoria e Membros

## Visao Geral

Reorganizar a pagina `/usuarios` em duas secoes distintas:

1. **Card "Diretoria"** -- Usuarios com cargo `diretoria`, organizados por sociedade (abas)
2. **Card "Membros"** -- Todos os membros cadastrados (tabela `members`) de TODAS as sociedades, com gerenciamento de login e senha

## Estrutura da Nova Pagina

```text
+------------------------------------------+
|  Gestao de Usuarios       [+ Novo Usuario]|
+------------------------------------------+
|                                          |
|  CARD: Diretoria                         |
|  [UMP] [SAF] [UPH] [UPA] [UCP] [Geral]  |
|  Tabela/cards com usuarios diretoria     |
|  (copiar creds, resetar, editar, excluir)|
|                                          |
+------------------------------------------+
|                                          |
|  CARD: Membros     [Criar Logins] [+ Novo]|
|  Filtro por sociedade (select)           |
|  Tabela com TODOS os membros             |
|  Colunas: Nome | Sociedade | Login |     |
|           Senha | Status | Acoes         |
|  Acoes: copiar creds, resetar senha,     |
|         editar, ativar/desativar, excluir |
|                                          |
+------------------------------------------+
```

## Detalhes Tecnicos

### Card Diretoria
- Filtrar `activeUsers` onde `role === 'diretoria' || role === 'admin' || role === 'pastor'`
- Manter organizacao por abas de sociedade (desktop) e select (mobile)
- Manter funcionalidades existentes: copiar credenciais, resetar senha, editar, excluir

### Card Membros
- Buscar dados da tabela `members` (todos, sem filtro de sociedade para admin)
- Buscar tambem `profiles` vinculados via `user_id` para exibir login/senha
- Adicionar coluna "Sociedade" com badge colorida mostrando o nome da sociedade
- Filtro opcional por sociedade via select dropdown
- Mostrar login e senha (do profile vinculado) com toggle de visibilidade
- Botoes de acao:
  - Copiar credenciais (login/senha do profile vinculado)
  - Resetar senha (invoca edge function `update-user-password`)
  - Criar login individual (para membros sem `user_id`, usando `create-user`)
  - Editar dados do membro
  - Ativar/Desativar
  - Excluir
- Integrar `BulkLoginDialog` existente para criacao em massa
- Buscar nomes das sociedades para exibir badges coloridas

### Dados necessarios para a secao Membros
- `members` (todas as sociedades) -- admin ve tudo via RLS
- `profiles` -- para obter `username` e `plain_password` dos membros com `user_id`
- `societies` -- para exibir nome/cor da sociedade de cada membro

### Mudancas no arquivo `src/pages/Usuarios.tsx`
1. Adicionar estado para membros (`members[]`) e fetch dedicado
2. Adicionar estado para filtro de sociedade dos membros
3. Criar secao "Diretoria" com usuarios filtrados por role
4. Criar secao "Membros" com tabela de todos os membros, incluindo sociedade e credenciais
5. Integrar `BulkLoginDialog` na secao de membros
6. Adicionar funcoes de resetar senha e criar login individual para membros
7. Remover duplicacao com `MembrosTab` (centralizar tudo na pagina de Usuarios)

### Mobile
- Card Diretoria: select de sociedade + cards compactos (igual hoje)
- Card Membros: select de sociedade (filtro opcional) + cards compactos com acoes de login

