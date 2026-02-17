

# Plano: Calendario do Pastor com Melhor Visualizacao

## Problema Atual

A pagina `/pastor/calendario` usa o componente Calendar pequeno do shadcn (DayPicker), que mostra apenas um mini-calendario sem detalhes visuais dos eventos. A pagina principal do calendario (`/calendario`) ja tem um grid mensal completo com eventos inline, mas o pastor nao tem acesso a isso.

## O que vai mudar

Transformar o calendario do pastor em um grid mensal completo (igual ao da pagina principal), com eventos coloridos por sociedade e modo somente leitura.

---

## Nova Estrutura Visual

```text
+----------------------------------------------+
|  Calendario Unificado                         |
|                                              |
|  < Fevereiro 2026 >     [Filtro: Todas v]    |
|                                              |
|  Dom  Seg  Ter  Qua  Qui  Sex  Sab          |
|  +-----------------------------------------+ |
|  |    |    |    |    |    |    |  1         | |
|  |    |    |    |    |    |    |            | |
|  +----+----+----+----+----+----+----+      | |
|  |  2 |  3 |  4 |  5 |  6 |  7 |  8 |     | |
|  |    |    |Reun|    |    |Cult|    |       | |
|  |    |    |UMP |    |    |SAF |    |       | |
|  +-----------------------------------------+ |
|  | ...                                      | |
|  +-----------------------------------------+ |
|                                              |
|  Proximos Eventos (lateral ou abaixo)        |
|  - Reuniao UMP (20/02) [bolinha azul]        |
|  - Culto SAF (22/02) [bolinha rosa]          |
+----------------------------------------------+
```

No celular: calendario em formato lista por semana ou grid compacto, com proximos eventos abaixo.

---

## Mudancas Especificas

### 1. Grid mensal completo

Substituir o componente `Calendar` (DayPicker) por um grid de 7 colunas customizado, igual ao usado em `Calendario.tsx`. Cada celula mostra o numero do dia e os eventos compactos daquele dia.

### 2. Eventos coloridos por sociedade

Buscar `society_id` dos eventos e fazer join com `societies` para obter a cor da sociedade. Eventos que nao tem `society_id` usam a cor propria do evento.

### 3. Filtro por sociedade

Adicionar um select no topo para filtrar eventos: "Todas as Sociedades", "UMP", "SAF", "UPH", "UPA", "UCP". O pastor pode ver tudo junto ou focar em uma sociedade.

### 4. Clique no evento mostra detalhes

Ao clicar em um evento compacto no grid, abrir um dialog/drawer somente leitura com os detalhes do evento (titulo, data, horario, local, descricao, status, qual sociedade).

### 5. Navegacao entre meses

Setas para navegar entre meses (igual a pagina principal), com o nome do mes e ano no centro.

### 6. Proximos eventos na lateral (desktop) ou abaixo (mobile)

Lista dos proximos 10 eventos com bolinha colorida da sociedade, titulo, data e local.

---

## Detalhes Tecnicos

### PastorCalendario.tsx

Refatorar completamente para:

- Usar `useEvents(month, year)` em vez de query manual direta
- Implementar grid de calendario customizado (reutilizar logica de `Calendario.tsx`)
- Buscar sociedades para mapear cores
- Adicionar state para filtro de sociedade
- Dialog somente leitura para detalhes do evento (sem edicao/exclusao)
- Layout responsivo: grid 7 colunas no desktop, mais compacto no mobile

### Queries necessarias

- `useEvents(month, year)` para eventos do mes (ja existe)
- Query para `societies` (id, name, slug, color) para mapeamento de cores
- Filtro client-side por `society_id` quando selecionado

### Componente de detalhes (somente leitura)

Criar um dialog simples que mostra:
- Titulo do evento
- Data e horario
- Local
- Descricao
- Status (badge)
- Sociedade (se tiver society_id)
- Origem (manual ou via reuniao)
- Sem botoes de editar/excluir (pastor so visualiza)

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/PastorCalendario.tsx` | Refatorar com grid mensal, filtro por sociedade, dialog de detalhes |

### Ordem de Execucao

1. Refatorar `PastorCalendario.tsx` com grid mensal customizado
2. Adicionar filtro por sociedade
3. Adicionar dialog somente leitura para detalhes do evento
4. Ajustar layout responsivo (mobile-first)

