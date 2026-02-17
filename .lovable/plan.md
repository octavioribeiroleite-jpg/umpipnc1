
# Login por Usuario e Senha (sem email)

## Resumo

Trocar o sistema de login de email para **usuario e senha**. O admin cria as contas definindo um nome de usuario (ex: "Davi") e uma senha (ex: "Davi123"). Na pagina de Usuarios, o admin consegue ver e alterar a senha de cada membro.

## Como funciona

Como o sistema de autenticacao exige um email por tras, vamos usar um email ficticio automatico (ex: `davi@ipnc.local`) que fica invisivel para todos. O usuario so ve e usa o **nome de usuario** e a **senha**.

## O que muda

### 1. Tela de Login (Auth.tsx)
- Trocar campo "Email" por campo "Usuario"
- Manter campo "Senha"
- Remover aba "Cadastrar"
- Remover "Esqueci minha senha" (admin reseta a senha pelo painel)
- Por tras, converte o usuario digitado para email ficticio (ex: `davi@ipnc.local`)

### 2. Banco de Dados
- Adicionar coluna `username` na tabela `profiles` (texto unico, obrigatorio)
- Adicionar coluna `plain_password` na tabela `profiles` (texto, para o admin poder ver/alterar)
- Atualizar o trigger `handle_new_user` para aceitar o username

### 3. Funcao Backend (create-user)
- Recebe: nome completo, usuario, senha e cargo
- Cria o email ficticio automaticamente (`usuario@ipnc.local`)
- Cria a conta no sistema de autenticacao
- Salva o username e a senha na tabela de perfis
- Atribui o cargo escolhido

### 4. Funcao Backend (update-user-password)
- Recebe: user_id e nova senha
- Atualiza a senha no sistema de autenticacao
- Atualiza a senha salva na tabela de perfis
- Apenas admins podem usar

### 5. Pagina de Usuarios (Usuarios.tsx)
- Adicionar botao "Novo Usuario" com dialog para criar: nome, usuario, senha, cargo
- Mostrar coluna "Usuario" e "Senha" na tabela de usuarios ativos
- Botao para alterar a senha de cada usuario
- Remover coluna "Email" (nao e mais relevante)
- Remover secao "Aguardando Aprovacao"

### 6. Contexto de Auth (AuthContext.tsx)
- Remover funcao `signUp`
- Ajustar `signIn` para receber username ao inves de email (converte para email ficticio)
- Remover `isPendingApproval`

### 7. Rotas (App.tsx)
- Remover rota `/aguardando-permissao`
- Remover import da pagina AguardandoPermissao

## Fluxo

```text
Admin abre Usuarios
       |
  Clica "Novo Usuario"
       |
  Preenche: Nome, Usuario, Senha, Cargo
       |
  Sistema cria conta com email ficticio
       |
  Admin informa usuario/senha ao membro
       |
  Membro abre o app e digita usuario + senha
       |
  Sistema converte para email ficticio e autentica
```

## Arquivos modificados
- `src/pages/Auth.tsx` -- login por usuario
- `src/pages/Usuarios.tsx` -- criar usuario, ver/alterar senhas
- `src/contexts/AuthContext.tsx` -- remover signUp, ajustar signIn
- `src/App.tsx` -- remover rota aguardando permissao
- `supabase/functions/create-user/index.ts` -- nova funcao para criar usuario
- `supabase/functions/update-user-password/index.ts` -- nova funcao para alterar senha
- Migracao SQL -- adicionar colunas username e plain_password na tabela profiles
