Diagnóstico mais provável: a tela de criação em `src/pages/Eleicoes.tsx` já envia `type: electionType`, mas o schema atual de `public.elections` não tem a coluna `type`. Isso já faz a criação falhar. Encontrei também um segundo bug no mesmo fluxo: quando o usuário escolhe “Geral (toda a igreja)”, a tela pode enviar `"general"` para `society_id`, mas esse campo é `uuid`, o que também quebra a inserção. E há um terceiro ponto de segurança/permissão: a UI libera `/eleicoes` para `admin` e `pastor`, mas as tabelas eleitorais usam RLS com `has_management_role`, que hoje não inclui pastor.

O que será corrigido

1. Banco de dados
- Criar uma migration para adicionar `type` na tabela `elections`, com default `'cargo'`.
- Preencher eleições antigas com `'cargo'` para manter compatibilidade.
- Ajustar apenas as políticas do módulo eleitoral para permitir gestão por `admin` e `pastor`, sem alterar a função global `has_management_role` e sem abrir permissões indevidas em outras áreas do sistema.

2. Tela de criação `/eleicoes`
- Corrigir o select “Geral” para salvar `society_id = null` em vez de `"general"`.
- Manter o tipo (`cargo` / `camisa`) funcionando corretamente com a nova coluna.
- Melhorar o toast para mostrar a mensagem real do erro do banco, não só “Erro ao criar eleição”.

3. Fluxo eleitoral relacionado
- Revisar `EleicaoDetalhe.tsx`, `VotePublic.tsx` e componentes ligados a eleições para alinhar textos e permissões com a regra correta.
- Garantir fallback para eleições antigas sem tipo visível, tratando como `'cargo'`.

Resultado esperado
```text
Criar eleição comum -> funciona
Criar votação de camisa -> funciona
Selecionar "Geral" -> não gera erro de UUID
Pastor e admin -> conseguem criar e administrar votações
Falhas futuras -> mostram mensagem específica
```

Arquivos/áreas que serão alterados
- `supabase/migrations/...sql`
- `src/pages/Eleicoes.tsx`
- possivelmente `src/pages/VotePublic.tsx` e arquivos do módulo eleitoral para consistência

Observação técnica importante
- A correção principal não é só de interface; existe um desencontro real entre a tela e o schema do banco.
- Não vou editar manualmente arquivos gerados da integração; a tipagem será atualizada automaticamente depois da migration.