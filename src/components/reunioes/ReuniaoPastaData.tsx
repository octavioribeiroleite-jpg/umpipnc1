import { type ReactNode, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function ReuniaoPastaData({ label, count, children }: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <h2>
        <CollapsibleTrigger className="flex min-h-12 w-full items-center gap-2 rounded-lg px-1 text-left text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          <span>{label}</span>
          <span className="rounded-full bg-muted px-2 text-xs font-medium" aria-label={count === 1 ? '1 reunião' : `${count} reuniões`}>{count}</span>
          <span className="ml-auto text-primary">{open ? 'Recolher' : 'Ver'}</span>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="space-y-2.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
