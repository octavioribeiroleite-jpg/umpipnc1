import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEvents, CalendarEvent, CreateEventInput, UpdateEventInput } from '@/hooks/useEvents';
import { EventDialog } from '@/components/calendario/EventDialog';
import { EventCard } from '@/components/calendario/EventCard';
import { useAuth } from '@/contexts/AuthContext';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { events, upcomingEvents, isLoading, createEvent, updateEvent, deleteEvent } = useEvents(month, year);
  const { isManagement } = useAuth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      const eventDate = new Date(e.start_date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleSave = (data: CreateEventInput | UpdateEventInput) => {
    if ('id' in data && data.id) {
      updateEvent.mutate(data as UpdateEventInput, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createEvent.mutate(data as CreateEventInput, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteEvent.mutate(id, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-2 min-h-[80px]" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDate(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <div
        key={day}
        className={`p-2 min-h-[80px] border border-border/50 rounded-lg ${
          isToday ? 'bg-primary/10' : 'hover:bg-muted/50'
        } transition-colors`}
      >
        <span
          className={`text-sm font-medium ${
            isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
          }`}
        >
          {day}
        </span>
        <div className="mt-1 space-y-1">
          {dayEvents.slice(0, 2).map((event) => (
            <EventCard
              key={event.id}
              event={event}
              compact
              onClick={() => handleEventClick(event)}
            />
          ))}
          {dayEvents.length > 2 && (
            <span className="text-xs text-muted-foreground">+{dayEvents.length - 2} mais</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Calendário"
        description="Visualize e gerencie os eventos"
        action={
          isManagement && (
            <Button onClick={handleNewEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {months[month]} {year}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">{days}</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento próximo
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onSave={handleSave}
        onDelete={isManagement ? handleDelete : undefined}
        isLoading={createEvent.isPending || updateEvent.isPending || deleteEvent.isPending}
      />
    </AppLayout>
  );
}
