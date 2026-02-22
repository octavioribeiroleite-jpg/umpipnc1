

# Enriquecer a aba Inicio do Portal

## Resumo

Adicionar dois cards de acesso rapido na aba Inicio: o proximo evento da igreja e o ultimo aviso/comunicado. Esses cards ficam acima do card de Dizimos ja existente, dando uma visao geral rapida ao visitante.

## Visual esperado

```text
+-----------------------------------------------+
|  Bem-vindo a IPNC!                              |
|  Igreja Presbiteriana de Nova Carapina           |
+-----------------------------------------------+

+-- Proximo Evento ----------------------------+
|  [Calendario]  Titulo do Evento              |
|               Sabado, 01 de marco - 19:00    |
|               Local do Evento                |
|                              [Ver todos ->]  |
+----------------------------------------------+

+-- Ultimo Aviso ------------------------------+
|  [Sino]  Titulo do Aviso          [Urgente]  |
|          Trecho da mensagem...               |
|          ha 2 dias                            |
|                              [Ver todos ->]  |
+----------------------------------------------+

+-- Dizimos e Ofertas (card existente) --------+
|  ...                                         |
+----------------------------------------------+
```

## Detalhes tecnicos

### `src/pages/PortalIgreja.tsx` - funcao `InicioTab`

**Novos estados:**
- `nextEvent` (proximo evento nao cancelado)
- `lastAnnouncement` (ultimo comunicado com scope "church")

**Novas queries no useEffect existente (em paralelo com settings):**
- `events`: SELECT proximo evento (`start_date >= now()`, `status != cancelado`, order by `start_date asc`, limit 1)
- `pastor_announcements`: SELECT ultimo aviso (`scope = 'church'`, order by `created_at desc`, limit 1)

**Novos cards (inseridos entre o titulo de boas-vindas e o card de dizimos):**

1. **Card "Proximo Evento"**
   - Icone `Calendar` com cor do evento
   - Titulo do evento
   - Data formatada (dia da semana + data + horario)
   - Local (se houver)
   - Botao "Ver todos" que muda a aba para "programacoes" (recebe `onTabChange` como prop)

2. **Card "Ultimo Aviso"**
   - Icone `Bell`
   - Titulo do aviso
   - Mensagem truncada (2 linhas com `line-clamp-2`)
   - Badge "Urgente" se `priority === 'urgente'`
   - Data relativa (`formatDistanceToNow`)
   - Botao "Ver todos" que muda a aba para "avisos"

**Mudanca de assinatura:**
- `InicioTab` passa a receber `onTabChange: (tab: PortalTab) => void` como prop
- No componente `Portal`, passar `setActiveTab` como prop para `InicioTab`

### Imports adicionais
- `formatDistanceToNow` de `date-fns`

### Skeleton loading
- Enquanto carrega, mostrar 2 skeletons extras (h-24) acima do skeleton do PIX

