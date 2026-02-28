

# Relatório Anual dos Estudos Bíblicos

## O que será feito

Adicionar um botão "Relatório do Ano" na página de Estudos que gera um relatório consolidado de todos os estudos do ano, usando IA para criar uma síntese completa.

## Mudanças

### 1. Nova Edge Function — `summarize-yearly-studies`
- Recebe `year` (ex: 2026) e `society_id`
- Busca todos os `study_notes` do ano com anotações não vazias
- Envia para a IA com prompt específico para relatório anual:
  - Lista todos os temas estudados com datas
  - Identifica temas recorrentes e padrões
  - Destaca versículos e reflexões mais importantes
  - Gera estatísticas (total de estudos, frequência)
  - Formatado para WhatsApp com emojis
- Retorna o relatório gerado

### 2. UI na página `Estudos.tsx`
- Botão "Relatório do Ano" ao lado de "Novo Estudo"
- Select para escolher o ano
- Dialog/drawer mostrando o relatório gerado com botão "Copiar"
- Loading state durante geração

### Arquivos criados/modificados
- `supabase/functions/summarize-yearly-studies/index.ts` (novo)
- `src/pages/Estudos.tsx` — botão + dialog do relatório anual
- `supabase/config.toml` — registrar nova function

