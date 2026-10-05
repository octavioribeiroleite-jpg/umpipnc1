import { useNavigate } from 'react-router-dom';
import { Cake, ChevronRight } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { useBirthdays } from '@/hooks/useBirthdays';
import { useQueryClient } from '@tanstack/react-query';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Skeleton } from '@/components/ui/skeleton';

export function HomeBirthdayCard() {
  const navigate = useNavigate();
  const { todayBirthdays, weekBirthdays, isError, isFetching, refetch } = useBirthdays();
  const queryClient = useQueryClient();
  const hasSnapshot = queryClient.getQueryState(['aniversariantes', 'main'])?.data !== undefined;

  if (!hasSnapshot && !isError) return <Skeleton aria-label="Consultando aniversariantes" className="h-24 rounded-card" />;

  const allUpcoming = [
    ...todayBirthdays.map(b => ({ ...b, daysUntil: 0 })),
    ...weekBirthdays,
  ].slice(0, 5);

  if (allUpcoming.length === 0 && !isError) return null;

  return (
    <section className="space-y-3 mb-4">
    {isError && <QueryErrorState message="Não foi possível consultar os aniversariantes." onRetry={() => void refetch()} retrying={isFetching} hasPreviousData={hasSnapshot} />}
    {hasSnapshot && allUpcoming.length > 0 && <AppCard>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Aniversários da semana</h3>
        </div>
        <Button variant="ghost" size="sm" className="min-h-11 text-sm" onClick={() => navigate('/aniversariantes')}>
          Ver todos <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {allUpcoming.map(b => {
          const dateStr = `${String(b.dia).padStart(2, '0')}/${String(b.mes).padStart(2, '0')}`;
          return (
            <div key={b.id} className="flex min-h-12 items-center gap-2 text-base">
              <span className="shrink-0 font-medium text-muted-foreground w-12 text-xs">{dateStr}</span>
              <span className="min-w-0 whitespace-normal break-words flex-1">{b.nome}</span>
              {b.daysUntil === 0 && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">🎉 Hoje!</span>}
            </div>
          );
        })}
      </div>
    </AppCard>}
    </section>
  );
}
