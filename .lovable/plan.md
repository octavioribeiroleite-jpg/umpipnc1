
# Sistema de Eleicao Simples (Modelo Papel Digital)

## Resumo

Criar um modulo de eleicoes digitais que replica exatamente o processo de votacao em papel: chamada de presenca, cadastro de candidatos com foto, votacao por clique (1 clique = 1 voto, sem identificacao), conferencia matematica (votos vs presentes) e resultado automatico. Cada cargo e uma eleicao separada. A eleicao pode ser geral da igreja ou vinculada a uma sociedade.

## Banco de dados (4 tabelas novas)

### `elections`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| name | text | Nome da eleicao |
| position | text | Cargo em disputa |
| status | text | 'draft', 'open', 'finished' (default 'draft') |
| total_present | integer | Total de presentes confirmados (default 0) |
| society_id | uuid nullable | FK societies.id (null = eleicao geral) |
| created_by | uuid | Quem criou |
| created_at | timestamptz | now() |

### `election_attendance`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| election_id | uuid | FK elections.id ON DELETE CASCADE |
| name | text | Nome do membro |
| present | boolean | default false |

### `election_candidates`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| election_id | uuid | FK elections.id ON DELETE CASCADE |
| name | text | Nome do candidato |
| photo_url | text nullable | URL da foto |
| display_order | integer | default 0 |

### `election_votes`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| election_id | uuid | FK elections.id ON DELETE CASCADE |
| candidate_id | uuid | FK election_candidates.id ON DELETE CASCADE |
| created_at | timestamptz | now() |

Sem nenhum campo de identificacao do votante (sem user_id, sem IP, sem token).

### RLS
- `elections`: SELECT para autenticados, ALL para management
- `election_attendance`: SELECT para autenticados, ALL para management
- `election_candidates`: SELECT para autenticados (inclusive anon para tela de voto), ALL para management
- `election_votes`: SELECT para autenticados, INSERT aberto (anon) para permitir voto sem login, ALL para management (para reiniciar)
- Para a tela publica de votacao (`/vote/:id`), as tabelas `elections`, `election_candidates` e `election_votes` precisam de politica SELECT para anon tambem

## Paginas e componentes

### 1. `src/pages/Eleicoes.tsx` -- Lista de eleicoes
- Acesso: admin/diretoria (dentro de AppLayout)
- Lista todas as eleicoes com status, cargo, total presentes, total votos
- Botao "Nova Eleicao" abre dialog para criar
- Clicar em uma eleicao navega para detalhe

### 2. `src/pages/EleicaoDetalhe.tsx` -- Painel de controle da eleicao
- Acesso: admin/diretoria
- Abas ou secoes sequenciais:

**Secao Chamada (status = draft)**:
- Lista de nomes com checkbox para marcar presenca
- Botao "Importar membros da sociedade" (puxa da tabela `members` filtrado por society_id se tiver)
- Botao "Adicionar membro manualmente"
- Exibe total presentes calculado automaticamente
- Botao "Confirmar Presenca" salva total_present

**Secao Candidatos (status = draft)**:
- Cadastro de candidatos com foto (upload para bucket `receipts` existente), nome e ordem
- Layout com foto grande e nome centralizado

**Secao Votacao (status = draft -> open)**:
- Botao "Iniciar Votacao" muda status para open
- Mostra link publico `/vote/:election_id`
- Gera QR Code do link (usar biblioteca simples ou SVG inline)
- Painel em tempo real: total presentes vs total votos vs diferenca

**Secao Controle (status = open)**:
- Contador: Presentes: X | Votos: X | Diferenca: X
- Se diferenca != 0: botao "Reiniciar Votacao" (deleta todos os votes, mantem status open)
- Se diferenca == 0: botao "Concluir Votacao" (muda status para finished)

**Secao Resultado (status = finished)**:
- Lista de candidatos ordenados por votos (count)
- Total votos e total presentes exibidos
- Badge "Valido" se batem

### 3. `src/pages/VotePublic.tsx` -- Tela de votacao (URNA)
- Rota: `/vote/:electionId`
- Acesso: PUBLICO (sem login necessario)
- Nao usa AppLayout (tela cheia, limpa)
- Verifica se status == 'open', senao mostra mensagem
- Exibe titulo da eleicao, cargo
- Lista candidatos com foto grande e botao VOTAR
- Ao clicar: modal de confirmacao "Confirma voto em [Nome]?"
- Ao confirmar: insere registro em election_votes (sem identificacao)
- Mostra "Voto computado com sucesso" com check verde
- Apos 3 segundos volta para tela inicial da urna (pronto para proximo votante)
- Botoes grandes, responsivo para tablet, visual limpo

### 4. Componentes auxiliares
- `src/components/eleicoes/ElectionCard.tsx` -- card de eleicao na listagem
- `src/components/eleicoes/AttendanceList.tsx` -- lista de chamada com checkboxes
- `src/components/eleicoes/CandidateForm.tsx` -- formulario de cadastro de candidato
- `src/components/eleicoes/VotingPanel.tsx` -- painel de controle em tempo real
- `src/components/eleicoes/ResultPanel.tsx` -- exibicao de resultados

### 5. Rotas novas no `App.tsx`
```
/eleicoes                  -- lista (protegida)
/eleicoes/:id              -- detalhe/painel (protegida)
/vote/:electionId          -- urna publica (sem auth)
```

### 6. Navegacao
- Adicionar "Eleicoes" no menu lateral (`AppSidebar.tsx`) e no menu mobile (`MobileBottomNav.tsx`) dentro da secao "Mais"
- Icone: `Vote` ou `CheckSquare` do lucide-react

## QR Code
Gerar QR Code inline usando uma funcao SVG simples ou a biblioteca `qrcode` (lightweight). Sem dependencia pesada.

## Realtime (painel de controle)
Habilitar realtime na tabela `election_votes` para que o painel do admin atualize automaticamente o contador de votos conforme as pessoas votam:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.election_votes;
```

## Arquivos a criar/modificar
- **Criar**: migracao SQL com 4 tabelas + RLS + realtime
- **Criar**: `src/pages/Eleicoes.tsx`
- **Criar**: `src/pages/EleicaoDetalhe.tsx`
- **Criar**: `src/pages/VotePublic.tsx`
- **Criar**: `src/components/eleicoes/AttendanceList.tsx`
- **Criar**: `src/components/eleicoes/CandidateForm.tsx`
- **Criar**: `src/components/eleicoes/VotingPanel.tsx`
- **Criar**: `src/components/eleicoes/ResultPanel.tsx`
- **Criar**: `src/components/eleicoes/ElectionCard.tsx`
- **Modificar**: `src/App.tsx` (3 rotas novas)
- **Modificar**: `src/components/layout/AppSidebar.tsx` (menu)
- **Modificar**: `src/components/layout/MobileBottomNav.tsx` (menu "Mais")
