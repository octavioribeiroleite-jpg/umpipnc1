

# Adicionar seção de meditação semanal nos prompts de resumo

## Mudanças

### 1. `supabase/functions/summarize-study/index.ts` (linha 43-51)
Atualizar o prompt do sistema para incluir uma seção final de "meditação da semana" com perguntas reflexivas para os jovens:
- Após a reflexão/versículo-chave, adicionar uma seção "🧠 Para meditar na semana" com 2-3 perguntas práticas para os jovens refletirem ao longo da semana sobre o que foi estudado

### 2. `supabase/functions/summarize-yearly-studies/index.ts` (prompt do relatório anual)
Adicionar no prompt do relatório anual uma seção consolidada de reflexões para meditação, baseada nos principais temas do ano.

Nenhuma mudança de banco ou UI — apenas ajuste nos prompts das duas edge functions.

