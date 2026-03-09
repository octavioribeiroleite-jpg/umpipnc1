import { useNavigate } from 'react-router-dom';
import { Cake, ChevronRight } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { useBirthdays, getDaysUntilBirthday } from '@/hooks/useBirthdays';

export function HomeBirthdayCard() {
  const navigate = useNavigate();
  const { todayBirthdays, weekBirthdays, isLoading } = useBirthdays();

  if (isLoading) return null;

  const allUpcoming = [
    ...todayBirthdays.map(b => ({ ...b, daysUntil: 0 })),
    ...weekBirthdays,
  ].slice(0, 5);

  if (allUpcoming.length === 0) return null;

  return (
    <AppCard className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Aniversários da semana</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/aniversariantes')}>
          Ver todos <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {allUpcoming.map(b => {
          const dateStr = `${String(b.dia).padStart(2, '0')}/${String(b.mes).padStart(2, '0')}`;
          return (
            <div key={b.id} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground w-12 text-xs">{dateStr}</span>
              <span className="truncate flex-1">{b.nome}</span>
              {b.daysUntil === 0 && <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">🎉 Hoje!</span>}
            </div>
          );
        })}
      </div>
    </AppCard>
  );
}
