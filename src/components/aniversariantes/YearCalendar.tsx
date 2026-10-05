import { Cake, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Birthday } from '@/hooks/useBirthdays';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Props {
  birthdays: Birthday[];
  onEdit?: (b: Birthday) => void;
}

export function YearCalendar({ birthdays, onEdit }: Props) {
  const byMonth = MONTH_NAMES.map((name, idx) => ({
    name,
    month: idx + 1,
    items: birthdays.filter(b => b.mes === idx + 1).sort((a, b) => a.dia - b.dia),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Cake className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-base">Calendário anual</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {byMonth.map(m => (
          <div data-ebd-card key={m.month} className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{m.name}</h3>
              <Badge variant="secondary" className="text-xs">{m.items.length}</Badge>
            </div>
            {m.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversário.</p>
            ) : (
              <div className="space-y-1">
                {m.items.map(b => (
                  <div
                    key={b.id}
                    className={`group text-sm min-w-0 whitespace-normal break-words flex items-center gap-2 py-2 ${onEdit ? 'min-h-11 cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-2 -mx-2' : ''}`}
                    role={onEdit ? "button" : undefined}
                    tabIndex={onEdit ? 0 : undefined}
                    aria-label={onEdit ? `Editar ${b.nome}` : undefined}
                    onKeyDown={event => { if (onEdit && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onEdit(b); } }}
                    onClick={() => onEdit?.(b)}
                  >
                    <span className="font-medium text-muted-foreground">{String(b.dia).padStart(2, '0')}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="flex-1 min-w-0 whitespace-normal break-words">{b.nome}</span>
                    {onEdit && <Edit className="h-3 w-3 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
