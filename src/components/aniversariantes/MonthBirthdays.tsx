import { Calendar } from 'lucide-react';
import { BirthdayCard } from './BirthdayCard';
import type { Birthday } from '@/hooks/useBirthdays';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Props {
  birthdays: Birthday[];
  month: number;
  showActions?: boolean;
  onEdit?: (b: Birthday) => void;
  onToggleActive?: (b: Birthday) => void;
  onDelete?: (b: Birthday) => void;
}

export function MonthBirthdays({ birthdays, month, showActions, onEdit, onToggleActive, onDelete }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-sm">Aniversariantes de {MONTH_NAMES[month - 1]}</h2>
        <span className="text-xs text-muted-foreground">({birthdays.length})</span>
      </div>
      {birthdays.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-7">Nenhum aniversariante neste mês.</p>
      ) : (
        <div className="space-y-1.5">
          {birthdays.map(b => (
            <BirthdayCard key={b.id} birthday={b} showActions={showActions} onEdit={onEdit} onToggleActive={onToggleActive} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
