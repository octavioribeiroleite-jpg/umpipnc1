import * as React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Title({ className, children, ...props }: TypographyProps) {
  return (
    <h2 className={cn('text-xl md:text-2xl font-bold font-display', className)} {...props}>
      {children}
    </h2>
  );
}

export function Subtitle({ className, children, ...props }: TypographyProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function SectionTitle({ className, children, ...props }: TypographyProps) {
  return (
    <h3 className={cn('text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3', className)} {...props}>
      {children}
    </h3>
  );
}
