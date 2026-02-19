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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', now)
        .neq('status', 'cancelado')
        .order('start_date', { ascending: true })
        .limit(20);

      if (data) setEvents(data as Event[]);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Próximos Eventos</h2>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
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
        <div className="space-y-3">
          {events.map((event) => {
            const startDate = new Date(event.start_date);
            const isMySociety = event.society_id === profile?.society_id;
            return (
              <Card key={event.id} className="overflow-hidden">
                <div
                  className="h-1"
                  style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-sm">{event.title}</h3>
                    <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${statusStyles[event.status] || ''}`}>
                      {statusLabels[event.status] || event.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.all_day
                        ? format(startDate, "dd 'de' MMMM", { locale: ptBR })
                        : format(startDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
