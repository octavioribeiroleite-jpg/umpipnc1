import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepDef {
  key: string;
  label: string;
}

interface Props {
  steps: StepDef[];
  currentIndex: number;
  completed: Record<string, boolean>;
  onStepClick?: (index: number) => void;
}

export function ElectionStepper({ steps, currentIndex, completed, onStepClick }: Props) {
  return (
    <div className="flex items-center w-full px-1 py-2">
      {steps.map((step, idx) => {
        const isDone = completed[step.key];
        const isCurrent = idx === currentIndex;
        const isPending = !isDone && !isCurrent;
        const clickable = !!onStepClick && (isDone || idx <= currentIndex);

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={clickable ? () => onStepClick?.(idx) : undefined}
              disabled={!clickable}
              className={cn(
                'flex flex-col items-center gap-1 shrink-0 transition-all',
                clickable && 'cursor-pointer',
                !clickable && 'cursor-default',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                  isDone && 'bg-success border-success text-success-foreground',
                  isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
                  isPending && 'bg-muted border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium leading-tight text-center max-w-[70px]',
                  isCurrent && 'text-primary',
                  isDone && 'text-success',
                  isPending && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 -mt-4 transition-all',
                  completed[step.key] ? 'bg-success' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
