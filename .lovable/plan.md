
# Criar Login Automaticamente ao Cadastrar Membro

## Resumo

Quando a diretoria cadastrar um novo membro na aba "Membros" (Financas), o sistema vai automaticamente criar uma conta de login para esse membro com credenciais geradas a partir do nome.

**Exemplo:**
- Nome: "João Silva"
- Usuario: `joaosilva`
- Senha: `JoaoSilva123`

O membro ja tera acesso ao portal simplificado (/membro) imediatamente apos o cadastro.

---

## Como vai funcionar

1. A diretoria clica em "Novo Membro" na aba de Membros (area financeira)
2. Preenche o nome, telefone e email como hoje
3. Ao salvar, o sistema:
   - Cria o registro na tabela `members`
   - Chama a edge function `create-user` para criar a conta de login
   - Vincula o `user_id` gerado ao registro do membro
4. O login e senha gerados aparecem na tela para a diretoria repassar ao membro
5. O membro pode usar essas credenciais para acessar o portal

---

## Detalhes Tecnicos

### 1. Atualizar a edge function `create-user`

Permitir que usuarios com role `diretoria` (alem de `admin`) possam criar usuarios com role `visualizador`. A verificacao muda de "somente admin" para "admin ou diretoria criando visualizador":

- Admin: pode criar qualquer role
- Diretoria: pode criar apenas `visualizador`

Tambem retornar o `user_id` na resposta (ja retorna) e aceitar um campo `member_id` para vincular automaticamente ao registro do membro.

### 2. Atualizar `MembrosTab.tsx`

Apos inserir o membro na tabela `members`, chamar a edge function `create-user` com:

```text
full_name: "Joao Silva"
username: "joaosilva" (nome sem espacos, lowercase, sem acentos)
password: "JoaoSilva123" (nome com primeira letra maiuscula de cada palavra + "123")
role: "visualizador"
society_id: society_id do profile da diretoria
member_id: id do membro recem-criado
```

Apos a criacao bem-sucedida:
- Atualizar `members.user_id` com o user_id retornado
- Exibir um dialog/toast mostrando as credenciais geradas para a diretoria copiar

### 3. Gerar credenciais a partir do nome

Funcao utilitaria para gerar username e senha:

```text
Nome: "João da Silva"
Username: "joaodasilva" (remove acentos, remove espacos, lowercase)
Senha: "JoãoDaSilva123" (capitaliza cada palavra + "123")
```

Se o username ja existir (usuario duplicado), adicionar um numero: "joaodasilva2".

### 4. Dialog de credenciais geradas

Apos criar o membro, exibir um dialog com:
- Nome do membro
- Usuario gerado
- Senha gerada
- Botao para copiar as credenciais
- Aviso: "Repasse essas credenciais ao membro para que ele acesse o portal"

### 5. Indicador visual na tabela de membros

Adicionar uma coluna ou icone na tabela de membros mostrando se o membro tem login vinculado (se `user_id` esta preenchido). Isso ajuda a diretoria saber quem ja tem acesso.

---

## Arquivos Modificados

- `supabase/functions/create-user/index.ts` - Permitir diretoria criar visualizador + vincular member_id
- `src/components/financas/MembrosTab.tsx` - Chamar create-user ao cadastrar membro + dialog de credenciais
