import { Gift } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import type { Birthday } from '@/hooks/useBirthdays';

interface Props {
  birthday: (Birthday & { daysUntil: number }) | null;
}

export function NextBirthdayCard({ birthday }: Props) {
  if (!birthday) return null;
  const dateStr = `${String(birthday.dia).padStart(2, '0')}/${String(birthday.mes).padStart(2, '0')}`;

  return (
    <AppCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próximo aniversariante</p>
          <p className="font-semibold text-base min-w-0 whitespace-normal break-words">{birthday.nome}</p>
          <p className="text-sm text-muted-foreground">{dateStr} — faltam {birthday.daysUntil} dia{birthday.daysUntil !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </AppCard>
  );
}
