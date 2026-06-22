import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderVariant = 'auto' | 'compact' | 'hero';

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
  const compact = variant === 'compact';
  const hero = variant === 'hero';

  return (
    <section
      className={cn(
        'relative overflow-hidden border border-emerald-300/15 bg-[linear-gradient(135deg,#006a53_0%,#00755b_55%,#168166_100%)] text-white',
        compact && 'mb-3 rounded-[18px] px-3.5 py-3 shadow-[0_8px_20px_rgba(5,74,57,0.14)]',
        hero && 'mb-5 rounded-[30px] px-6 py-6 shadow-[0_16px_38px_rgba(5,74,57,0.22)]',
        variant === 'auto' && 'mb-3 rounded-[18px] px-3.5 py-3 shadow-[0_8px_20px_rgba(5,74,57,0.14)] md:mb-5 md:rounded-[28px] md:px-6 md:py-6 md:shadow-[0_16px_38px_rgba(5,74,57,0.20)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            'absolute rounded-full bg-emerald-200/10 blur-2xl',
            compact ? '-right-10 -top-12 h-28 w-28' : '-right-12 -top-16 h-44 w-44',
            variant === 'auto' && '-right-10 -top-12 h-28 w-28 md:-right-12 md:-top-16 md:h-44 md:w-44',
          )}
        />
        <div
          className={cn(
            'absolute rotate-[28deg] rounded-[100%_0_100%_0] bg-white/8',
            compact ? 'right-7 top-0 h-16 w-10' : 'right-8 top-0 h-28 w-16',
            variant === 'auto' && 'right-7 top-0 h-16 w-10 md:right-8 md:h-28 md:w-16',
          )}
        />
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-tl-[100%] border-l border-t border-white/10 bg-black/5',
            compact ? 'h-16 w-24' : 'h-24 w-36',
            variant === 'auto' && 'h-16 w-24 md:h-24 md:w-36',
          )}
        />
      </div>

      <div
        className={cn(
          'relative flex min-w-0 flex-col',
          compact ? 'gap-3' : 'gap-4 sm:flex-row sm:items-center sm:justify-between',
          variant === 'auto' && 'gap-3 md:flex-row md:items-center md:justify-between md:gap-4',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {icon && (
            <div
              className={cn(
                'flex flex-shrink-0 items-center justify-center border border-white/20 bg-white/12 text-white shadow-md backdrop-blur-md',
                compact ? 'h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5' : 'h-16 w-16 rounded-[18px] [&_svg]:h-8 [&_svg]:w-8',
                variant === 'auto' && 'h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5 md:h-16 md:w-16 md:rounded-[18px] md:[&_svg]:h-8 md:[&_svg]:w-8',
              )}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <p
                className={cn(
                  'font-extrabold uppercase tracking-[0.2em] text-emerald-50/75',
                  compact ? 'hidden' : 'mb-1.5 text-xs',
                  variant === 'auto' && 'hidden md:mb-1.5 md:block md:text-xs',
                )}
              >
                {eyebrow}
              </p>
            )}

            <h1
              className={cn(
                'font-display font-extrabold leading-tight tracking-tight text-white drop-shadow-sm',
                compact ? 'text-xl' : 'text-4xl',
                variant === 'auto' && 'text-xl xs:text-2xl md:text-4xl',
              )}
            >
              {title}
            </h1>

            {description && (
              <p
                className={cn(
                  'max-w-3xl font-medium text-emerald-50/90',
                  compact ? 'mt-0.5 text-xs leading-snug' : 'mt-1.5 text-base leading-relaxed',
                  variant === 'auto' && 'mt-0.5 text-xs leading-snug xs:text-sm md:mt-1.5 md:text-base md:leading-relaxed',
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {action && (
          <div
            className={cn(
              'flex-shrink-0 [&_button]:border-white/25 [&_button]:bg-white/15 [&_button]:text-white [&_button]:backdrop-blur-sm hover:[&_button]:bg-white/25',
              compact ? 'w-full [&_button]:w-full' : 'w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto',
              variant === 'auto' && 'w-full md:w-auto [&_button]:w-full md:[&_button]:w-auto',
            )}
          >
            {action}
          </div>
        )}
      </div>
    </section>
  );
}
