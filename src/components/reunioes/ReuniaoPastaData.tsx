import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ReuniaoPastaDataProps {
  date: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ReuniaoPastaData({ date, count, children }: ReuniaoPastaDataProps) {
  const parsedDate = parseISO(date);
  const day = format(parsedDate, 'dd', { locale: ptBR });
  const month = format(parsedDate, 'MMM', { locale: ptBR }).replace('.', '');
  const weekday = format(parsedDate, 'EEEE', { locale: ptBR });

  return (
    <div className="relative flex gap-3">
      <div className="flex w-14 shrink-0 flex-col items-center">
        <div className="z-10 flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-card dark:text-emerald-300">
          <span className="text-lg font-black leading-none">{day}</span>
          <span className="text-[10px] font-bold uppercase leading-none">{month}</span>
        </div>
        <div className="mt-2 h-full min-h-6 w-px bg-border" />
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {weekday}
            </p>
            <p className="text-xs text-muted-foreground">
              {count} {count === 1 ? 'reunião' : 'reuniões'} neste dia
            </p>
          </div>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              'border-border bg-card text-muted-foreground'
            )}
          >
            Timeline
          </span>
        </div>

        <div className="space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
