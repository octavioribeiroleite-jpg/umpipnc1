import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, Loader2, MapPin, Clock, Calendar, Info, Link, BookOpen, ChevronDown, Download } from 'lucide-react';
import { useEvents, CalendarEvent } from '@/hooks/useEvents';
import { useIsMobile } from '@/hooks/use-mobile';
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

export default function PastorCalendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [societyFilter, setSocietyFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { events, upcomingEvents, isLoading } = useEvents(month, year);

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

  // Get society for an event (via reuniao_id -> meeting -> society_id)
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

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => {
      const eventDate = new Date(e.start_date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // Build calendar grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-1 md:p-2 min-h-[48px] md:min-h-[80px]" />);
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
        className={cn(
          'p-1 md:p-2 min-h-[48px] md:min-h-[80px] border border-border/50 rounded-lg transition-colors',
          isToday ? 'bg-primary/10' : 'hover:bg-muted/50'
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
        <div className="mt-0.5 md:mt-1 space-y-0.5 md:space-y-1">
          {dayEvents.slice(0, isMobile ? 1 : 2).map(event => (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              className={cn(
                'text-[9px] md:text-xs truncate px-1 md:px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80',
                event.status === 'cancelado' && 'line-through opacity-60'
              )}
              style={{ backgroundColor: `${getEventColor(event)}20`, color: getEventColor(event) }}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > (isMobile ? 1 : 2) && (
            <span className="text-[9px] md:text-xs text-muted-foreground pl-1">
              +{dayEvents.length - (isMobile ? 1 : 2)}
            </span>
          )}
        </div>
      </div>
    );
  }

  const selectedSociety = selectedEvent ? getEventSociety(selectedEvent) : null;

  return (
    <PastorLayout>
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-lg md:text-xl font-bold">Calendário Unificado</h1>

        {/* Theme & Guidelines Card */}
        <Collapsible>
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
                  <div className="grid grid-cols-7 gap-0.5 md:gap-1">{days}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
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
                  {filteredUpcoming.map(event => {
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog (read-only) */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{selectedEvent?.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Detalhes do evento</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', statusStyles[selectedEvent.status])}>
                  {statusLabels[selectedEvent.status]}
                </Badge>
                {selectedEvent.origem === 'reuniao' && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Link className="h-3 w-3" />
                    Via reunião
                  </Badge>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {format(new Date(selectedEvent.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {selectedEvent.end_date && (
                      <> até {format(new Date(selectedEvent.end_date), "dd 'de' MMMM", { locale: ptBR })}</>
                    )}
                  </span>
                </div>

                {!selectedEvent.all_day && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>{format(new Date(selectedEvent.start_date), "HH:mm")}</span>
                  </div>
                )}

                {selectedEvent.all_day && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>Dia inteiro</span>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedSociety && (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedSociety.color }} />
                    <span className="font-medium" style={{ color: selectedSociety.color }}>
                      {selectedSociety.name}
                    </span>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </PastorLayout>
  );
}
