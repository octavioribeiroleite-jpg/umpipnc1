

# Vincular automaticamente os dados das abas ao banco de dados por sociedade

## Problema identificado

Quando um administrador ou pastor cria dados nas abas de Financas (membros, gastos, cobrancas, camisas, configuracoes), o sistema usa `profile?.society_id` para definir a qual sociedade o registro pertence. Isso funciona para usuarios de diretoria (que tem sociedade fixa), mas para admins/pastores que gerenciam multiplas sociedades, nao ha como escolher para qual sociedade o dado vai.

Alem disso, o `SocietyOverviewCard` no Painel do Pastor nao mostra estatisticas resumidas -- apenas navega para a pagina de detalhe.

## Solucao

### 1. Seletor de sociedade no contexto global (AuthContext)

O `selectedSocietyId` ja existe no AuthContext mas nao e utilizado. Vamos ativa-lo:

- Na pagina de Financas, quando o usuario for admin ou pastor, exibir um seletor de sociedade no topo da pagina
- Ao selecionar, gravar no `selectedSocietyId` do AuthContext
- Todas as abas filhas passarao a usar esse valor para leitura E escrita

### 2. Atualizar todas as abas financeiras

Modificar os seguintes arquivos para usar o `selectedSocietyId` quando o usuario for admin/pastor:

- **MembrosTab**: Usar `selectedSocietyId` em vez de `profile?.society_id` nos inserts e filtros
- **GastosTab**: Idem para transacoes de saida
- **CobrancasTab**: Idem para cobrancas e transacoes de pagamento
- **CamisasTab**: Idem para compras/vendas de camisas
- **ConfiguracoesTab**: Idem para configuracoes financeiras e geracao de cobrancas
- **MensalidadesTab**: Idem para pagamentos de mensalidade
- **ComprovantesTab**: Idem para filtros de comprovantes

### 3. Adicionar estatisticas no SocietyOverviewCard

Enriquecer o card de cada sociedade no Painel do Pastor para mostrar dados resumidos inline (membros ativos, saldo, tarefas pendentes), usando os dados ja carregados em `societyStats`.

## Detalhes tecnicos

### Arquivo: `src/pages/Financas.tsx`
- Adicionar seletor de sociedade (Select) visivel apenas para admin/pastor
- Carregar lista de sociedades do banco
- Passar `effectiveSocietyId` (selectedSocietyId ou profile.society_id) como prop ou usar via AuthContext

### Arquivos: todas as tabs em `src/components/financas/`
- Substituir o padrao atual:
```
const societyId = (!isAdmin && !isPastor) ? profile?.society_id : null;
```
por:
```
const societyId = (!isAdmin && !isPastor) 
  ? profile?.society_id 
  : selectedSocietyId;
```
- Substituir `profile?.society_id || null` nos inserts por `societyId`

### Arquivo: `src/components/pastor/SocietyOverviewCard.tsx`
- Receber `stats` como prop (ja disponivel no componente pai)
- Exibir membros, saldo e tarefas pendentes no card

### Arquivos a modificar
- `src/pages/Financas.tsx` (seletor de sociedade)
- `src/components/financas/MembrosTab.tsx`
- `src/components/financas/GastosTab.tsx`
- `src/components/financas/CobrancasTab.tsx`
- `src/components/financas/CamisasTab.tsx`
- `src/components/financas/ConfiguracoesTab.tsx`
- `src/components/financas/MensalidadesTab.tsx`
- `src/components/financas/ComprovantesTab.tsx`
- `src/components/pastor/SocietyOverviewCard.tsx`
- `src/pages/PainelPastor.tsx` (passar stats para SocietyOverviewCard)
