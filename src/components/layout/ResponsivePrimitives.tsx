import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type DivProps = HTMLAttributes<HTMLDivElement>;
type SectionProps = HTMLAttributes<HTMLElement>;

export const PageContainer = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-container', className)} {...props} />
  ),
);
PageContainer.displayName = 'PageContainer';

export const ReadingContainer = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-reading-container', className)} {...props} />
  ),
);
ReadingContainer.displayName = 'ReadingContainer';

export const PageSection = forwardRef<HTMLElement, SectionProps>(
  ({ className, ...props }, ref) => (
    <section ref={ref} className={cn('app-section', className)} {...props} />
  ),
);
PageSection.displayName = 'PageSection';

export const AppStack = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-stack', className)} {...props} />
  ),
);
AppStack.displayName = 'AppStack';

export const ResponsiveGrid = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-grid', className)} {...props} />
  ),
);
ResponsiveGrid.displayName = 'ResponsiveGrid';

export const MetricGrid = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('metric-grid', className)} {...props} />
  ),
);
MetricGrid.displayName = 'MetricGrid';

export const FormGrid = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('form-grid', className)} {...props} />
  ),
);
FormGrid.displayName = 'FormGrid';

export const HorizontalScroller = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-scroll-x', className)} {...props} />
  ),
);
HorizontalScroller.displayName = 'HorizontalScroller';
