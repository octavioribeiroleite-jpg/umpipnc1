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
  ({ className, variant = 'default', noPadding, colorStripe, children, ...props }, ref) => {
    const padding = noPadding ? '' : variant === 'stat' ? 'p-3' : 'p-4';

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[18px] bg-white/90 dark:bg-card/95 border border-white/20 dark:border-border/40 shadow-sm backdrop-blur-sm overflow-hidden',
          variantClasses[variant],
          !noPadding && !colorStripe && padding,
          className,
        )}
        {...props}
      >
        {colorStripe ? (
          <div className="flex">
            <div className="w-[3px] shrink-0 rounded-l-[18px]" style={{ backgroundColor: colorStripe }} />
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
