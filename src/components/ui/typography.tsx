import * as React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Title({ className, children, ...props }: TypographyProps) {
  return (
    <h2 className={cn('text-2xl min-[700px]:text-[1.75rem] font-bold leading-tight font-display', className)} {...props}>
      {children}
    </h2>
  );
}

export function Subtitle({ className, children, ...props }: TypographyProps) {
  return (
    <p className={cn('text-base leading-6 text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function SectionTitle({ className, children, ...props }: TypographyProps) {
  return (
    <h3 className={cn('text-lg font-semibold leading-snug mb-3', className)} {...props}>
      {children}
    </h3>
  );
}
