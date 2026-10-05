import { AlertCircle } from 'lucide-react';
import { Button } from './button';

interface QueryErrorStateProps {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
  hasPreviousData?: boolean;
}

/** A failed read is not an empty list. Keep any previous snapshot visibly stale. */
export function QueryErrorState({ message, onRetry, retrying = false, hasPreviousData = false }: QueryErrorStateProps) {
  return (
    <div role="alert" className="min-w-0 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium break-words">{message}</p>
          <p className="text-sm text-muted-foreground">{hasPreviousData ? 'Os dados abaixo são da última consulta e podem estar desatualizados.' : 'Não foi possível consultar os dados. Tente novamente.'}</p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Consultando…' : 'Tentar novamente'}
      </Button>
    </div>
  );
}
