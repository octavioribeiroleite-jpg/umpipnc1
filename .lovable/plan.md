

# Plano: "Aniversariantes da Semana" com Mensagem IA para WhatsApp

## Contexto

A secretaria precisa saber, logo ao abrir a tela, quais aniversariantes devem ser anunciados no culto de domingo. A lógica é: mostrar quem faz aniversário na semana seguinte ao domingo atual. Além disso, gerar via IA uma mensagem pronta para copiar e enviar no WhatsApp ao responsável pelo anúncio no púlpito.

## O que será feito

### 1. Novo componente: `WeekAnnouncementCard`
Arquivo: `src/components/aniversariantes/WeekAnnouncementCard.tsx`

- Card destacado no topo da Home da Secretaria (antes dos cards de menu)
- Titulo: "🎂 Aniversariantes da Semana"
- Lista os aniversariantes dos próximos 7 dias (formato DD/MM - Nome)
- Botão "Copiar lista" para copiar texto simples
- Botão "Gerar mensagem com IA" que chama edge function e gera mensagem formatada para WhatsApp
- Estado de loading enquanto IA processa
- Botão "Copiar mensagem" após geração

### 2. Edge Function: `generate-birthday-announcement`
Arquivo: `supabase/functions/generate-birthday-announcement/index.ts`

- Recebe lista de aniversariantes da semana
- Usa Lovable AI (gemini-2.5-flash) para gerar mensagem bonita para WhatsApp
- Prompt: gerar mensagem para o responsável anunciar no púlpito, tom pastoral, com lista de nomes e datas
- Retorna mensagem formatada

### 3. Alterações em `src/pages/Secretaria.tsx`
- Adicionar `WeekAnnouncementCard` na Home da Secretaria, acima do grid de cards de menu
- Usar dados do `useBirthdays()` hook (weekBirthdays) na Home

### 4. Config
- Adicionar `generate-birthday-announcement` no `supabase/config.toml`

## Arquivos criados
- `src/components/aniversariantes/WeekAnnouncementCard.tsx`
- `supabase/functions/generate-birthday-announcement/index.ts`

## Arquivos alterados
- `src/pages/Secretaria.tsx` (adicionar card no home view)
- `supabase/config.toml` (nova function)

## Fluxo do usuário
1. Secretária abre a tela → vê card "Aniversariantes da Semana" no topo
2. Vê a lista simples dos nomes/datas
3. Clica "Gerar mensagem para WhatsApp"
4. IA gera mensagem pastoral formatada
5. Clica "Copiar" → cola no WhatsApp e envia ao responsável

