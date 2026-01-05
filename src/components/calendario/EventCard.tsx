import { CalendarEvent } from '@/hooks/useEvents';
import { Badge } from '@/components/ui/badge';
import { Link, Calendar, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  compact?: boolean;
}

const statusStyles = {
  confirmado: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pendente: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cancelado: 'bg-red-500/10 text-red-500 border-red-500/20 line-through',
};

const statusLabels = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
};

export function EventCard({ event, onClick, compact = false }: EventCardProps) {
  const startDate = new Date(event.start_date);
  const formattedDate = startDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  const formattedTime = event.all_day
    ? 'Dia inteiro'
    : startDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'text-xs truncate px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80',
          event.status === 'cancelado' && 'line-through opacity-60'
        )}
        style={{ backgroundColor: `${event.color}20`, color: event.color || undefined }}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer',
        event.status === 'cancelado' && 'opacity-60'
      )}
    >
      <div
        className="w-1 h-full min-h-[50px] rounded-full flex-shrink-0"
        style={{ backgroundColor: event.color || '#10b981' }}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'font-medium text-sm truncate',
              event.status === 'cancelado' && 'line-through'
            )}
          >
            {event.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.origem === 'reuniao' && (
              <Link className="h-3 w-3 text-muted-foreground" aria-label="Criado via reunião" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedTime}
          </span>
        </div>

        {event.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.location}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusStyles[event.status])}>
            {statusLabels[event.status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}
