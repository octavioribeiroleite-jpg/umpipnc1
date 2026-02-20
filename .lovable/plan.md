
# Refatoracao: Eventos somente leitura no Dashboard + Navegacao mobile com menu lateral

## Resumo

Tres mudancas principais:

1. **Proximos Eventos no Dashboard**: remover a funcionalidade de edicao ao clicar. Os cards passam a ser apenas informativos (sem cursor pointer, sem dialog de edicao). O botao "Ver calendario" continua levando para a pagina de calendario onde a edicao acontece.

2. **Filtragem por sociedade**: o calendario ja filtra por `society_id` nas permissoes de edicao (RLS + `canEditEvent`). Nenhuma mudanca de banco e necessaria -- o sistema ja garante que diretoria so edita eventos da propria sociedade.

3. **Navegacao mobile**: substituir a barra inferior (bottom nav) por um icone de hamburger (3 barrinhas) no header, que ao clicar abre um painel lateral (Sheet) animado vindo da esquerda com todos os links de navegacao.

---

## Detalhes tecnicos

### 1. `src/pages/Index.tsx` -- Proximos Eventos somente leitura

- Remover os imports de `EventDialog`, `CreateEventInput`, `UpdateEventInput`
- Remover os states `selectedEvent`, `eventDialogOpen`
- Remover as funcoes `handleEventClick`, `canEditEvent`, `handleEventSave`, `handleEventDelete`
- Remover o componente `<EventDialog>` do JSX
- Remover `cursor-pointer` e o `onClick` dos cards de evento
- Manter os cards visuais como estao (titulo, data, local, badge)

### 2. `src/components/layout/MobileHeader.tsx` -- Adicionar botao hamburger

- Adicionar import de `Menu` do lucide-react e do `Sheet` components
- Adicionar um botao com icone `Menu` (3 barrinhas) no lado esquerdo do header (antes do logo)
- Ao clicar, abre um `Sheet` com `side="left"` contendo todos os links de navegacao
- Os links incluem: Home, Reunioes, Tarefas, Calendario, Financas, Arquivos, Plenarias, Configuracoes, e condicionalmente (admin): Usuarios, Sugestoes do Pastor
- Mostrar info do usuario (nome, email) e botao Sair no rodape do sheet
- Usar animacao slide-in da esquerda (ja nativa do Sheet com `side="left"`)

### 3. `src/components/layout/MobileBottomNav.tsx` -- Remover

- Nao sera mais usado pois a navegacao passa para o menu lateral

### 4. `src/components/layout/AppLayout.tsx` -- Ajustar layout mobile

- Remover import do `MobileBottomNav`
- Remover `<MobileBottomNav />` do JSX
- Remover `pb-20` do main mobile (nao precisa mais de padding para bottom nav)

### Arquivos modificados
- `src/pages/Index.tsx` (simplificar eventos)
- `src/components/layout/MobileHeader.tsx` (adicionar hamburger + sheet lateral)
- `src/components/layout/AppLayout.tsx` (remover bottom nav)
- `src/components/layout/MobileBottomNav.tsx` (pode ser mantido mas nao sera importado)
