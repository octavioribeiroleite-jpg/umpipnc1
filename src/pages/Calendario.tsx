import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const mockEvents = [
  {
    id: '1',
    title: 'Reunião da Diretoria',
    date: '2024-01-15',
    time: '19:00',
    color: '#10b981',
  },
  {
    id: '2',
    title: 'Culto de Jovens',
    date: '2024-01-18',
    time: '19:30',
    color: '#0d9488',
  },
  {
    id: '3',
    title: 'Retiro Espiritual',
    date: '2024-01-25',
    time: '08:00',
    color: '#6366f1',
  },
  {
    id: '4',
    title: 'Ensaio do Louvor',
    date: '2024-01-20',
    time: '15:00',
    color: '#8b5cf6',
  },
];

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
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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
    return mockEvents.filter((e) => e.date === dateStr);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-2 min-h-[80px]" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const events = getEventsForDate(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <div
        key={day}
        className={`p-2 min-h-[80px] border border-border/50 rounded-lg ${
          isToday ? 'bg-primary/10' : 'hover:bg-muted/50'
        } transition-colors cursor-pointer`}
      >
        <span
          className={`text-sm font-medium ${
            isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
          }`}
        >
          {day}
        </span>
        <div className="mt-1 space-y-1">
          {events.slice(0, 2).map((event) => (
            <div
              key={event.id}
              className="text-xs truncate px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${event.color}20`, color: event.color }}
            >
              {event.title}
            </div>
          ))}
          {events.length > 2 && (
            <span className="text-xs text-muted-foreground">+{events.length - 2} mais</span>
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
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
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{days}</div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div
                    className="w-1 h-full min-h-[40px] rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      às {event.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
