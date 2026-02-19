import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEvents, CalendarEvent, CreateEventInput, UpdateEventInput } from '@/hooks/useEvents';
import { EventDialog } from '@/components/calendario/EventDialog';
import { EventCard } from '@/components/calendario/EventCard';
import { CalendarViewSelector, ViewMode } from '@/components/calendario/CalendarViewSelector';
import { DayDetailDrawer } from '@/components/calendario/DayDetailDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Color mapping for event dots
const eventDotColors: Record<string, string> = {
  '#3b82f6': 'bg-blue-500',
  '#ef4444': 'bg-red-500',
  '#22c55e': 'bg-green-500',
  '#f59e0b': 'bg-amber-500',
  '#8b5cf6': 'bg-violet-500',
  '#ec4899': 'bg-pink-500',
  '#06b6d4': 'bg-cyan-500',
};

function getEventDotClass(color: string | null): string {
  if (!color) return 'bg-primary';
  return eventDotColors[color] || 'bg-primary';
}

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('fortnight');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);

  const isMobile = useIsMobile();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { events, upcomingEvents, isLoading, createEvent, updateEvent, deleteEvent } = useEvents(month, year);
  const { isManagement } = useAuth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      const eventDate = toLocalDateString(new Date(e.start_date));
      return eventDate === dateStr;
    });
  };

  const handleNewEvent = (prefillDate?: Date) => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDay(date);
    setDayDrawerOpen(true);
  };

  const handleSave = (data: CreateEventInput | UpdateEventInput) => {
    if ('id' in data && data.id) {
      updateEvent.mutate(data as UpdateEventInput, { onSuccess: () => setDialogOpen(false) });
    } else {
      createEvent.mutate(data as CreateEventInput, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    deleteEvent.mutate(id, { onSuccess: () => setDialogOpen(false) });
  };

  // Calculate visible day range for mobile
  const getVisibleDays = (): { start: number; end: number } => {
    if (!isMobile || viewMode === 'month') {
      return { start: 1, end: daysInMonth };
    }
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const currentDay = isCurrentMonth ? today.getDate() : 1;

    if (viewMode === 'week') {
      const dayOfWeek = new Date(year, month, currentDay).getDay();
      const weekStart = currentDay - dayOfWeek;
      const start = Math.max(1, weekStart);
      const end = Math.min(daysInMonth, start + 6);
      return { start, end };
    }

    // fortnight
    if (currentDay <= 15) {
      return { start: 1, end: Math.min(15, daysInMonth) };
    }
    return { start: 16, end: daysInMonth };
  };

  const { start: visibleStart, end: visibleEnd } = getVisibleDays();

  // Build grid cells
  const renderCalendarGrid = () => {
    const days = [];

    if (!isMobile || viewMode === 'month') {
      // Full month view with leading empties
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-1 md:p-2 min-h-[48px] md:min-h-[80px]" />);
      }
    } else {
      // Partial views: add leading empties for the first visible day's weekday
      const firstVisibleDow = new Date(year, month, visibleStart).getDay();
      for (let i = 0; i < firstVisibleDow; i++) {
        days.push(<div key={`empty-${i}`} className="p-1 min-h-[48px]" />);
      }
    }

    for (let day = visibleStart; day <= visibleEnd; day++) {
      const dayEvents = getEventsForDate(day);
      const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`p-1 md:p-2 min-h-[48px] md:min-h-[80px] border border-border/50 rounded-lg cursor-pointer ${
            isToday ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
          } transition-colors`}
        >
          <span
            className={`text-sm font-semibold ${
              isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs' : ''
            }`}
          >
            {day}
          </span>

          {/* Mobile: colored dots */}
          <div className="flex gap-0.5 mt-1 flex-wrap md:hidden">
            {dayEvents.slice(0, 3).map((event) => (
              <div key={event.id} className={`w-2 h-2 rounded-full ${getEventDotClass(event.color)}`} />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[10px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>
            )}
          </div>

          {/* Desktop: compact event cards */}
          <div className="hidden md:block mt-1 space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <EventCard key={event.id} event={event} compact onClick={() => handleEventClick(event)} />
            ))}
            {dayEvents.length > 2 && (
              <span className="text-xs text-muted-foreground">+{dayEvents.length - 2} mais</span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDayEvents = selectedDay ? getEventsForDate(selectedDay.getDate()) : [];

  return (
    <AppLayout>
      <PageHeader
        title="Calendário"
        description="Visualize e gerencie os eventos"
        action={
          isManagement && (
            <Button onClick={() => handleNewEvent()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 md:pb-4">
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
            <CalendarViewSelector viewMode={viewMode} onViewModeChange={setViewMode} />
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1 md:mb-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground p-1 md:p-2">
                      <span className="md:hidden">{day.charAt(0)}</span>
                      <span className="hidden md:inline">{day}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5 md:gap-1">{renderCalendarGrid()}</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events - hidden on mobile */}
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento próximo</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Day Detail Drawer */}
      <DayDetailDrawer
        date={selectedDay}
        events={selectedDayEvents}
        open={dayDrawerOpen}
        onOpenChange={setDayDrawerOpen}
        onEventClick={(event) => {
          setDayDrawerOpen(false);
          handleEventClick(event);
        }}
        onNewEvent={isManagement ? (date) => handleNewEvent(date) : undefined}
      />

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
