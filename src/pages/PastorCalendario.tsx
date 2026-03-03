import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, Loader2, MapPin, Clock, Calendar, Info, Link, BookOpen, ChevronDown, Download, Plus } from 'lucide-react';
import { useEvents, CalendarEvent, CreateEventInput, UpdateEventInput } from '@/hooks/useEvents';
import { EventDialog } from '@/components/calendario/EventDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarViewSelector, ViewMode } from '@/components/calendario/CalendarViewSelector';
import { DayDetailDrawer } from '@/components/calendario/DayDetailDrawer';
import { EventCard } from '@/components/calendario/EventCard';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateCalendarPDF } from '@/utils/generateCalendarPDF';
import { toast } from 'sonner';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const statusStyles: Record<string, string> = {
  confirmado: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pendente: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
};

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Color mapping for event dots (mobile)
const eventDotColors: Record<string, string> = {
  '#3b82f6': 'bg-blue-500',
  '#ef4444': 'bg-red-500',
  '#22c55e': 'bg-green-500',
  '#10b981': 'bg-emerald-500',
  '#f59e0b': 'bg-amber-500',
  '#f97316': 'bg-orange-500',
  '#8b5cf6': 'bg-violet-500',
  '#ec4899': 'bg-pink-500',
  '#06b6d4': 'bg-cyan-500',
  '#6b7280': 'bg-gray-500',
};

function getEventDotClass(color: string | null): string {
  if (!color) return 'bg-primary';
  return eventDotColors[color] || 'bg-primary';
}

export default function PastorCalendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [societyFilter, setSocietyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('fortnight');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const isMobile = useIsMobile();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { events, upcomingEvents, isLoading, createEvent, updateEvent, deleteEvent } = useEvents(month, year);

  // Fetch societies for color mapping
  const { data: societies = [] } = useQuery({
    queryKey: ['societies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('societies')
        .select('id, name, slug, color')
        .eq('active', true);
      if (error) throw error;
      return data as Society[];
    },
  });

  // Fetch meeting -> society mapping for events linked via reuniao_id
  const meetingIds = useMemo(() => {
    return events.filter(e => e.reuniao_id).map(e => e.reuniao_id!);
  }, [events]);

  const { data: meetingSocieties = {} } = useQuery({
    queryKey: ['meeting-societies', meetingIds],
    queryFn: async () => {
      if (meetingIds.length === 0) return {};
      const { data, error } = await supabase
        .from('meetings')
        .select('id, society_id')
        .in('id', meetingIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(m => { if (m.society_id) map[m.id] = m.society_id; });
      return map;
    },
    enabled: meetingIds.length > 0,
  });

  const societyMap = useMemo(() => {
    const map: Record<string, Society> = {};
    societies.forEach(s => { map[s.id] = s; });
    return map;
  }, [societies]);

  const getEventSociety = (event: CalendarEvent): Society | null => {
    if (event.reuniao_id && meetingSocieties[event.reuniao_id]) {
      return societyMap[meetingSocieties[event.reuniao_id]] || null;
    }
    return null;
  };

  const getEventColor = (event: CalendarEvent): string => {
    const society = getEventSociety(event);
    return society?.color || event.color || '#10b981';
  };

  // Filter events by society
  const filteredEvents = useMemo(() => {
    if (societyFilter === 'all') return events;
    return events.filter(e => {
      const society = getEventSociety(e);
      return society?.id === societyFilter;
    });
  }, [events, societyFilter, meetingSocieties, societyMap]);

  const filteredUpcoming = useMemo(() => {
    if (societyFilter === 'all') return upcomingEvents;
    return upcomingEvents.filter(e => {
      const society = getEventSociety(e);
      return society?.id === societyFilter;
    });
  }, [upcomingEvents, societyFilter, meetingSocieties, societyMap]);

  // Group events by day for monthly program list
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    sorted.forEach(event => {
      const d = new Date(event.start_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDownloadPDF = () => {
    if (filteredEvents.length === 0) {
      toast.info('Nenhum evento para exportar neste mês.');
      return;
    }
    const selectedSoc = societies.find(s => s.id === societyFilter);
    const filterLabel = selectedSoc ? selectedSoc.name : 'Geral';
    generateCalendarPDF({
      events: filteredEvents,
      month,
      year,
      societies,
      getEventColor: (e) => getEventColor(e as CalendarEvent),
      getEventSocietyName: (e) => {
        const soc = getEventSociety(e as CalendarEvent);
        return soc?.name || null;
      },
      filterLabel,
    });
    toast.success('PDF gerado com sucesso!');
  };

  const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => {
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

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDay(date);
    setDayDrawerOpen(true);
  };

  // Calculate visible day range for mobile view modes
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

  // Build calendar grid
  const renderCalendarGrid = () => {
    const days = [];

    if (!isMobile || viewMode === 'month') {
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-1 md:p-2 min-h-[48px] md:min-h-[80px]" />);
      }
    } else {
      const firstVisibleDow = new Date(year, month, visibleStart).getDay();
      for (let i = 0; i < firstVisibleDow; i++) {
        days.push(<div key={`empty-${i}`} className="p-1 min-h-[48px]" />);
      }
    }

    for (let day = visibleStart; day <= visibleEnd; day++) {
      const dayEvents = getEventsForDate(day);
      const isToday =
        day === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={cn(
            'p-1 md:p-2 min-h-[48px] md:min-h-[80px] border border-border/50 rounded-lg cursor-pointer transition-colors',
            isToday ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
          )}
        >
          <span
            className={cn(
              'text-xs md:text-sm font-medium',
              isToday && 'bg-primary text-primary-foreground rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-sm'
            )}
          >
            {day}
          </span>

          {/* Mobile: colored dots */}
          <div className="flex gap-0.5 mt-1 flex-wrap md:hidden">
            {dayEvents.slice(0, 3).map(event => (
              <div key={event.id} className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getEventColor(event) }} />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[10px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>
            )}
          </div>

          {/* Desktop: compact event text */}
          <div className="hidden md:block mt-1 space-y-0.5">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={cn(
                  'text-xs truncate px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80',
                  event.status === 'cancelado' && 'line-through opacity-60'
                )}
                style={{ backgroundColor: `${getEventColor(event)}20`, color: getEventColor(event) }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <span className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 2}</span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDayEvents = selectedDay ? getEventsForDate(selectedDay.getDate()) : [];
  const selectedSociety = selectedEvent ? getEventSociety(selectedEvent) : null;
  const displayedUpcoming = showAllUpcoming ? filteredUpcoming : filteredUpcoming.slice(0, 5);

  return (
    <PastorLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold">Calendário Unificado</h1>
          <Button onClick={() => handleNewEvent()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {/* Theme & Guidelines Card - collapsed by default */}
        <Collapsible defaultOpen={false}>
          <Card className="border-primary/20 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base md:text-lg">
                      Tema 2026: RENOVO — Isaías 40.31
                    </CardTitle>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                </div>
                <p className="text-sm text-muted-foreground italic mt-1">
                  "Os que esperam no Senhor renovam as suas forças."
                </p>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Ênfases Trimestrais</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {[
                      { m: 'Jan', t: 'No silêncio' },
                      { m: 'Fev', t: 'No altar' },
                      { m: 'Mar', t: 'Da história' },
                      { m: 'Abr', t: 'Pela cruz' },
                      { m: 'Mai', t: 'Nos lares' },
                      { m: 'Jun', t: 'Do compromisso' },
                      { m: 'Jul', t: 'Da alegria' },
                      { m: 'Ago', t: 'Para a missão' },
                      { m: 'Set', t: 'Na visão' },
                      { m: 'Out', t: 'Da gratidão' },
                      { m: 'Nov', t: 'Da fidelidade' },
                      { m: 'Dez', t: 'Da esperança' },
                    ].map(({ m, t }) => (
                      <div key={m} className="text-xs rounded-md border border-border/50 px-2 py-1.5 bg-background">
                        <span className="font-semibold">{m}:</span> {t}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Diretrizes de Planejamento</h3>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Investir tempo no planejamento das atividades para o ano de 2026.</li>
                    <li>Reunir a Executiva para discutir os trabalhos e demandas da Sociedade.</li>
                    <li>Notificar a Junta Diaconal (Pres. Dc. Tiago) sobre reuniões e necessidades.</li>
                    <li>Informar antecipadamente os avisos à Superintendência da EBD.</li>
                    <li>Preparar a Sociedade para as programações de Março (Aniversário da Igreja).</li>
                    <li>Trabalhar o tema anual e trimestral junto à Sociedade.</li>
                  </ol>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-base md:text-lg min-w-[160px] text-center">
                    {months[month]} {year}
                  </CardTitle>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={societyFilter} onValueChange={setSocietyFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs md:text-sm">
                      <SelectValue placeholder="Todas as Sociedades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Sociedades</SelectItem>
                      {societies.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleDownloadPDF} title="Gerar PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile View Selector */}
              <CalendarViewSelector viewMode={viewMode} onViewModeChange={setViewMode} />

              {/* Color Legend */}
              {societies.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2">
                  {societies.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-medium text-muted-foreground">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1 md:mb-2">
                    {daysOfWeek.map(day => (
                      <div key={day} className="text-center text-[10px] md:text-sm font-medium text-muted-foreground p-1 md:p-2">
                        {isMobile ? day.charAt(0) : day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 md:gap-1">{renderCalendarGrid()}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events - limited to 5 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUpcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 italic">
                  Nenhum evento próximo
                </p>
              ) : (
                <div className="space-y-2">
                  {displayedUpcoming.map(event => {
                    const society = getEventSociety(event);
                    const color = getEventColor(event);
                    return (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="flex items-start gap-2.5 p-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="w-1 min-h-[36px] rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className={cn('font-medium text-sm truncate', event.status === 'cancelado' && 'line-through opacity-60')}>
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.start_date), "dd/MM", { locale: ptBR })}
                            </span>
                            {!event.all_day && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.start_date), "HH:mm")}
                              </span>
                            )}
                          </div>
                          {society && (
                            <span className="text-[10px] font-medium" style={{ color: society.color }}>
                              {society.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredUpcoming.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                    >
                      {showAllUpcoming ? 'Mostrar menos' : `Ver todos (${filteredUpcoming.length})`}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Program List */}
        {!isLoading && eventsByDay.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">
                Programações de {months[month]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventsByDay.map(([dateKey, dayEvents]) => {
                const date = new Date(dateKey + 'T12:00:00');
                return (
                  <div key={dateKey}>
                    <h3 className="text-sm font-semibold text-foreground capitalize mb-2 pb-1 border-b border-border/60">
                      {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <div className="space-y-2">
                      {dayEvents.map(event => {
                        const society = getEventSociety(event);
                        const color = getEventColor(event);
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="flex gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                            style={{ borderLeftWidth: '3px', borderLeftColor: color }}
                          >
                            <div className="flex flex-col items-center pt-0.5">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn('font-medium text-sm truncate', event.status === 'cancelado' && 'line-through opacity-60')}>
                                  {event.title}
                                </span>
                                {society && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
                                    {society.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {event.all_day ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Dia inteiro
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(event.start_date), 'HH:mm')}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">{event.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <DayDetailDrawer
        date={selectedDay}
        events={selectedDayEvents}
        open={dayDrawerOpen}
        onOpenChange={setDayDrawerOpen}
        onEventClick={(event) => {
          setDayDrawerOpen(false);
          handleEventClick(event);
        }}
        onNewEvent={(date) => handleNewEvent(date)}
      />

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onSave={handleSave}
        onDelete={selectedEvent ? handleDelete : undefined}
        isLoading={createEvent.isPending || updateEvent.isPending || deleteEvent.isPending}
      />
    </PastorLayout>
  );
}
