import { CalendarEvent, EventStatus } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Clock, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const colorToSociety: Record<string, string> = {
  '#3b82f6': 'UMP',
  '#ec4899': 'SAF',
  '#10b981': 'UPH',
  '#f97316': 'UPA',
  '#8b5cf6': 'UCP',
  '#6b7280': 'IPNC',
};

const statusConfig: Record<string, { label: string; class: string; icon: typeof Check }> = {
  confirmado: { label: 'Confirmado', class: 'bg-primary/10 text-primary border-primary/20', icon: Clock },
  pendente: { label: 'Pendente', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  concluido: { label: 'Concluído', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: Check },
  nao_realizado: { label: 'Não realizado', class: 'bg-red-500/10 text-red-500 border-red-500/20', icon: X },
  cancelado: { label: 'Cancelado', class: 'bg-muted text-muted-foreground border-border', icon: X },
};

interface EventCompletionListProps {
  events: CalendarEvent[];
  onUpdateStatus: (id: string, status: EventStatus) => void;
  isUpdating?: boolean;
  canEdit?: boolean;
  onViewCalendar?: () => void;
  title?: string;
  maxItems?: number;
}

export function EventCompletionList({
  events,
  onUpdateStatus,
  isUpdating = false,
  canEdit = false,
  onViewCalendar,
  title = 'Eventos',
  maxItems,
}: EventCompletionListProps) {
  const now = new Date();
  
  // Separate past and upcoming events
  const pastEvents = events.filter(e => new Date(e.start_date) < now && e.status !== 'cancelado');
  const upcomingEvents = events.filter(e => new Date(e.start_date) >= now && e.status !== 'cancelado');
  
  // Past events that still need resolution (not concluido/nao_realizado)
  const pendingResolution = pastEvents.filter(e => e.status !== 'concluido' && e.status !== 'nao_realizado');
  const resolvedPast = pastEvents.filter(e => e.status === 'concluido' || e.status === 'nao_realizado');

  const displayUpcoming = maxItems ? upcomingEvents.slice(0, maxItems) : upcomingEvents;

  if (events.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/70 backdrop-blur-sm rounded-xl">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {onViewCalendar && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onViewCalendar}>
              Calendário <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-4">
        {/* Pending resolution (past events without status) */}
        {pendingResolution.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
              ⚠ Aguardando conclusão ({pendingResolution.length})
            </p>
            {pendingResolution.map(event => (
              <EventRow
                key={event.id}
                event={event}
                canEdit={canEdit}
                isUpdating={isUpdating}
                onUpdateStatus={onUpdateStatus}
                highlight
              />
            ))}
          </div>
        )}

        {/* Upcoming events */}
        {displayUpcoming.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Próximos ({upcomingEvents.length})
            </p>
            {displayUpcoming.map(event => (
              <EventRow
                key={event.id}
                event={event}
                canEdit={false}
                isUpdating={isUpdating}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}

        {/* Resolved past events */}
        {resolvedPast.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Realizados ({resolvedPast.length})
            </p>
            {resolvedPast.slice(0, 5).map(event => (
              <EventRow
                key={event.id}
                event={event}
                canEdit={canEdit}
                isUpdating={isUpdating}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventRow({
  event,
  canEdit,
  isUpdating,
  onUpdateStatus,
  highlight = false,
}: {
  event: CalendarEvent;
  canEdit: boolean;
  isUpdating: boolean;
  onUpdateStatus: (id: string, status: EventStatus) => void;
  highlight?: boolean;
}) {
  const startDate = new Date(event.start_date);
  const societyName = colorToSociety[event.color || ''] || '';
  const config = statusConfig[event.status] || statusConfig.pendente;
  const isPast = startDate < new Date();
  const needsResolution = isPast && event.status !== 'concluido' && event.status !== 'nao_realizado';

  return (
    <div
      className={cn(
        'p-2.5 rounded-lg border transition-colors',
        highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50',
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: event.color || 'hsl(var(--primary))' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm truncate">{event.title}</span>
            {societyName && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${event.color || '#6b7280'}15`, color: event.color || '#6b7280' }}
              >
                {societyName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.all_day
                ? format(startDate, "dd/MM", { locale: ptBR })
                : format(startDate, "dd/MM 'às' HH:mm", { locale: ptBR })
              }
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {/* Status badge or action buttons */}
        {needsResolution && canEdit ? (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(event.id, 'concluido')}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-0.5" />}
              Concluído
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-red-500/30 text-red-500 hover:bg-red-500/10"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(event.id, 'nao_realizado')}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-0.5" />}
              Não
            </Button>
          </div>
        ) : (
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', config.class)}>
            {config.label}
          </Badge>
        )}
      </div>
    </div>
  );
}
