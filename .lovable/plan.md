
# Simplificar registro de visitante no portal /igreja

## Resumo

Simplificar o formulario de identificacao do portal publico. Manter a coleta de nome e sociedade para registro no banco, mas tornar o fluxo mais simples e robusto, eliminando a dependencia do `device_id` nos headers (que causa erros de RLS no UPDATE) e tratando melhor os erros.

## Mudancas em `src/pages/PortalIgreja.tsx`

### 1. Simplificar o INSERT (remover `.select().single()`)
- O INSERT atual usa `.select('id').single()` que exige uma politica SELECT alem de INSERT
- Mudar para um INSERT simples sem retorno, apenas checando se houve erro
- O `id` do registro nao e necessario para o funcionamento do portal

### 2. Remover o UPDATE de `last_access` na revisita
- O UPDATE usa `device_id` com `current_setting('request.headers')` no RLS, o que falha porque o header `x-device-id` nao e enviado pelo Supabase JS client
- Solucao: ao inves de fazer UPDATE, fazer um novo INSERT a cada acesso (registro simples de log)
- Ou simplesmente remover o UPDATE silencioso, ja que ele falha sem impacto visivel

### 3. Manter o formulario visual identico
- Nome completo + selecao de sociedade/visitante permanecem iguais
- Apenas o `handleSubmit` muda internamente para ser mais robusto

### 4. Salvar no localStorage apos sucesso
- Continua salvando os dados localmente para nao pedir novamente no mesmo dispositivo
- VisitorData simplificada: remover `id` (nao usado) e manter `fullName`, `societyId`, `isVisitor`, `deviceId`

## Detalhes tecnicos

### handleSubmit simplificado
```text
- Validar nome e sociedade
- INSERT no portal_visitors (sem .select())
- Se erro: mostrar toast mas permitir continuar (nao bloquear acesso ao portal)
- Salvar no localStorage e mostrar o portal
```

### Remover o useEffect de UPDATE last_access
- Eliminar o bloco que tenta atualizar `last_access` na revisita
- Alternativa: tentar o INSERT de novo registro silenciosamente (sem bloquear)

### Resultado esperado
- Formulario funciona identico visualmente
- INSERT funciona para usuarios anon e authenticated
- Sem erros de RLS no UPDATE
- Portal sempre acessivel mesmo se o registro falhar
