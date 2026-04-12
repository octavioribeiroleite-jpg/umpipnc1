

# Plano: Configurações Financeiras Anuais

## Contexto
Atualmente as configurações de mensalidade e per-capita são definidas por competência (mês/ano). O usuário quer definir esses valores uma vez por ano e usá-los ao gerar cobranças de qualquer mês.

## Abordagem
Simplificar a aba de Configurações para trabalhar com **ano** em vez de mês+ano. O `competence` na tabela `financial_settings` passará a ser apenas o ano (ex: `"2026"`). Ao gerar cobranças para um mês específico, o sistema busca as configurações do ano correspondente.

## 1. Alteração na `ConfiguracoesTab.tsx`

- Remover seletor de mês; manter apenas seletor de **ano**
- Competence passa a ser apenas o ano (ex: `"2026"`)
- Ao salvar, salva/atualiza `financial_settings` com `competence = "2026"`
- Remover lógica de atualizar cobranças pendentes ao salvar (isso fica na geração)
- Manter botão "Gerar Cobranças" mas agora com seletor de mês para **qual mês gerar**
- Ao gerar cobranças, usa os valores anuais salvos + mês selecionado para calcular `due_date` e `competence` da cobrança (ex: `"Janeiro/2026"`)

## 2. Layout novo da aba

```text
┌─────────────────────────────────────┐
│ Valores Anuais                      │
│ [Ano: 2026 ▼]                       │
│ Mensalidade: [____]  Per Capita: [____] │
│ Dia Vencimento: [10]                │
│ Observações: [__________]           │
│ [Salvar Configurações]              │
├─────────────────────────────────────┤
│ Gerar Cobranças                     │
│ [Mês: Janeiro ▼] [Ano: 2026 ▼]     │
│ [Gerar Cobranças (X membros)]       │
└─────────────────────────────────────┘
```

## 3. Lógica de geração

- Busca `financial_settings` onde `competence = ano`
- Gera cobranças com `competence = "Mês/Ano"` (formato existente, compatível com CobrancasTab)
- Usa `due_day` das configurações anuais para calcular `due_date`

## 4. Sem migração de banco

- A tabela `financial_settings` já tem campo `competence` (text). Apenas muda o formato do valor armazenado de `"Janeiro/2026"` para `"2026"`
- Cobranças continuam com `competence = "Janeiro/2026"` (sem mudança)

## Arquivos alterados
- **`src/components/financas/ConfiguracoesTab.tsx`**: refatorar para configuração anual + geração por mês

