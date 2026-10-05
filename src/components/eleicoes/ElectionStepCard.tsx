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
      <div className="rounded-2xl bg-card border border-primary shadow-sm p-[16px] min-[700px]:p-[20px] transition-all">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="text-primary">{icon}</div>
          <h2 className="min-w-0 break-words text-base font-semibold flex-1 text-foreground">{title}</h2>
          <span className="text-xs font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded-full uppercase tracking-wide">Etapa atual</span>
        </div>
        {children}
        {onAdvance && !isLastStep && (
          <div className="mt-4 pt-3 border-t border-primary/20 flex justify-end">
            <Button onClick={onAdvance} disabled={!canAdvance} size="sm" className="w-full sm:w-auto gap-1.5">
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
        className="w-full min-h-[64px] rounded-2xl bg-card border border-success/40 shadow-sm px-3 py-2.5 flex items-center gap-2 text-left hover:bg-success/10 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-success text-success-foreground flex items-center justify-center shrink-0">
          <Check className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground min-w-0 whitespace-normal break-words">{title}</p>
          {summary && <p className="text-xs text-muted-foreground min-w-0 whitespace-normal break-words">{summary}</p>}
        </div>
        {onToggle && <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'w-full min-h-[64px] rounded-2xl bg-card border border-dashed border-border shadow-sm px-3 py-2.5 flex items-center gap-2',
        onToggle ? 'cursor-pointer hover:bg-muted' : 'opacity-80 cursor-not-allowed',
      )}
      onClick={onToggle}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      onKeyDown={onToggle ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle(); } } : undefined}
    >
      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
        {onToggle ? <ChevronDown className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground min-w-0 whitespace-normal break-words">{title}</p>
        {summary && <p className="text-xs text-muted-foreground/80 min-w-0 whitespace-normal break-words">{summary}</p>}
      </div>
    </div>
  );
}
