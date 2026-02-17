
# Plano Completo: Societies + Logo + Login Animado + Cache IA do Pastor

## Visao Geral

Este plano implementa 4 mudancas principais de uma vez:
1. Nova logo "Renovo IPNC" em todo o app (incluindo PWA)
2. Tela de login redesenhada com animacoes
3. Tabela `societies` para multi-sociedade
4. Cache de resumos IA com invalidacao automatica no painel do pastor

---

## 1. Nova Logo em Todo o App

A imagem enviada sera salva em dois locais:
- `src/assets/logo-ipnc.png` - para componentes React
- `public/icons/icon-512x512.png` - para PWA e favicon

### Componentes atualizados:

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `Auth.tsx` | Icone Church + "IPNC" | Logo animada + "Bem-vindo" |
| `AppSidebar.tsx` | Texto "IPNC" | Logo 32px |
| `MobileHeader.tsx` | Box "IP" azul | Logo 32px |
| `MobileNav.tsx` | Texto "IPNC" (2 locais) | Logo 32px |
| `PainelPastor.tsx` | Icone Church | Logo 40px |
| `PWAInstallPrompt.tsx` | Icone Download + "UMP" | Logo + "IPNC" |
| `index.html` | title "UMP", meta "UMP" | title "IPNC", meta "IPNC" |
| `manifest.json` | name "UMP" | name "IPNC" |

---

## 2. Tela de Login Redesenhada

Redesign completo do `Auth.tsx`:

```text
+----------------------------------+
|     fundo gradiente elegante     |
|                                  |
|      [Logo Renovo IPNC]         |
|       animacao pulse + glow      |
|       (fade-in 0.3s)             |
|                                  |
|         Bem-vindo                |
|       (slide-up 0.5s)            |
|                                  |
|   Igreja Presbiteriana de        |
|      Nova Carapina               |
|       (fade-in 0.7s)             |
|                                  |
|  +---------------------------+   |
|  |  Entrar                   |   |
|  +---------------------------+   |
|  | Usuario                   |   |
|  +---------------------------+   |
|  | Senha                     |   |
|  +---------------------------+   |
|  |       [Entrar]            |   |
|  +---------------------------+   |
|       (fade-in 0.9s)             |
|                                  |
|     (c) 2025 IPNC                |
+----------------------------------+
```

Animacoes CSS customizadas adicionadas no `index.css`:
- `animate-logo-pulse`: scale 1 -> 1.05 com opacidade, loop suave
- `animate-fade-up`: translateY(20px) -> 0 com fade
- `animate-fade-in-delay`: fade com delays escalonados

Tela universal para todas as sociedades. O admin cria os logins de cada membro pela pagina de Usuarios.

---

## 3. Tabela `societies` (Multi-Sociedade)

Nova tabela para suportar UMP, SAF, UPH, UPA, UCP independentes:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| name | text | Nome (UMP, SAF, etc.) |
| slug | text unique | Slug (ump, saf, etc.) |
| color | text | Cor identificadora |
| active | boolean | Se esta ativa |
| created_at | timestamptz | Data de criacao |

Dados iniciais inseridos:
- UMP (azul), SAF (rosa), UPH (verde), UPA (laranja), UCP (roxo)

RLS: leitura para autenticados, gestao para admins.

**Nota**: Esta tabela e a base para o futuro isolamento de dados por sociedade. Neste momento, ela sera usada no painel do pastor para organizar resumos por abas.

---

## 4. Cache de Resumos IA do Pastor

### 4.1 Nova tabela `pastor_summaries`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| society_id | uuid FK nullable | Referencia a societies |
| summaries | jsonb | Resumos da IA |
| stats | jsonb | Estatisticas calculadas |
| meetings_data | jsonb | Reunioes recentes |
| events_data | jsonb | Eventos proximos |
| plenaries_data | jsonb | Plenarias recentes |
| generated_at | timestamptz | Quando foi gerado |
| invalidated | boolean (default true) | Marcado true quando dados mudam |
| created_at | timestamptz | Data de criacao |

RLS: leitura para pastor/admin, escrita via service role.

### 4.2 Funcao e Triggers de Invalidacao

Funcao `invalidate_pastor_cache()` que faz:
```text
UPDATE pastor_summaries SET invalidated = true
```

Triggers em 7 tabelas (INSERT/UPDATE/DELETE):
- meetings, tasks, transactions, membership_payments, members, events, plenaries

### 4.3 Edge Function `summarize-for-pastor` Atualizada

Nova logica:

```text
1. Recebe request (com parametro opcional force=true)
2. Busca cache em pastor_summaries onde invalidated = false
3. Se cache valido E force != true:
   -> Retorna cache + generated_at (instantaneo)
4. Se cache invalido ou force = true:
   -> Busca dados das tabelas
   -> Chama IA (Gemini Flash)
   -> Salva/atualiza cache na tabela
   -> Retorna dados + generated_at
```

### 4.4 Painel do Pastor Reestruturado

Mudancas no `PainelPastor.tsx`:

**Tela de loading animada** (quando IA esta gerando):
```text
+---------------------------+
|                           |
|   [Logo Renovo pulsando]  |
|                           |
|   Atualizando dados...    |
|   [barra animada]         |
|                           |
+---------------------------+
```

**Painel carregado**:
- Logo da igreja no header (substituindo icone Church)
- Texto "Atualizado em dd/MM/yyyy as HH:mm" no topo
- Botao "Atualizar resumo" para forcar regeneracao
- Badge "Novos dados disponiveis" quando cache esta invalidado
- Abas por sociedade (UMP, SAF, etc.) - preparado para o futuro, mostrando a aba geral inicialmente

---

## Detalhes Tecnicos

### Migracao SQL (1 migracao)

1. Criar tabela `societies` com RLS
2. Inserir 5 sociedades (UMP, SAF, UPH, UPA, UCP)
3. Criar tabela `pastor_summaries` com RLS
4. Criar funcao `invalidate_pastor_cache()`
5. Criar 7 triggers de invalidacao

### Arquivos criados
- `src/assets/logo-ipnc.png` - imagem da logo

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Auth.tsx` | Redesign completo: logo animada, "Bem-vindo", animacoes escalonadas |
| `src/pages/PainelPastor.tsx` | Logo, loading animado, cache, botao atualizar, abas sociedade |
| `src/components/layout/AppSidebar.tsx` | Logo img no lugar de texto "IPNC" |
| `src/components/layout/MobileHeader.tsx` | Logo img no lugar de box "IP" |
| `src/components/layout/MobileNav.tsx` | Logo img (2 locais) |
| `src/components/PWAInstallPrompt.tsx` | Logo img + texto "IPNC" |
| `src/index.css` | Animacoes CSS (pulse, fade-up, fade-in-delay) |
| `index.html` | Title e metas "UMP" -> "IPNC" |
| `public/manifest.json` | name/short_name "UMP" -> "IPNC" |
| `public/icons/icon-512x512.png` | Nova logo para PWA |
| `supabase/functions/summarize-for-pastor/index.ts` | Logica de cache: ler antes, salvar depois, parametro force |

### Ordem de execucao

1. Upload da logo para `src/assets/` e `public/icons/`
2. Executar migracao SQL (societies + pastor_summaries + triggers)
3. Atualizar edge function com logica de cache
4. Adicionar animacoes CSS no index.css
5. Redesenhar Auth.tsx com login animado
6. Atualizar AppSidebar, MobileHeader, MobileNav com logo
7. Atualizar PWAInstallPrompt com logo
8. Atualizar index.html e manifest.json (UMP -> IPNC)
9. Reestruturar PainelPastor.tsx com loading animado e cache
