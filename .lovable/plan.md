

# Separar Acesso da Secretaria EBD em Dois Perfis

## Resumo

Criar dois perfis de acesso na Secretaria EBD com permissões diferentes:

- **Admsecretaria** (login: `admsecretaria`, senha: `Admnsecretaria123`) — acesso completo: Chamada, Histórico e Turmas (gestão de alunos)
- **Professor EBD** (login: `professorebd`, senha: `professor123`) — acesso limitado: apenas Chamada e Histórico

## Implementação

### 1. Armazenar credenciais no banco (tabela `settings`)
Inserir duas novas chaves na tabela `settings`:
- `secretaria_admin_password` = `Admnsecretaria123`
- `secretaria_professor_password` = `professor123`

Atualizar a política de RLS da tabela `settings` para incluir essas chaves no acesso anônimo.

### 2. Atualizar tela de login (`Secretaria.tsx`)
- Trocar o campo de senha único por dois campos: **usuário** e **senha**
- Validar contra as credenciais armazenadas
- Armazenar o nível de acesso (`admin` ou `professor`) no estado
- Mostrar o perfil logado no header ("Admsecretaria" ou "Professor")

### 3. Controlar visibilidade das abas
- **Admin**: vê Chamada, Histórico e Turmas
- **Professor**: vê apenas Chamada e Histórico (aba Turmas oculta)

### Arquivos modificados
- `src/pages/Secretaria.tsx` — tela de login com usuário/senha + controle de abas
- Inserção de dados na tabela `settings` (novas credenciais)
- Atualização da política RLS de `settings` para expor as novas chaves ao anon

