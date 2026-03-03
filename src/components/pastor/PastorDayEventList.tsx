import { useMemo, useState } from 'react';
import { PastorEventCard } from './PastorEventCard';
import type { CalendarEvent, EventStatus } from '@/hooks/useEvents';

type FilterKey = 'all' | 'aguardando' | 'concluidas' | 'canceladas';

interface Props {
  selectedDate: Date;
  events: CalendarEvent[];
  onUpdateStatus: (id: string, status: EventStatus) => void;
  isUpdating: boolean;
}

function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatPtBrDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function matchesFilter(status: EventStatus, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'aguardando') return status === 'confirmado' || status === 'pendente';
  if (filter === 'concluidas') return status === 'concluido';
  if (filter === 'canceladas') return status === 'cancelado' || status === 'nao_realizado';
  return true;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'aguardando', label: 'Aguardando' },
  { key: 'concluidas', label: 'Concluídas' },
  { key: 'canceladas', label: 'Canceladas' },
];

export function PastorDayEventList({ selectedDate, events, onUpdateStatus, isUpdating }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const dayEvents = useMemo(() => {
    return events.filter(ev => isSameLocalDay(new Date(ev.start_date), selectedDate));
  }, [events, selectedDate]);

  const filteredEvents = useMemo(() => {
    const filtered = filter === 'all' ? dayEvents : dayEvents.filter(ev => matchesFilter(ev.status, filter));
    return filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [dayEvents, filter]);

  const counts = useMemo(() => ({
    all: dayEvents.length,
    aguardando: dayEvents.filter(e => matchesFilter(e.status, 'aguardando')).length,
    concluidas: dayEvents.filter(e => matchesFilter(e.status, 'concluidas')).length,
    canceladas: dayEvents.filter(e => matchesFilter(e.status, 'canceladas')).length,
  }), [dayEvents]);

  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">
          Programações de {formatPtBrDate(selectedDate)}
        </h2>
        <p className="text-xs text-muted-foreground">
          Toque em um dia no calendário para filtrar
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border/60 hover:bg-muted',
              ].join(' ')}
            >
              {f.label} ({counts[f.key]})
            </button>
          );
        })}
      </div>

      {/* Event list */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground text-center">
          Nenhum evento para este dia.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map(ev => (
            <PastorEventCard
              key={ev.id}
              event={ev}
              onUpdateStatus={onUpdateStatus}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </section>
  );
}
