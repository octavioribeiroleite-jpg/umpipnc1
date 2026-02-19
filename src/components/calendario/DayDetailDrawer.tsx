import { CalendarEvent } from '@/hooks/useEvents';
import { EventCard } from './EventCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';

const weekDayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface DayDetailDrawerProps {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent?: (date: Date) => void;
}

export function DayDetailDrawer({ date, events, open, onOpenChange, onEventClick, onNewEvent }: DayDetailDrawerProps) {
  if (!date) return null;

  const title = `${weekDayNames[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()]}`;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {events.length === 0 ? 'Nenhum evento neste dia' : `${events.length} evento${events.length > 1 ? 's' : ''}`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-3 py-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
          ))}
        </div>

        {onNewEvent && (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              onOpenChange(false);
              onNewEvent(date);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
