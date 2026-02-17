

# Painel do Pastor - Dashboard Exclusivo com Sugestoes e Notificacoes

## O que sera feito

### 1. Novo papel "pastor" no sistema
- Adicionar `pastor` ao enum `app_role` (atualmente: admin, diretoria, visualizador)
- O admin podera criar o login do pastor normalmente pela tela de Usuarios, selecionando o papel "pastor"
- O pastor tera acesso apenas a sua pagina dedicada (`/pastor`)

### 2. Pagina exclusiva do pastor (`/pastor`)
Uma pagina bonita e organizada com tudo resumido, dividida em secoes:

**Secao 1 - Resumo Geral (cards no topo)**
- Saldo financeiro atual
- Membros ativos
- Tarefas pendentes / concluidas
- Proxima plenaria / ultima presenca

**Secao 2 - Reunioes**
- Lista das ultimas reunioes com titulo, data e resumo (usando IA para gerar um resumo curto)
- Campo de sugestao: textarea para o pastor deixar opiniao sobre as reunioes

**Secao 3 - Financas**
- Entradas e saidas do mes, saldo, grafico simples
- Campo de sugestao para o pastor opinar sobre financas

**Secao 4 - Calendario / Eventos**
- Proximos eventos listados
- Campo de sugestao

**Secao 5 - Plenarias**
- Ultima plenaria com presenca e quorum
- Campo de sugestao

**Secao 6 - Tarefas**
- Tarefas pendentes e em andamento
- Campo de sugestao

Cada secao tem um botao "Enviar Sugestao" que salva no banco de dados.

### 3. IA para resumir informacoes
- Usar a Lovable AI (Gemini Flash) para gerar resumos automaticos das reunioes e do progresso geral
- Os resumos aparecem em cards limpos e faceis de ler
- O pastor ve tudo de forma direta sem precisar navegar por varias paginas

### 4. Notificacao para a diretoria
- Quando o pastor envia uma sugestao, ela e salva com status "nao_lida"
- Na Home da diretoria (Index.tsx), um banner destacado aparece no topo mostrando sugestoes novas do pastor
- Ao fazer login, se houver sugestoes nao lidas, um popup (dialog) aparece: "O pastor deixou novas sugestoes! Veja agora."
- Ao clicar, navega para uma lista de sugestoes do pastor
- A diretoria pode marcar como "lida"

### 5. Pagina de sugestoes do pastor (para diretoria ver)
- Nova pagina `/pastor-sugestoes` acessivel pelo menu (para admin/diretoria)
- Lista todas as sugestoes organizadas por secao (reunioes, financas, etc)
- Status: nova, lida
- Possibilidade de responder

## Mudancas tecnicas

### Banco de dados

**Alterar enum app_role:**
```sql
ALTER TYPE app_role ADD VALUE 'pastor';
```

**Nova tabela `pastor_feedback`:**
```sql
CREATE TABLE pastor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL, -- 'reunioes', 'financas', 'calendario', 'plenarias', 'tarefas', 'geral'
  message text NOT NULL,
  response text, -- resposta da diretoria
  read boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  read_by uuid
);
```

RLS:
- Pastor pode inserir e ler seus proprios feedbacks
- Admin/diretoria pode ler todos e atualizar (marcar como lido, responder)

**Funcao auxiliar para verificar role pastor:**
```sql
CREATE OR REPLACE FUNCTION has_pastor_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'pastor'
  )
$$;
```

### Edge function para resumo com IA
- `summarize-for-pastor`: recebe os dados brutos (reunioes, financas, tarefas) e retorna um resumo organizado usando Gemini Flash
- Chamada quando o pastor abre a pagina

### Arquivos novos
- `src/pages/PainelPastor.tsx` - dashboard exclusivo do pastor
- `src/pages/PastorSugestoes.tsx` - pagina para diretoria ver sugestoes
- `src/components/pastor/PastorNotificationBanner.tsx` - banner na Home
- `src/components/pastor/PastorLoginNotification.tsx` - popup no login
- `src/components/pastor/SugestaoForm.tsx` - formulario reutilizavel de sugestao
- `supabase/functions/summarize-for-pastor/index.ts` - edge function com IA

### Arquivos editados
- `src/App.tsx` - rotas `/pastor` e `/pastor-sugestoes`
- `src/pages/Index.tsx` - banner de sugestoes novas + popup no login
- `src/contexts/AuthContext.tsx` - adicionar `isPastor` ao contexto
- `src/components/layout/AppSidebar.tsx` - item "Painel do Pastor" (admin) e "Sugestoes do Pastor" (admin/diretoria)
- `src/components/layout/MobileBottomNav.tsx` - mesmos itens
- `src/components/layout/MobileNav.tsx` - mesmos itens
- `supabase/functions/create-user/index.ts` - aceitar role "pastor"

### Fluxo de navegacao

- **Pastor faz login** -> redirecionado para `/pastor` (nao ve o dashboard normal)
- **Diretoria faz login** -> ve popup se houver sugestoes novas -> banner na Home
- **Admin** -> pode acessar "Sugestoes do Pastor" pelo menu

### Visual do painel do pastor
- Design limpo e moderno, com cards grandes e textos legiveis
- Cores suaves, sem sobrecarga visual
- Cada secao com icone, titulo, resumo gerado por IA, e botao de sugestao
- Sugestoes enviadas aparecem como historico abaixo do campo

