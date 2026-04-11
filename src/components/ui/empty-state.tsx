import { ReactNode } from 'react';
import { AppCard } from './app-card';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <AppCard>
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
        <div className="text-muted-foreground">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm max-w-xs">{description}</p>
        )}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </AppCard>
  );
}
