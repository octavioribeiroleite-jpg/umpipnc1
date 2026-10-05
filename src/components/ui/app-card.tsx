import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'stat' | 'interactive';
  noPadding?: boolean;
  colorStripe?: string;
}

const variantClasses = {
  default: '',
  stat: '',
  interactive: 'cursor-pointer hover:shadow-md transition-all',
};

const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, variant = 'default', noPadding, colorStripe, children, onClick, onKeyDown, role, tabIndex, ...props }, ref) => {
    const padding = noPadding ? '' : variant === 'stat' ? 'p-4' : 'p-4 md:p-5';

    return (
      <div
        ref={ref}
        role={role ?? (variant === 'interactive' && onClick ? 'button' : undefined)}
        tabIndex={tabIndex ?? (variant === 'interactive' && onClick ? 0 : undefined)}
        onClick={onClick}
        onKeyDown={event => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.target === event.currentTarget && variant === 'interactive' && onClick && ['Enter',' '].includes(event.key)) {
            event.preventDefault(); event.currentTarget.click();
          }
        }}
        className={cn(
          'min-w-0 rounded-2xl border border-border bg-card text-card-foreground shadow-sm',
          variantClasses[variant],
          !noPadding && !colorStripe && padding,
          className,
        )}
        {...props}
      >
        {colorStripe ? (
          <div className="flex">
            <div className="w-[3px] shrink-0 rounded-l-xl sm:rounded-l-[18px]" style={{ backgroundColor: colorStripe }} />
            <div className={cn('flex-1 min-w-0', padding)}>{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    );
  },
);
AppCard.displayName = 'AppCard';

export { AppCard };
export type { AppCardProps };
