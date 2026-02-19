

# Correcao das Datas no Calendario

## Problema

As datas dos eventos no calendario estao aparecendo no dia errado. Isso acontece porque o codigo usa `.toISOString()` para comparar datas, que converte para UTC. Dependendo do fuso horario do usuario (ex: Brasil, UTC-3), um evento criado para "19/02 as 22h" vira "20/02 01h UTC", aparecendo no dia seguinte.

## Solucao

Substituir `.toISOString().split('T')[0]` por uma funcao que usa a data local do navegador, extraindo ano/mes/dia diretamente sem conversao para UTC.

## Arquivos a modificar

| Arquivo | Linha | Mudanca |
|---|---|---|
| `src/pages/Calendario.tsx` | 61 | Trocar `toISOString()` por extracoa local |
| `src/pages/PastorCalendario.tsx` | 172 | Mesma correcao |
| `src/utils/generateCalendarPDF.ts` | 82 | Mesma correcao |

## Secao tecnica

Criar uma funcao helper `toLocalDateString` e usar nos 3 arquivos:

```typescript
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

Substituir:
```typescript
// Antes (UTC - causa erro de fuso)
const eventDate = new Date(e.start_date).toISOString().split('T')[0];

// Depois (local - data correta)
const eventDate = toLocalDateString(new Date(e.start_date));
```

Mesma correcao aplicada nos 3 arquivos afetados.

