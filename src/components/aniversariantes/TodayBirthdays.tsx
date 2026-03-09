import { PartyPopper } from 'lucide-react';
import { BirthdayCard } from './BirthdayCard';
import type { Birthday } from '@/hooks/useBirthdays';

interface Props {
  birthdays: Birthday[];
  showActions?: boolean;
  onEdit?: (b: Birthday) => void;
  onToggleActive?: (b: Birthday) => void;
  onDelete?: (b: Birthday) => void;
}

export function TodayBirthdays({ birthdays, showActions, onEdit, onToggleActive, onDelete }: Props) {
  if (birthdays.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <PartyPopper className="h-5 w-5 text-emerald-500" />
        <h2 className="font-semibold text-sm">Aniversários de hoje</h2>
      </div>
      <div className="space-y-2">
        {birthdays.map(b => (
          <BirthdayCard key={b.id} birthday={b} highlight="today" showActions={showActions} onEdit={onEdit} onToggleActive={onToggleActive} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
