import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  icon,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 [&_svg]:h-4.5 [&_svg]:w-4.5 sm:h-10 sm:w-10 sm:[&_svg]:h-5 sm:[&_svg]:w-5">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-section-title truncate text-slate-950 dark:text-slate-50">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="w-full flex-shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
