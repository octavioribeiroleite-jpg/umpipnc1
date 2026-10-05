import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppButtonProps extends ButtonProps {
  preset?: 'primary' | 'secondary' | 'ghost-action';
}

const presetClasses: Record<string, string> = {
  primary: 'rounded-xl h-11 font-semibold',
  secondary: 'rounded-xl bg-card border border-input',
  'ghost-action': 'text-sm min-h-11 py-2 px-3',
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
