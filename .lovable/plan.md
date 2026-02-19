
# Restringir Edicao do Calendario por Sociedade

## O que muda

Atualmente, qualquer membro com cargo de diretoria pode criar, editar e excluir eventos de qualquer sociedade. Com essa mudanca, cada grupo so podera gerenciar seus proprios eventos:

- Um membro da UMP so edita/exclui eventos da UMP (azul)
- Um membro da SAF so edita/exclui eventos da SAF (rosa)
- Admins continuam podendo gerenciar todos os eventos
- Todos continuam visualizando todos os eventos normalmente

## Secao Tecnica

### 1. Migracao SQL - Adicionar `society_id` na tabela `events`

Adicionar coluna `society_id` (uuid, nullable, FK para societies) na tabela events e preencher automaticamente os eventos existentes com base no mapeamento de cor:

| Cor | Sociedade |
|---|---|
| #3b82f6 | UMP |
| #ec4899 | SAF |
| #10b981 | UPH |
| #f97316 | UPA |
| #8b5cf6 | UCP |
| #6b7280 | NULL (IPNC/geral) |

Atualizar as politicas RLS de INSERT/UPDATE/DELETE para verificar:
- Admin pode tudo (ja existente via `has_management_role`)
- Diretoria so pode gerenciar eventos onde `events.society_id` = `profile.society_id`

Criar funcao auxiliar `is_event_owner` (SECURITY DEFINER) que verifica se o usuario pertence a mesma sociedade do evento.

### 2. Modificar `src/hooks/useEvents.ts`

- No `createEvent`, incluir `society_id` do perfil do usuario logado ao inserir o evento
- Adicionar `society_id` ao tipo `CalendarEvent`

### 3. Modificar `src/pages/Calendario.tsx`

- Substituir a verificacao `isManagement` por uma logica mais granular:
  - Botao "Novo Evento": visivel para qualquer membro com role diretoria/admin
  - Ao clicar em um evento para editar: verificar se `event.society_id === profile.society_id` ou se o usuario e admin
  - Passar `onDelete` e permitir edicao somente se o usuario tem permissao sobre aquele evento especifico
- Na criacao, travar a cor automaticamente para a cor da sociedade do usuario (diretoria nao-admin)

### 4. Modificar `src/components/calendario/EventDialog.tsx`

- Receber nova prop `readOnly` (boolean)
- Quando `readOnly = true`: mostrar os dados do evento sem formulario de edicao, apenas botao "Fechar"
- Quando `readOnly = false`: manter o comportamento atual (formulario editavel)
- Para admins: permitir selecionar qualquer cor/sociedade
- Para diretoria: travar cor na cor da sociedade do usuario

### 5. Modificar `src/components/calendario/DayDetailDrawer.tsx`

- Passar a informacao de permissao por evento, para que o botao "Novo Evento" continue disponivel para diretoria/admin

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Nova migracao SQL | Adicionar `society_id` em events + backfill + RLS + funcao auxiliar |
| `src/hooks/useEvents.ts` | Incluir `society_id` na criacao de eventos |
| `src/pages/Calendario.tsx` | Verificacao granular de permissao por evento |
| `src/components/calendario/EventDialog.tsx` | Modo somente leitura + travar cor por sociedade |
| `src/components/calendario/DayDetailDrawer.tsx` | Ajuste menor de props |
