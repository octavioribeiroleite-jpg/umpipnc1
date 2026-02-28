

# Aba "Estudo de Sexta" na UMP

## O que será feito

Criar uma nova página "Estudos" acessível pelo menu lateral/bottom nav, onde membros da diretoria podem anotar pontos durante o estudo bíblico de sexta-feira. Depois, a IA gera um resumo formatado para enviar no grupo do WhatsApp.

## Estrutura

### 1. Tabela no banco — `study_notes`
- `id` (uuid, PK)
- `society_id` (uuid, FK societies)
- `title` (text) — tema do estudo
- `date` (date, default today)
- `notes` (text) — anotações livres
- `ai_summary` (text, nullable) — resumo gerado pela IA
- `created_by` (uuid)
- `created_at`, `updated_at` (timestamps)
- RLS: mesma lógica das outras tabelas (society isolated SELECT + management ALL)

### 2. Edge function — `summarize-study`
- Recebe `studyId`, busca as anotações
- Envia para Lovable AI (gemini-3-flash-preview) com prompt: "Resuma estas anotações de estudo bíblico de forma clara e organizada para compartilhar no WhatsApp. Use emojis e formatação leve."
- Salva o resumo em `ai_summary` e retorna

### 3. Nova página — `src/pages/Estudos.tsx`
- Lista de estudos existentes (cards com data, título, status)
- Botão "Novo Estudo" abre dialog com título e data
- Ao clicar num estudo, abre detalhe com:
  - Textarea para anotações (auto-save a cada 5s, como as reuniões)
  - Botão "Gerar Resumo com IA"
  - Card do resumo gerado com botão "Copiar" para WhatsApp

### 4. Navegação
- Adicionar rota `/estudos` no `App.tsx`
- Adicionar "Estudos" com ícone `BookOpen` no sidebar, mobile header e bottom nav

### Arquivos criados/modificados
- `supabase/functions/summarize-study/index.ts` (novo)
- `src/pages/Estudos.tsx` (novo)
- `src/App.tsx` — nova rota
- `src/components/layout/AppSidebar.tsx` — menu item
- `src/components/layout/MobileHeader.tsx` — menu item
- `src/components/layout/MobileBottomNav.tsx` — menu item
- `src/components/layout/MobileNav.tsx` — menu item
- Migração SQL para criar tabela + RLS

