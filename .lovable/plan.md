
# Adicionar Edicao de Nome na Gestao de Usuarios

## Objetivo
Permitir que o admin altere o nome completo e o username de um usuario, alem da senha que ja existe.

## Mudancas

### 1. Edge Function `update-user-password/index.ts`
- Aceitar campos opcionais `new_full_name` e `new_username` no body, alem de `new_password`
- Quando receber `new_full_name` ou `new_username`, atualizar na tabela `profiles`
- Quando receber `new_username`, tambem atualizar o email no auth (`username@ipnc.local`) e o `user_metadata`
- Pelo menos um dos tres campos deve ser enviado
- Renomear a function nao e necessario, podemos reutilizar a mesma

### 2. `src/pages/Usuarios.tsx`
- Transformar o dialog de "Alterar Senha" em "Editar Usuario"
- Adicionar campos de nome completo e username no dialog, pre-preenchidos com os valores atuais
- Senha continua opcional (so altera se preenchida)
- Atualizar o botao e icone na tabela (trocar icone de chave por icone de edicao como `Pencil`)
- Atualizar a funcao `handleChangePassword` para enviar os novos campos

## Detalhes tecnicos

### Edge Function - campos do body:
```
{
  user_id: string (obrigatorio),
  new_password?: string,
  new_full_name?: string,
  new_username?: string
}
```

A function vai:
1. Validar que pelo menos um campo de alteracao foi enviado
2. Se `new_password`: atualizar auth password + `profiles.plain_password`
3. Se `new_full_name`: atualizar `profiles.full_name` + `auth.user_metadata.full_name`
4. Se `new_username`: atualizar `profiles.username` + email no auth para `newusername@ipnc.local` + `auth.user_metadata.username`

### Frontend - Dialog de edicao:
- Campo "Nome completo" (pre-preenchido)
- Campo "Usuario (login)" (pre-preenchido)
- Campo "Nova senha" (vazio, opcional - so altera se preenchido)
- Botao "Salvar"
