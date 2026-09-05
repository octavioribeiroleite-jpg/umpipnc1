import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SummaryTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info';
export type SummaryDensity = 'compact' | 'regular' | 'featured';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: LucideIcon;
  tone?: SummaryTone;
  density?: SummaryDensity;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
  metaClassName?: string;
}

const toneClasses: Record<SummaryTone, { value: string; icon: string }> = {
  neutral: {
    value: 'text-slate-950 dark:text-slate-50',
    icon: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  positive: {
    value: 'text-emerald-700 dark:text-emerald-300',
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300',
  },
  negative: {
    value: 'text-red-600 dark:text-red-300',
    icon: 'bg-red-50 text-red-600 dark:bg-red-950/45 dark:text-red-300',
  },
  warning: {
    value: 'text-amber-600 dark:text-amber-300',
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/45 dark:text-amber-300',
  },
  info: {
    value: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-300',
  },
};

const densityClasses: Record<SummaryDensity, {
  root: string;
  iconBox: string;
  icon: string;
  label: string;
  value: string;
  meta: string;
}> = {
  compact: {
    root: 'min-h-[72px] gap-2.5 rounded-[16px] px-3 py-2.5 md:min-h-[80px] md:px-3.5 md:py-3',
    iconBox: 'h-8 w-8 rounded-[11px] md:h-9 md:w-9 md:rounded-xl',
    icon: 'h-4 w-4 md:h-[18px] md:w-[18px]',
    label: 'text-[11px] leading-tight md:text-xs',
    value: 'mt-1 text-[clamp(1.05rem,4vw,1.45rem)] leading-none md:text-[clamp(1.1rem,1.7vw,1.55rem)]',
    meta: 'mt-1 text-[10px] leading-tight md:text-[11px]',
  },
  regular: {
    root: 'min-h-[88px] gap-3 rounded-[18px] px-3.5 py-3 md:min-h-[98px] md:px-4 md:py-3.5',
    iconBox: 'h-9 w-9 rounded-xl md:h-10 md:w-10 md:rounded-[14px]',
    icon: 'h-[18px] w-[18px] md:h-5 md:w-5',
    label: 'text-xs leading-tight md:text-sm',
    value: 'mt-1.5 text-[clamp(1.2rem,4.4vw,1.75rem)] leading-none md:text-[clamp(1.3rem,2vw,1.9rem)]',
    meta: 'mt-1.5 text-[11px] leading-snug md:text-xs',
  },
  featured: {
    root: 'min-h-[104px] gap-3.5 rounded-[20px] px-4 py-4 md:min-h-[118px] md:px-5 md:py-[1.125rem]',
    iconBox: 'h-10 w-10 rounded-[14px] md:h-12 md:w-12 md:rounded-2xl',
    icon: 'h-5 w-5 md:h-6 md:w-6',
    label: 'text-xs leading-tight md:text-sm',
    value: 'mt-2 text-[clamp(1.5rem,5vw,2.15rem)] leading-none md:text-[clamp(1.7rem,2.5vw,2.4rem)]',
    meta: 'mt-2 text-xs leading-snug md:text-sm',
  },
};

function renderValue(value: ReactNode) {
  if (typeof value !== 'string') return value;
  const currencyMatch = value.match(/^R\$\s*(.+)$/);
  if (!currencyMatch) return value;

  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1">
      <span className="text-[0.62em] font-bold tracking-normal opacity-70">R$</span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{currencyMatch[1]}</span>
    </span>
  );
}

export function SummaryCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = 'neutral',
  density = 'regular',
  onClick,
  className,
  valueClassName,
  metaClassName,
}: SummaryCardProps) {
  const styles = toneClasses[tone];
  const densityStyle = densityClasses[density];
  const rootClassName = cn(
    'summary-card flex w-full min-w-0 flex-col items-start border border-border/70 bg-card/95 text-left shadow-sm',
    densityStyle.root,
    onClick && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-[0.99]',
    className,
  );

  const content = (
    <>
      {Icon && (
        <div className={cn('flex flex-shrink-0 items-center justify-center', densityStyle.iconBox, styles.icon)}>
          <Icon className={densityStyle.icon} />
        </div>
      )}

      <div className="summary-card-content w-full min-w-0 flex-1">
        <p className={cn('summary-label whitespace-normal break-words font-medium text-slate-600 dark:text-slate-300', densityStyle.label)}>
          {label}
        </p>
        <div
          className={cn(
            'summary-value min-w-0 font-extrabold tracking-[-0.025em] tabular-nums',
            densityStyle.value,
            styles.value,
            valueClassName,
          )}
        >
          {renderValue(value)}
        </div>
        {meta !== undefined && meta !== null && (
          <div className={cn('summary-meta whitespace-normal break-words font-medium text-slate-500 dark:text-slate-400', densityStyle.meta, metaClassName)}>
            {meta}
          </div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rootClassName} data-summary-card="true">
        {content}
      </button>
    );
  }

  return (
    <div className={rootClassName} data-summary-card="true">
      {content}
    </div>
  );
}
