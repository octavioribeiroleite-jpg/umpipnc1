import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppButtonProps extends ButtonProps {
  preset?: 'primary' | 'secondary' | 'ghost-action';
}

const presetClasses: Record<string, string> = {
  primary: 'rounded-xl h-11 font-semibold',
  secondary: 'rounded-xl bg-white/80 dark:bg-card/80 border border-border/40',
  'ghost-action': 'text-xs h-auto py-1 px-2',
};

const presetVariants: Record<string, ButtonProps['variant']> = {
  primary: 'default',
  secondary: 'outline',
  'ghost-action': 'ghost',
};

const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ preset = 'primary', className, variant, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant || presetVariants[preset]}
        className={cn(presetClasses[preset], className)}
        {...props}
      />
    );
  },
);
AppButton.displayName = 'AppButton';

export { AppButton };
export type { AppButtonProps };
