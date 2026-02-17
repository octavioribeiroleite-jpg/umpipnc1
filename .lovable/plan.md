

# Sistema de Chamada para Plenarias da UMP

## Objetivo
Criar uma funcionalidade independente (separada das reunioes) para fazer chamada dos membros da UMP antes das plenarias. O sistema permite marcar presenca clicando nos membros, exibe a porcentagem em tempo real para verificar quorum, e gera um PDF com presentes e ausentes.

## Como vai funcionar

1. Nova pagina `/plenarias` acessivel pelo menu lateral
2. Tela principal lista todas as plenarias (chamadas) ja realizadas
3. Botao "Nova Plenaria" cria uma nova chamada com data e titulo
4. Ao abrir uma plenaria, mostra todos os membros ativos da tabela `members`
5. Clicar em um membro alterna entre presente/ausente
6. Barra de progresso mostra em tempo real: "12/18 presentes (67%)"
7. Indicador verde quando quorum e atingido (50% + 1)
8. Botao para baixar PDF da chamada

## Mudancas

### 1. Nova tabela `plenaries`
Armazenar cada plenaria/chamada:
- `id` (uuid, PK)
- `title` (text, ex: "Plenaria Ordinaria - Fevereiro")
- `date` (timestamptz)
- `created_by` (uuid)
- `created_at` (timestamptz)
- `quorum_required` (integer, default 50 - porcentagem minima para quorum)

### 2. Nova tabela `plenary_attendance`
Armazenar a presenca de cada membro:
- `id` (uuid, PK)
- `plenary_id` (uuid, FK para plenaries, ON DELETE CASCADE)
- `member_id` (uuid, FK para members, ON DELETE CASCADE)
- `present` (boolean, default false)
- `marked_at` (timestamptz)
- `marked_by` (uuid)
- `created_at` (timestamptz)
- Constraint UNIQUE(plenary_id, member_id)

RLS em ambas: leitura para autenticados, gestao completa para management.

### 3. Nova pagina `src/pages/Plenarias.tsx`
- Lista de plenarias com data, titulo, contagem de presentes
- Botao "Nova Plenaria" (abre dialog com titulo e data)
- Cada card permite abrir a plenaria ou excluir

### 4. Nova pagina `src/pages/PlenariaDetalhe.tsx`
- Topo: card com barra de progresso, contagem (X/Y) e porcentagem
- Indicador de quorum: verde se atingido, vermelho se nao
- Botao "Iniciar Chamada" que cria registros para todos os membros ativos (ausentes por padrao)
- Grid de cards dos membros com toggle visual (verde = presente, cinza = ausente)
- Campo de busca para filtrar membros por nome
- Botao "Baixar PDF"

### 5. Geracao de PDF (usando jspdf)
- Cabecalho: "Chamada - [Titulo da Plenaria]"
- Data da plenaria
- Resumo: "Presentes: X/Y (Z%)" e "Quorum: Atingido / Nao atingido"
- Lista numerada de presentes (ordem alfabetica)
- Lista numerada de ausentes (ordem alfabetica)

### 6. Navegacao
- Adicionar item "Plenarias" no menu lateral (`AppSidebar.tsx`) com icone `ClipboardCheck`
- Adicionar item no `MobileBottomNav.tsx` / `MobileNav.tsx`
- Rotas: `/plenarias` e `/plenarias/:id` no `App.tsx`

## Detalhes tecnicos

### SQL da migracao:
```sql
CREATE TABLE plenaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  quorum_required integer NOT NULL DEFAULT 50
);

ALTER TABLE plenaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plenaries viewable by authenticated"
  ON plenaries FOR SELECT USING (true);
CREATE POLICY "Management can manage plenaries"
  ON plenaries FOR ALL USING (has_management_role(auth.uid()));

CREATE TABLE plenary_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plenary_id uuid NOT NULL REFERENCES plenaries(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  marked_at timestamptz,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plenary_id, member_id)
);

ALTER TABLE plenary_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance viewable by authenticated"
  ON plenary_attendance FOR SELECT USING (true);
CREATE POLICY "Management can manage attendance"
  ON plenary_attendance FOR ALL USING (has_management_role(auth.uid()));
```

### Arquivos novos:
- `src/pages/Plenarias.tsx` - listagem
- `src/pages/PlenariaDetalhe.tsx` - chamada com toggle e PDF

### Arquivos editados:
- `src/App.tsx` - novas rotas
- `src/components/layout/AppSidebar.tsx` - item no menu
- `src/components/layout/MobileBottomNav.tsx` - item no menu mobile
- `src/components/layout/MobileNav.tsx` - item no menu mobile

