import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ className, icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'fixed bottom-20 right-4 z-40 flex items-center justify-center',
          'h-14 w-14 rounded-full bg-primary text-primary-foreground',
          'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'md:hidden',
          className
        )}
        {...props}
      >
        {icon || <Plus className="h-6 w-6" />}
        {children}
      </button>
    );
  }
);

FAB.displayName = 'FAB';
