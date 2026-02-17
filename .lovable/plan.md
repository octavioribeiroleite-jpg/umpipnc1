
# Plano: Sociedades no Login e Usuarios Agrupados

## O que vai mudar

### 1. Limpeza de usuarios
- Desativar todos os usuarios existentes exceto o admin (Octavio) e o pastor (Ronne)
- Os usuarios Daniel, Danielly, Davi, Emilly, tdavi0015 e TESTE serao removidos/desativados

### 2. Tela de Login com seletor de Sociedade
A tela de login tera um campo "Sociedade" antes do usuario e senha. O fluxo sera:

```text
+----------------------------------+
|        [Logo Renovo IPNC]        |
|          Bem-vindo               |
|                                  |
|   Sociedade:                     |
|   [ Selecione sua sociedade  v]  |
|     UMP / SAF / UPH / UPA / UCP |
|                                  |
|   Usuario:                       |
|   [ seu usuario              ]   |
|                                  |
|   Senha:                         |
|   [ ********                 ]   |
|                                  |
|   [        Entrar            ]   |
+----------------------------------+
```

- A sociedade selecionada no login sera salva no contexto do usuario (AuthContext)
- Admin e Pastor nao precisam selecionar sociedade (terao acesso global)
- A sociedade escolhida define qual ambiente de dados o usuario vera ao entrar

### 3. Pagina de Usuarios com abas por sociedade
Na tela de gestao de usuarios, os membros aparecerao agrupados em abas coloridas:

```text
+------------------------------------------+
| Gestao de Usuarios          [+ Novo]     |
+------------------------------------------+
| [UMP] [SAF] [UPH] [UPA] [UCP] [Geral]  |
+------------------------------------------+
| Nome    | Usuario | Senha | Cargo | Acoes|
|---------|---------|-------|-------|------|
| Fulano  | fulano  | ****  | Dir.  | E X  |
+------------------------------------------+
```

- Cada aba mostra apenas usuarios daquela sociedade
- Aba "Geral" mostra admin e pastor (sem sociedade vinculada)
- Ao criar usuario, o admin seleciona a sociedade

### 4. Formulario de Criar Usuario atualizado
Novo campo "Sociedade" no dialogo de criacao:
- Aparece antes do campo "Cargo"
- Dropdown com UMP, SAF, UPH, UPA, UCP
- Obrigatorio para cargos "diretoria" e "visualizador"
- Opcional para admin e pastor

---

## Detalhes Tecnicos

### Banco de Dados
- Adicionar coluna `society_id` (uuid, nullable, FK para `societies.id`) na tabela `profiles`

### Edge Function `create-user`
- Aceitar campo `society_id` no body
- Salvar no perfil do usuario apos criacao

### AuthContext
- Armazenar `society_id` e `society` (dados da sociedade) no contexto
- Buscar a sociedade do perfil ao carregar dados do usuario
- Para admin/pastor: society_id sera null (acesso global)

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Adicionar `society_id` em `profiles` |
| `supabase/functions/create-user/index.ts` | Aceitar e salvar `society_id` |
| `src/pages/Auth.tsx` | Seletor de sociedade no login |
| `src/contexts/AuthContext.tsx` | Armazenar sociedade no contexto |
| `src/pages/Usuarios.tsx` | Abas por sociedade + campo sociedade no criar/editar |

### Ordem de execucao
1. Desativar usuarios (exceto admin e pastor)
2. Migracao: adicionar `society_id` em `profiles`
3. Atualizar edge function `create-user`
4. Atualizar tela de login com seletor
5. Atualizar AuthContext com dados da sociedade
6. Redesenhar pagina de Usuarios com abas
