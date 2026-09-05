import { ReactNode } from 'react';
import { Check, ChevronDown, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type State = 'done' | 'active' | 'pending';

interface Props {
  state: State;
  icon: ReactNode;
  title: string;
  summary?: string;
  onToggle?: () => void;
  onAdvance?: () => void;
  canAdvance?: boolean;
  advanceLabel?: string;
  isLastStep?: boolean;
  children?: ReactNode;
}

export function ElectionStepCard({ state, icon, title, summary, onToggle, onAdvance, canAdvance, advanceLabel, isLastStep, children }: Props) {
  if (state === 'active') {
    return (
      <div className="rounded-[18px] bg-white dark:bg-card border-2 border-primary shadow-lg backdrop-blur-sm p-4 transition-all">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-primary">{icon}</div>
          <h2 className="text-sm font-semibold flex-1 text-foreground">{title}</h2>
          <span className="text-[10px] font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded-full uppercase tracking-wide">Etapa atual</span>
        </div>
        {children}
        {onAdvance && !isLastStep && (
          <div className="mt-4 pt-3 border-t border-primary/20 flex justify-end">
            <Button onClick={onAdvance} disabled={!canAdvance} size="sm" className="gap-1.5">
              {advanceLabel || 'Avançar'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (state === 'done') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-[14px] bg-white/95 dark:bg-card/95 border border-success/40 shadow-sm px-3 py-2.5 flex items-center gap-2 text-left hover:bg-success/10 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-success text-success-foreground flex items-center justify-center shrink-0">
          <Check className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground min-w-0 whitespace-normal break-words">{title}</p>
          {summary && <p className="text-[11px] text-muted-foreground min-w-0 whitespace-normal break-words">{summary}</p>}
        </div>
        {onToggle && <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'w-full rounded-[14px] bg-white/80 dark:bg-card/80 border border-dashed border-border shadow-sm px-3 py-2.5 flex items-center gap-2',
        onToggle ? 'cursor-pointer hover:bg-white dark:hover:bg-card' : 'opacity-80 cursor-not-allowed',
      )}
      onClick={onToggle}
    >
      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
        {onToggle ? <ChevronDown className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground min-w-0 whitespace-normal break-words">{title}</p>
        {summary && <p className="text-[11px] text-muted-foreground/80 min-w-0 whitespace-normal break-words">{summary}</p>}
      </div>
    </div>
  );
}
