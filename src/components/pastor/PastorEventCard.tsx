import { Clock, MapPin, Check, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CalendarEvent, EventStatus } from '@/hooks/useEvents';

// Map event color hex to society label
const COLOR_TO_SOCIETY: Record<string, string> = {
  '#3b82f6': 'UMP',
  '#ec4899': 'SAF',
  '#22c55e': 'UPH',
  '#f97316': 'UPA',
  '#a855f7': 'UCP',
  '#10b981': 'IPNC',
  '#6b7280': 'Geral',
};

function getSocietyLabel(color: string | null) {
  if (!color) return 'Geral';
  return COLOR_TO_SOCIETY[color.toLowerCase()] || 'Geral';
}

const STATUS_LABELS: Record<EventStatus, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  nao_realizado: 'Não realizado',
};

interface Props {
  event: CalendarEvent;
  onUpdateStatus?: (id: string, status: EventStatus) => void;
  isUpdating?: boolean;
}

export function PastorEventCard({ event, onUpdateStatus, isUpdating }: Props) {
  const startDate = new Date(event.start_date);
  const timeStr = event.all_day ? 'Dia todo' : format(startDate, 'HH:mm', { locale: ptBR });
  const societyLabel = getSocietyLabel(event.color);
  const eventColor = event.color || '#6b7280';

  const isAwaiting = event.status === 'confirmado' || event.status === 'pendente';
  const isResolved = event.status === 'concluido' || event.status === 'nao_realizado' || event.status === 'cancelado';

  return (
    <div className="flex bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
      {/* Color strip */}
      <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: eventColor }} />

      <div className="flex-1 p-3 min-w-0">
        {/* Row 1: Title + Society badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {event.title}
          </h4>
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5"
            style={{
              backgroundColor: `${eventColor}15`,
              color: eventColor,
              borderColor: `${eventColor}30`,
            }}
          >
            {societyLabel}
          </Badge>
        </div>

        {/* Row 2: Time + Location */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeStr}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>

        {/* Row 3: Actions or status badge */}
        {isAwaiting && onUpdateStatus && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(event.id, 'concluido')}
            >
              <Check className="h-3 w-3" />
              Marcar concluído
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isUpdating}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'nao_realizado')}>
                  Não realizado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'cancelado')}>
                  Cancelar evento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {isResolved && (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0.5 ${
              event.status === 'concluido'
                ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'border-muted text-muted-foreground'
            }`}
          >
            {STATUS_LABELS[event.status]}
          </Badge>
        )}
      </div>
    </div>
  );
}
