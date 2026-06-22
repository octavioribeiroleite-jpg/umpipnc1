import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MetricCardTone = 'default' | 'success' | 'danger' | 'warning' | 'info';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  tone?: MetricCardTone;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
}

const toneClasses: Record<MetricCardTone, { value: string; icon: string }> = {
  default: {
    value: 'text-slate-950 dark:text-slate-50',
    icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  success: {
    value: 'text-emerald-700 dark:text-emerald-300',
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  danger: {
    value: 'text-red-600 dark:text-red-300',
    icon: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  },
  warning: {
    value: 'text-amber-700 dark:text-amber-300',
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  info: {
    value: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  tone = 'default',
  onClick,
  className,
  valueClassName,
}: MetricCardProps) {
  const styles = toneClasses[tone];
  const rootClassName = cn(
    'app-card-surface flex min-h-[82px] w-full min-w-0 items-center justify-between gap-3 text-left md:min-h-[102px]',
    onClick && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-panel active:scale-[0.99]',
    className,
  );

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400 xs:text-sm">
          {title}
        </p>
        <p
          className={cn(
            'text-metric-responsive mt-1 min-w-0 break-words tabular-nums',
            styles.value,
            valueClassName,
          )}
        >
          {value}
        </p>
        {description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400 xs:text-xs">
            {description}
          </p>
        )}
      </div>

      {Icon && (
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] md:h-12 md:w-12 md:rounded-2xl', styles.icon)}>
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rootClassName}>
        {content}
      </button>
    );
  }

  return <div className={rootClassName}>{content}</div>;
}
