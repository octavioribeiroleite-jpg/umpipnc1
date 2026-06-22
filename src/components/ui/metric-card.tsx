import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MetricCardTone = 'default' | 'success' | 'danger' | 'warning' | 'info';
export type MetricCardDensity = 'compact' | 'regular';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  tone?: MetricCardTone;
  density?: MetricCardDensity;
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
  density = 'regular',
  onClick,
  className,
  valueClassName,
}: MetricCardProps) {
  const styles = toneClasses[tone];
  const compact = density === 'compact';

  const rootClassName = cn(
    'w-full min-w-0 items-center justify-between text-left',
    compact
      ? 'flex min-h-[64px] gap-2 rounded-[14px] border border-border/70 bg-card/95 px-2.5 py-2 shadow-sm sm:min-h-[70px] sm:px-3 md:min-h-[82px] md:rounded-[16px] md:px-3.5 md:py-2.5'
      : 'app-card-surface flex min-h-[82px] gap-3 md:min-h-[102px]',
    onClick && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-panel active:scale-[0.99]',
    className,
  );

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate font-semibold text-slate-500 dark:text-slate-400',
            compact ? 'text-[10px] leading-none xs:text-[11px] md:text-xs' : 'text-xs xs:text-sm',
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'min-w-0 tabular-nums',
            compact
              ? 'mt-1 truncate text-[17px] font-extrabold leading-none tracking-tight xs:text-[18px] md:text-[21px]'
              : 'text-metric-responsive mt-1 break-words',
            styles.value,
            valueClassName,
          )}
        >
          {value}
        </p>
        {description && (
          <p
            className={cn(
              'text-slate-500 dark:text-slate-400',
              compact
                ? 'mt-1 truncate text-[9px] leading-none xs:text-[10px] md:text-[11px]'
                : 'mt-1 line-clamp-2 text-[11px] leading-snug xs:text-xs',
            )}
          >
            {description}
          </p>
        )}
      </div>

      {Icon && (
        <div
          className={cn(
            'flex flex-shrink-0 items-center justify-center',
            compact
              ? 'h-8 w-8 rounded-[11px] md:h-9 md:w-9 md:rounded-xl'
              : 'h-10 w-10 rounded-[14px] md:h-12 md:w-12 md:rounded-2xl',
            styles.icon,
          )}
        >
          <Icon className={compact ? 'h-4 w-4 md:h-[18px] md:w-[18px]' : 'h-5 w-5 md:h-6 md:w-6'} />
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
