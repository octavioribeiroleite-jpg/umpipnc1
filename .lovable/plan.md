
# Separar Membros na Pagina de Usuarios + Melhorias de Credenciais

## Resumo
Mover a gestao de membros (cadastro + login) da aba Financas para a pagina de Usuarios, onde o admin tera visao completa de todos os usuarios do sistema (diretoria e membros). Adicionar botoes de copiar credenciais individuais e em massa, e funcionalidade de resetar senha.

## Alteracoes

### 1. Pagina de Usuarios (`src/pages/Usuarios.tsx`)

**Incluir membros na listagem:**
- A pagina ja lista usuarios com role (admin, diretoria, pastor, visualizador). Os membros com role "visualizador" ja aparecem ali. A mudanca principal sera:
  - Adicionar botao **"Copiar login"** (icone Copy) em cada usuario, que copia "Login: xxx / Senha: xxx" para a area de transferencia
  - Adicionar botao **"Copiar todos"** no topo, que copia credenciais de todos os membros (visualizadores) da sociedade selecionada
  - Adicionar botao **"Resetar senha"** que gera uma nova senha aleatoria (6 caracteres alfanumericos) e atualiza via Edge Function `update-user-password`, exibindo a nova senha num dialogo com opcao de copiar
  - O dialogo de criar usuario continua funcionando normalmente para criar membros com role visualizador

**Novo layout dos cards mobile:**
- Adicionar icone de Copy ao lado da senha
- Botao "Resetar" com icone RefreshCw

**Novo layout da tabela desktop:**
- Coluna extra com botao de copiar credenciais
- Botao "Resetar senha" no menu de acoes

### 2. Remover aba Membros do Financas (`src/pages/Financas.tsx`)

- Remover o import de `MembrosTab` e o `TabsTrigger`/`TabsContent` de "membros"
- Os membros continuam cadastrados na tabela `members` e vinculados via `user_id`, mas a gestao de login/senha fica centralizada em Usuarios

### 3. Botao "Copiar todos os logins" 

- Aparece no header da pagina de Usuarios
- Copia no formato:
```text
Nome | Login | Senha
Joao Silva | joaosilva | JoaoSilva123
Maria Santos | mariasantos | MariaSantos123
```
- Filtra apenas usuarios com `plain_password` preenchido da sociedade ativa

### 4. Resetar senha

- Botao por usuario que gera senha aleatoria (6 chars: letras + numeros)
- Chama `update-user-password` com `{ user_id, new_password }`
- Atualiza `plain_password` no profile
- Exibe dialogo com a nova senha e botao de copiar

## Arquivos Modificados

- `src/pages/Usuarios.tsx` - Adicionar botoes de copiar e resetar senha
- `src/pages/Financas.tsx` - Remover aba "Membros"
- Nenhum arquivo novo necessario; nenhuma alteracao no banco de dados

## Detalhes Tecnicos

### Copiar credenciais individual
```text
const copyCredentials = (user) => {
  const text = `Login: ${user.username}\nSenha: ${user.plain_password || '---'}`;
  navigator.clipboard.writeText(text);
  toast.success('Credenciais copiadas!');
};
```

### Copiar todos (filtrado por sociedade)
```text
const copyAll = () => {
  const filtered = activeUsers
    .filter(u => u.society_id === currentSocietyId && u.plain_password)
    .map(u => `${u.full_name} | ${u.username} | ${u.plain_password}`)
    .join('\n');
  navigator.clipboard.writeText(`Nome | Login | Senha\n${filtered}`);
  toast.success('Todos os logins copiados!');
};
```

### Resetar senha
```text
const resetPassword = async (userId) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const newPass = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  await supabase.functions.invoke('update-user-password', {
    body: { user_id: userId, new_password: newPass }
  });
  // Exibir dialogo com nova senha
};
```

### Sobre a aba Membros em Financas
- A aba "Membros" sera removida de Financas pois a gestao de cadastro e credenciais ficara toda em Usuarios
- O cadastro de membros na tabela `members` (nome, telefone, email) permanece inalterado e continua sendo referenciado pelas cobrancas
- Para adicionar novos membros, o admin usara o botao "Novo Usuario" na pagina de Usuarios, que ja cria o profile + role + vinculacao com member
