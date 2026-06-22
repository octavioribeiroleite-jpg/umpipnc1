import { useNavigate } from 'react-router-dom';
import { ChevronRight, DollarSign, ListTodo, Users } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { cn } from '@/lib/utils';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietyStats {
  membersActive: number;
  saldo: number;
  tasksPending: number;
}

interface Props {
  society: Society;
  stats?: SocietyStats;
}

export function SocietyOverviewCard({ society, stats }: Props) {
  const navigate = useNavigate();
  const formattedBalance = stats
    ? `R$ ${stats.saldo < 0 ? '-' : ''}${Math.abs(stats.saldo).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
    : '';

  return (
    <AppCard
      variant="interactive"
      colorStripe={society.color}
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
      className="min-w-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: society.color }}
          >
            {society.name.substring(0, 3)}
          </div>
          <p className="truncate text-sm font-semibold">{society.name}</p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>

      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="truncate text-[10px] font-medium">Membros</span>
            </div>
            <p className="mt-1 truncate text-sm font-bold tabular-nums text-foreground">
              {stats.membersActive}
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="truncate text-[10px] font-medium">Saldo</span>
            </div>
            <p
              className={cn(
                'mt-1 truncate text-sm font-bold tabular-nums',
                stats.saldo >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300',
              )}
            >
              {formattedBalance}
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="truncate text-[10px] font-medium">Pendentes</span>
            </div>
            <p
              className={cn(
                'mt-1 truncate text-sm font-bold tabular-nums',
                stats.tasksPending > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-foreground',
              )}
            >
              {stats.tasksPending}
            </p>
          </div>
        </div>
      )}
    </AppCard>
  );
}
