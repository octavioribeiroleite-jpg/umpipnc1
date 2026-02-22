

# Melhorias na Pagina de Sugestoes do Pastor

## Problemas Identificados

1. **Cards muito grandes** - Icone de 36px (`h-9 w-9`) e padding de `p-4` fazem cada sugestao ocupar muito espaco vertical no mobile
2. **Sem identificacao do remetente** - Nao mostra quem enviou a sugestao (apenas o `created_by` UUID esta salvo, sem resolver para nome)
3. **Sugestoes lidas sem opcao de responder** - Na secao "Lidas", nao ha botao para responder tardiamente
4. **Sem opcao de excluir** - Sugestoes antigas nao podem ser removidas
5. **Subtitulo "0 sugestoes nao lidas"** - Poderia mostrar algo mais positivo como "Tudo em dia"
6. **Botoes "Lido" e "Responder" empilhados** - Ocupam espaco demais no mobile, poderiam ser icones inline

## Melhorias Propostas

### 1. Cards compactos
Reduzir icone para `h-7 w-7`, padding para `p-3`, e colocar acoes em linha ao inves de empilhadas.

### 2. Mostrar remetente
Buscar nomes da tabela `profiles` usando os IDs de `created_by` e exibir junto ao timestamp (ex: "Joao - ha 3 dias").

### 3. Responder nas lidas
Adicionar botao "Responder" tambem nos cards de sugestoes ja lidas, reutilizando a logica existente de `respondingTo`.

### 4. Excluir sugestoes
Adicionar icone de lixeira com confirmacao. Requer criar uma RLS policy de DELETE na tabela `pastor_feedback` para pastores/admins.

### 5. Subtitulo inteligente
Quando `unread.length === 0`, mostrar "Tudo em dia" com tom positivo em vez de "0 sugestoes nao lidas".

### 6. Acoes mais compactas
Trocar botoes com texto ("Lido", "Responder") por botoes com icone apenas (`variant="ghost"` com tooltip), alinhados horizontalmente.

## Detalhes Tecnicos

### Banco de dados
- Criar migration para adicionar RLS policy de DELETE em `pastor_feedback` para pastores e admins (atualmente a tabela nao permite DELETE)

### Arquivo a modificar:
- **`src/pages/PastorSugestoes.tsx`**:
  1. Buscar `profiles` (user_id, full_name) no `useEffect` e criar um `Map<string, string>` para resolver nomes
  2. Reduzir icone de `h-9 w-9` para `h-7 w-7` e padding de `p-4` para `p-3`
  3. Adicionar botao "Responder" nos cards lidos (mesma logica de `respondingTo`)
  4. Adicionar botao de excluir com `supabase.from('pastor_feedback').delete().eq('id', id)`
  5. Ajustar subtitulo: `unread.length === 0 ? 'Tudo em dia' : ...`
  6. Substituir botoes empilhados por icones inline horizontais

