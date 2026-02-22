

# Reestruturar Portal do Membro com Menu Lateral

## Situacao Atual
O portal do membro (`/membro`) usa **abas na parte inferior** (bottom nav) com apenas 2 opcoes: Eventos e Pagamentos. O usuario quer trocar por um **menu lateral** (hamburger/drawer), similar ao que o app principal usa.

## Nova Estrutura

O portal do membro tera um menu lateral acessivel pelo icone de hamburguer no header, com as seguintes secoes:

- **Inicio** - Dashboard com boas-vindas, resumo de cobranças pendentes, proximo evento e ultimos comunicados
- **Eventos** - Lista de proximos eventos (ja existe)
- **Pagamentos** - Cobranças pendentes e envio de comprovantes (ja existe)
- **Comunicados** - Feed de comunicados do pastor para a sociedade do membro

## Alteracoes

### Modificar: `src/components/membro/MembroLayout.tsx`
- Remover a bottom navigation (nav fixa no rodape)
- Adicionar botao hamburguer no header que abre um `Sheet` lateral (igual ao `MobileNav` do app principal)
- Menu lateral com itens: Inicio, Eventos, Pagamentos, Comunicados
- Atualizar tipo do `activeTab` para `'inicio' | 'eventos' | 'pagamentos' | 'comunicados'`
- Remover `pb-20` do main (nao precisa mais de espaco para bottom nav)

### Modificar: `src/pages/MembroHome.tsx`
- Adicionar imports dos novos componentes (MembroInicio, MembroComunicados)
- Estado inicial da aba passa a ser `'inicio'`
- Renderizar componente correto conforme aba selecionada no menu

### Criar: `src/components/membro/MembroInicio.tsx`
- Card de boas-vindas com nome do membro e sociedade
- Mini-cards de resumo: total de cobranças pendentes e proximo evento
- Ultimos 3 comunicados com destaque para urgentes
- Botoes de acao rapida que trocam para outras abas

### Criar: `src/components/membro/MembroComunicados.tsx`
- Busca comunicados da tabela `pastor_announcements` filtrados pela sociedade do membro (via `target_societies`)
- Cards com titulo, mensagem, data formatada e badge de prioridade
- Estado vazio com icone e mensagem

## Detalhes Tecnicos

### Menu lateral (Sheet)
- Usar `Sheet` do Radix (side="left") com mesma estetica do `MobileNav`
- Icones: Home, Calendar, CreditCard, Bell
- Item ativo destacado com `bg-primary text-primary-foreground`
- Ao clicar, fecha o sheet e troca o `activeTab`

### MembroComunicados
- Query: `supabase.from('pastor_announcements').select('*').contains('target_societies', [society_id]).order('created_at', { ascending: false }).limit(30)`
- Prioridade "urgente" com borda colorida e badge vermelho

### MembroInicio
- Busca paralela: cobranças pendentes + proximo evento + ultimos comunicados
- Cards clicaveis que chamam `onTabChange` para navegar entre secoes

