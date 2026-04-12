

# Plano: Simplificar Configurações Financeiras

## Problema raiz
1. Os dados antigos no banco tem `competence = "Janeiro/2026"` e `"Fevereiro/2026"`, mas o codigo atual busca `competence = "2026"` -- nao encontra nada
2. Ao tentar criar novo registro, `society_id` vai como `null` porque a sessao pode estar expirada ou o perfil nao carregou -- isso viola a politica de RLS
3. O usuario quer algo mais simples: um unico registro geral de valores, sem ficar trocando ano

## Solucao

### 1. Remover seletor de ano -- competencia fixa `"geral"`
- Usar `competence = "geral"` para salvar/buscar os valores de mensalidade e per-capita
- Remover o select de ano do card de "Valores"
- Um unico registro por sociedade com os valores vigentes

### 2. Proteger contra `society_id` nulo
- Adicionar validacao: se `societyId` for null/undefined, exibir alerta pedindo para relogar
- Nao permitir salvar nem gerar cobrancas sem `societyId`

### 3. Manter geracao de cobrancas com mes/ano
- O card "Gerar Cobrancas" continua com seletores de mes e ano
- Usa os valores do registro `"geral"` para criar as cobrancas no formato `"Abril/2026"`

### 4. Layout simplificado

```text
┌─────────────────────────────────────┐
│ Valores de Cobrança                 │
│ Mensalidade Anual: [____]           │
│ Per Capita: [____]                  │
│ Dia Vencimento: [10]                │
│ Observações: [__________]           │
│ [Salvar]                            │
├─────────────────────────────────────┤
│ Gerar Cobranças                     │
│ [Mês ▼] [Ano ▼]                    │
│ [Gerar Cobranças (X membros)]       │
└─────────────────────────────────────┘
```

## Arquivo alterado
- `src/components/financas/ConfiguracoesTab.tsx`

