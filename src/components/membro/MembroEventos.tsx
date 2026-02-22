import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  status: string;
  color: string | null;
  all_day: boolean | null;
  society_id: string | null;
}

interface Society {
  id: string;
  name: string;
  color: string;
}

const statusStyles: Record<string, string> = {
  confirmado: 'bg-success/10 text-success border-success/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
};

export function MembroEventos() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [societies, setSocieties] = useState<Record<string, Society>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [eventsRes, societiesRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('start_date', new Date().toISOString())
          .neq('status', 'cancelado')
          .order('start_date', { ascending: true })
          .limit(30),
        supabase.from('societies').select('id, name, color').eq('active', true),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (societiesRes.data) {
        const map: Record<string, Society> = {};
        societiesRes.data.forEach((s) => (map[s.id] = s));
        setSocieties(map);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Group events by month
  const groupedByMonth: Record<string, Event[]> = {};
  events.forEach((event) => {
    const key = format(new Date(event.start_date), "MMMM 'de' yyyy", { locale: ptBR });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(event);
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Próximos Eventos</h2>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Próximos Eventos</h2>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum evento próximo.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByMonth).map(([month, monthEvents]) => (
          <div key={month} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {month}
            </h3>
            {monthEvents.map((event) => {
              const startDate = new Date(event.start_date);
              const endDate = event.end_date ? new Date(event.end_date) : null;
              const isMySociety = event.society_id === profile?.society_id;
              const soc = event.society_id ? societies[event.society_id] : null;

              return (
                <Card
                  key={event.id}
                  className={`overflow-hidden ${isMySociety ? 'ring-1 ring-primary/30' : ''}`}
                >
                  <div
                    className="h-1"
                    style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-sm">{event.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {soc && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{ borderColor: soc.color, color: soc.color }}
                          >
                            {soc.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${statusStyles[event.status] || ''}`}>
                          {statusLabels[event.status] || event.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(startDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      {!event.all_day && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(startDate, 'HH:mm', { locale: ptBR })}
                          {endDate && ` – ${format(endDate, 'HH:mm', { locale: ptBR })}`}
                        </span>
                      )}
                      {event.all_day && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Dia inteiro</span>
                      )}
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}

                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
