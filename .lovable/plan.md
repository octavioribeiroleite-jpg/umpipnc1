

# Portal Unificado - Cards de Papel na Tela de Login + Portal do Membro

## Resumo

Transformar a tela de login em uma experiencia com 3 cards visuais (Pastor, Diretoria, Membros) que o usuario seleciona antes de fazer login. Apos o login, o sistema redireciona automaticamente para o dashboard correto baseado no papel. Tambem criar o portal simplificado para membros com eventos e pagamentos.

## Fluxo do Usuario

```text
Tela de Login
+----------------------------------+
|          Logo IPNC               |
|        Bem-vindo ao IPNC         |
|                                  |
|  [Pastor]  [Diretoria]  [Membro] |
|                                  |
+----------------------------------+

Usuario clica em um card:
+----------------------------------+
|  <- Voltar          Logo IPNC    |
|                                  |
|  Entrar como Diretoria           |
|  [Sociedade: UMP v]              |
|  [Usuario___________]            |
|  [Senha_____________]            |
|  [      Entrar      ]            |
+----------------------------------+

Apos login:
- Pastor -> /pastor
- Diretoria -> / (dashboard atual)
- Membro -> /membro (portal simplificado)
```

---

## Parte 1: Tela de Login com Cards

### Mudancas em `src/pages/Auth.tsx`

Adicionar um estado de "etapa" (step):
- **Etapa 1**: Mostra 3 cards grandes e bonitos (Pastor, Diretoria, Membro) com icones
- **Etapa 2**: Mostra o formulario de login contextualizado

Comportamento por card:
- **Pastor**: formulario com usuario e senha (sem seletor de sociedade)
- **Diretoria**: formulario com seletor de sociedade + usuario + senha (como hoje)
- **Membro**: formulario com seletor de sociedade + usuario + senha

### Redirecionamento pos-login em `src/pages/Index.tsx`

Atualizar a logica de redirecionamento:
- `pastor` (sem admin) -> `/pastor`
- `diretoria` ou `admin` -> `/` (dashboard atual)
- `visualizador` (sem diretoria/admin/pastor) -> `/membro`

---

## Parte 2: Portal do Membro (Nova Area)

### Banco de Dados

**Nova tabela `member_payment_submissions`:**
- Armazena envios de comprovantes de Pix pelos membros
- Campos: member_id, user_id, competence, type (mensalidade/per-capita), receipt_url, amount, status (pendente/aprovado/rejeitado), notes, reviewed_by, reviewed_at, society_id
- RLS: membros veem apenas seus proprios envios; diretoria ve e gerencia todos

**Vincular `members.user_id`:**
- Adicionar coluna `user_id` na tabela `members` para conectar o membro ao usuario logado
- Isso permite buscar cobracas do membro logado automaticamente

### Novos Arquivos

**`src/pages/MembroHome.tsx`**
- Pagina principal com 2 abas: Eventos e Pagamentos
- Layout simplificado sem sidebar complexa

**`src/components/membro/MembroLayout.tsx`**
- Header com logo, nome do membro e logout
- Navegacao inferior com 2 botoes (Eventos / Pagamentos)
- Visual limpo e mobile-first

**`src/components/membro/MembroEventos.tsx`**
- Lista de proximos eventos em cards
- Filtro por mes
- Mostra titulo, data, horario, local e cor da sociedade
- Somente leitura (sem criar/editar eventos)

**`src/components/membro/MembroPagamentos.tsx`**
- Mostra cobracas pendentes do membro (mensalidade e per-capita)
- Botao "Enviar Comprovante" com:
  - Upload de imagem do comprovante Pix (bucket `receipts`)
  - Campo de observacoes
  - Selecao de competencia
- Historico de envios com status (pendente/aprovado/rejeitado)

### Notificacao para Diretoria

**Atualizar `src/pages/Index.tsx` (dashboard)**
- Adicionar card de notificacao: "X comprovantes pendentes de aprovacao"
- Usar Realtime para atualizar em tempo real quando um membro envia comprovante

**Novo `src/components/financas/ComprovantesTab.tsx`**
- Nova aba na area financeira para a diretoria
- Lista comprovantes pendentes com: nome do membro, competencia, valor, visualizacao do comprovante
- Botoes Aprovar (registra pagamento automaticamente) e Rejeitar (com motivo)

### Rotas em `src/App.tsx`

Adicionar:
```
/membro -> MembroHome
```

---

## Parte 3: Gestao de Membros pelo Admin

### Atualizar `src/pages/Usuarios.tsx`

Na criacao de usuario com papel `visualizador`:
- Campo adicional para vincular ao registro na tabela `members` (select com membros da sociedade)
- Isso preenche `members.user_id` automaticamente

---

## Secao Tecnica - Ordem de Implementacao

1. **Migracao SQL**: Criar tabela `member_payment_submissions` + adicionar `user_id` em `members` + RLS + Realtime
2. **Auth.tsx**: Refatorar para cards de papel + formulario contextual
3. **MembroLayout + MembroEventos + MembroPagamentos**: Criar portal do membro
4. **MembroHome**: Pagina principal com abas
5. **App.tsx + Index.tsx**: Adicionar rota `/membro` e logica de redirecionamento
6. **ComprovantesTab**: Aba de aprovacao na area financeira
7. **Index.tsx**: Card de notificacao de comprovantes pendentes
8. **Usuarios.tsx**: Vinculo membro-usuario na criacao

