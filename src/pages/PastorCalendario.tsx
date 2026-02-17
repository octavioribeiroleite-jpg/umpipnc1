import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  start_date: string;
  status: string;
  location: string | null;
  color: string | null;
}

export default function PastorCalendario() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    supabase.from('events').select('id, title, start_date, status, location, color')
      .order('start_date', { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });
  }, []);

  const eventsOnDate = events.filter(e => isSameDay(new Date(e.start_date), selectedDate));
  const upcomingEvents = events
    .filter(e => new Date(e.start_date) >= new Date())
    .slice(0, 10);

  // Dates with events for calendar highlighting
  const eventDates = events.map(e => new Date(e.start_date));

  return (
    <PastorLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Calendário Unificado</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{ hasEvent: 'bg-primary/20 font-bold' }}
              />
            </CardContent>
          </Card>

          {/* Events on selected date */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsOnDate.length > 0 ? (
                <div className="space-y-3">
                  {eventsOnDate.map(e => (
                    <div key={e.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                      <div className="h-3 w-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: e.color || 'hsl(var(--primary))' }} />
                      <div>
                        <p className="font-medium text-sm">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(e.start_date), "HH:mm", { locale: ptBR })}
                          {e.location && ` • ${e.location}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum evento nesta data.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color || 'hsl(var(--primary))' }} />
                      <span className="font-medium">{e.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(e.start_date), "dd/MM/yy", { locale: ptBR })}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhum evento próximo.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PastorLayout>
  );
}
