

# Criar Login em Massa para Membros Cadastrados

## Situacao Atual

Existem **18 membros ativos da UMP** sem conta de acesso no sistema. Todos precisam receber credenciais (usuario + senha) com o papel "visualizador" para acessar o portal do membro.

## O que sera feito

Adicionar um botao "Criar logins em massa" na aba de Membros (Financas) que processa todos os membros sem conta de uma vez, gerando credenciais automaticamente e exibindo um relatorio consolidado ao final.

## Logica de credenciais (ja existente no sistema)

- **Usuario**: nome sem acentos, tudo junto e minusculo (ex: "Lucas Felix" -> "lucasfelix")
- **Senha**: nome capitalizado + "123" (ex: "Lucas Felix" -> "LucasFelix123")

## Alteracoes

### Modificar: `src/components/financas/MembrosTab.tsx`

1. **Novo botao "Criar logins em massa"**
   - Aparece apenas quando ha membros sem conta (`user_id IS NULL`)
   - Mostra badge com quantidade de membros pendentes
   - Abre dialogo de confirmacao antes de processar

2. **Dialogo de confirmacao**
   - Lista quantos membros serao processados
   - Botao "Confirmar" inicia o processamento

3. **Processamento em lote**
   - Para cada membro sem `user_id`, chama a Edge Function `create-user` sequencialmente
   - Gera username e password usando as funcoes `generateUsername` e `generatePassword` ja existentes
   - Envia: `{ full_name, username, password, role: 'visualizador', society_id, member_id }`
   - Mostra progresso (ex: "Processando 5 de 18...")
   - Coleta sucessos e falhas separadamente

4. **Relatorio final**
   - Dialogo com tabela de credenciais geradas (nome, usuario, senha)
   - Indicacao visual de falhas (se houver)
   - Botao para copiar todas as credenciais em formato texto
   - Recarrega a lista de membros ao fechar

## Detalhes Tecnicos

### Fluxo do processamento
- Usa `for...of` sequencial (nao paralelo) para evitar sobrecarga na Edge Function
- Cada chamada: `supabase.functions.invoke('create-user', { body: { full_name, username, password, role: 'visualizador', society_id, member_id } })`
- Timeout de seguranca por membro
- Estado de progresso atualizado a cada iteracao

### Tratamento de erros
- Usernames duplicados: se o username ja existir, adiciona um sufixo numerico (ex: "lucasfelix2")
- Falha individual nao interrompe o lote; membro e marcado como "falha" no relatorio
- Toast de resumo ao final: "X contas criadas, Y falhas"

### Copiar credenciais
- Formato texto: "Nome | Usuario | Senha" por linha
- Usa `navigator.clipboard.writeText()`

