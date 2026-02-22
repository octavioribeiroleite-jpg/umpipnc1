
# Dois QR Codes Separados + Urna Fixa com Senha Admin

## Resumo

No modo **"Ambos"**, o painel de votacao mostrara **2 abas** com QR Codes separados. O QR da Urna Fixa **nao aparece automaticamente** -- so e exibido ao clicar na aba correspondente, garantindo que apenas os mesarios controlem a liberacao. A Urna Fixa exigira autenticacao de admin/diretoria antes de funcionar.

## Como vai funcionar

### No Painel Admin (VotingPanel.tsx) -- modo "Ambos"

Quando a votacao estiver aberta e o modo for `'both'`, o QR Code atual sera substituido por **2 abas (Tabs)**:

- **Aba "Celular"** (aberta por padrao): QR Code com link `/vote/{id}` -- voto individual, 1 por dispositivo
- **Aba "Urna Fixa"** (fechada, so abre ao clicar): QR Code com link `/vote/{id}?mode=urna` -- requer autenticacao admin/diretoria

Nos modos `'shared'` ou `'individual'`, continua com um unico QR Code (sem abas).

### Na Pagina Publica (VotePublic.tsx)

Ao detectar `?mode=urna` na URL:
1. Exibe tela de login: "Digite suas credenciais para ativar esta urna"
2. Campos: usuario e senha
3. Autentica via `get_email_by_username` + `supabase.auth.signInWithPassword`
4. Verifica role admin/diretoria via `has_management_role`
5. Salva flag `urna_authenticated_{electionId}` no `sessionStorage`
6. Funciona como urna compartilhada: tela pre-votacao entre votantes, reseta apos 3s, sem bloqueio de device_id

Sem `?mode=urna`: funciona como individual (comportamento atual).

## Arquivos alterados

### 1. `VotingPanel.tsx`
- Importar componente Tabs
- Quando `votingMode === 'both'` e `status === 'open'`:
  - Substituir o bloco unico de QR por Tabs com 2 abas
  - Aba "Celular" (default): QR + link para `/vote/{id}`
  - Aba "Urna Fixa": QR + link para `/vote/{id}?mode=urna`
  - Cada aba com botoes "Copiar" e "Expandir" proprios
  - O dialog fullscreen usara a URL da aba ativa
- Quando `votingMode !== 'both'`: manter QR unico (sem mudanca)

### 2. `VotePublic.tsx`
- Detectar `searchParams.get('mode') === 'urna'` via `useSearchParams`
- Novo estado: `isUrnaMode`, `urnaAuthenticated`, `authLoading`, `authError`
- Nova tela de autenticacao:
  - Icone de Monitor + titulo "Ativar Urna Fixa"
  - Campos usuario e senha
  - Botao "Autenticar"
  - Fluxo: `get_email_by_username` -> `signInWithPassword` -> `has_management_role` -> salvar `sessionStorage`
- Ao verificar `sessionStorage` no carregamento, pular login se ja autenticado
- Se autenticado em modo urna: comportar como `shared` (pre-vote screen, reset apos 3s, sem device_id)
- Se nao autenticado em modo urna: mostrar tela de login

### 3. Nenhuma migracao necessaria
- Nao ha mudancas no banco de dados

## Seguranca
- Autenticacao validada no servidor via Supabase Auth
- Role verificada via funcao `has_management_role`
- `sessionStorage` limpo ao fechar aba/navegador
- Senha pedida apenas 1 vez por sessao

## Detalhe importante: Aba "Urna Fixa" escondida por padrao
- A aba Celular vem selecionada por padrao
- O QR da Urna Fixa **so aparece quando o mesario clica na aba "Urna Fixa"**
- Isso garante controle dos mesarios sobre quais dispositivos sao liberados como urna
