

# Dizimos para todos + Visitantes inteligentes (pessoas unicas)

## 1. Dizimos visivel para todos, configuracao restrita

### `src/pages/Dizimos.tsx`
- Remover a restricao `!isAdmin && !isPastor` — qualquer usuario autenticado acessa
- Se `isAdmin || isPastor`: mostrar `DizimosTab` (formulario de configuracao)
- Senao: mostrar `MembroDizimos` (visao somente-leitura com botao copiar PIX)

### `src/components/layout/AppSidebar.tsx`
- Mover `{ icon: Heart, label: 'Dizimos', path: '/dizimos' }` de `adminMenuItems` para `menuItems`

### `src/components/layout/MobileHeader.tsx`
- Mover `{ to: '/dizimos', icon: Heart, label: 'Dizimos' }` de `adminItems` para `navItems`

### `src/components/layout/MobileBottomNav.tsx`
- Mover `{ to: '/dizimos', icon: Heart, label: 'Dizimos' }` do bloco condicional `isAdmin` para a lista geral de `moreNavItems`

A seguranca dos dados continua garantida: a tabela `settings` so permite escrita para admins (RLS), entao mesmo que a diretoria acesse a pagina, so vera a chave PIX para copiar, sem poder editar.

## 2. Visitantes: contar pessoas unicas por dia, nao acessos

O problema atual: se uma pessoa acessa o portal 3 vezes no domingo, conta como 3. O correto e contar como 1 pessoa.

### `src/pages/Visitantes.tsx`

**`dayVisitors` (memo)** — deduplificar por `full_name|device_id`, manter apenas o primeiro registro de cada pessoa no dia:
```text
const seen = new Map<string, PortalVisitor>();
filtered.forEach(v => {
  const key = `${v.full_name}|${v.device_id}`;
  if (!seen.has(key)) seen.set(key, v);
});
return Array.from(seen.values());
```

**`sundayStats` (memo)** — mesma deduplicacao: contar pessoas unicas por domingo usando `Set` de `full_name|device_id`:
```text
const daySeen = new Set<string>();
dayVis.forEach(v => daySeen.add(`${v.full_name}|${v.device_id}`));
// total = daySeen.size (nao dayVis.length)
```

**`recurringVisitors` (memo)** — contar dias distintos (nao registros totais):
```text
const daySet = new Set(g.dates.map(d => format(new Date(d), 'yyyy-MM-dd')));
visitCount = daySet.size; // dias em que veio, nao cliques
```

**Labels da UI** — trocar "acessos" por "pessoas":
- Cards de domingo: "12 pessoas" em vez de "12 acessos"
- Cards de resumo do dia: "Total de pessoas" em vez de "Total de acessos"
- Titulo da tabela: "Pessoas do dia" em vez de "Acessos do dia"

## Arquivos modificados
- `src/pages/Dizimos.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileHeader.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/pages/Visitantes.tsx`

