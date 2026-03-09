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
        <h2 className="font-semibold text-sm">Calendário anual</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {byMonth.map(m => (
          <div key={m.month} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{m.name}</h3>
              <Badge variant="secondary" className="text-[10px]">{m.items.length}</Badge>
            </div>
            {m.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <div className="space-y-0.5">
                {m.items.map(b => (
                  <div
                    key={b.id}
                    className={`text-xs truncate flex items-center gap-1 ${onEdit ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-0.5' : ''}`}
                    onClick={() => onEdit?.(b)}
                  >
                    <span className="font-medium text-muted-foreground">{String(b.dia).padStart(2, '0')}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="flex-1 truncate">{b.nome}</span>
                    {onEdit && <Edit className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />}
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
