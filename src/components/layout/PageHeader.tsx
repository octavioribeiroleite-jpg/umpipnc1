import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderVariant = 'auto' | 'compact' | 'hero';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  eyebrow?: string;
  variant?: PageHeaderVariant;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  icon,
  eyebrow,
  variant = 'auto',
  className,
}: PageHeaderProps) {
  return (
    <section className={cn(
      'ipnc-page-header mb-4 min-w-0 rounded-2xl border border-border bg-card p-[16px] text-card-foreground shadow-sm md:mb-5 md:p-[20px]',
      variant === 'hero' && 'md:p-6',
      className,
    )}>
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="ipnc-page-heading flex min-w-0 flex-1 items-start gap-[12px]">
          {icon && (
            <div className="ipnc-page-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-[20px] [&_svg]:w-[20px]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
            <h1 className="break-words font-display text-page-title font-bold leading-tight tracking-tight">{title}</h1>
            {description && <p className="mt-1 max-w-3xl text-base leading-relaxed text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:max-w-[50%] [&>button]:w-full md:[&>button]:w-auto">{action}</div>}
      </div>
    </section>
  );
}
