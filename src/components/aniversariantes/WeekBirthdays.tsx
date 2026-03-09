import { CalendarDays } from 'lucide-react';
import { BirthdayCard } from './BirthdayCard';
import type { Birthday } from '@/hooks/useBirthdays';

interface Props {
  birthdays: (Birthday & { daysUntil: number })[];
  showActions?: boolean;
  onEdit?: (b: Birthday) => void;
  onToggleActive?: (b: Birthday) => void;
  onDelete?: (b: Birthday) => void;
}

export function WeekBirthdays({ birthdays, showActions, onEdit, onToggleActive, onDelete }: Props) {
  if (birthdays.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-sky-500" />
        <h2 className="font-semibold text-sm">Próximos 7 dias</h2>
      </div>
      <div className="space-y-2">
        {birthdays.map(b => (
          <BirthdayCard key={b.id} birthday={b} highlight="week" showActions={showActions} onEdit={onEdit} onToggleActive={onToggleActive} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
