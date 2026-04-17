import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 md:mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm md:text-base text-muted-foreground break-words">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}
