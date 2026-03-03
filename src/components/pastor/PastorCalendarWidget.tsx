import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppCard } from '@/components/ui/app-card';
import type { CalendarEvent } from '@/hooks/useEvents';

interface Props {
  events: CalendarEvent[];
  selectedDate: Date;
  onDaySelect: (date: Date) => void;
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(month: number, year: number) {
  return new Date(year, month, 1).getDay();
}

export function PastorCalendarWidget({
  events, selectedDate, onDaySelect,
  currentMonth, currentYear,
  onPrevMonth, onNextMonth, onToday,
}: Props) {
  const today = new Date();

  // Group events by local day key "YYYY-MM-DD"
  const eventsByDay = useMemo(() => {
    const map: Record<string, string[]> = {}; // dayKey -> array of colors
    for (const ev of events) {
      const d = new Date(ev.start_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev.color || '#6b7280');
    }
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfWeek(currentMonth, currentYear);

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AppCard noPadding>
      <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold min-w-[140px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onToday}>
          Hoje
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-11" />;

          const date = new Date(currentYear, currentMonth, day);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const dayKey = `${currentYear}-${currentMonth}-${day}`;
          const colors = eventsByDay[dayKey] || [];
          const uniqueColors = [...new Set(colors)];
          const showDots = uniqueColors.slice(0, 3);
          const extra = colors.length > 3 ? colors.length - 3 : 0;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDaySelect(date)}
              className={[
                'flex flex-col items-center justify-center h-11 rounded-xl transition-all relative',
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold'
                  : isToday
                    ? 'ring-2 ring-primary ring-inset font-semibold text-foreground'
                    : 'text-foreground hover:bg-muted/60',
              ].join(' ')}
            >
              <span className="text-sm leading-none">{day}</span>
              {colors.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {showDots.map((c, j) => (
                    <span
                      key={j}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : c }}
                    />
                  ))}
                  {extra > 0 && (
                    <span className={`text-[8px] leading-none font-bold ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      +{extra}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      </div>
    </AppCard>
  );
}
