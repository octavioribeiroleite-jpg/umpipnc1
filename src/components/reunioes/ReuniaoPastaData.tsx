import { type ReactNode, useState } from 'react';
import { ChevronDown, CircleDot, FolderOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function ReuniaoPastaData({ label, count, active, children }: {
  label: string;
  count: number;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const Icon = active ? CircleDot : FolderOpen;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <h2>
        <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span>{label}</span>
          <span className="rounded-full bg-muted px-2 text-xs font-medium" aria-label={count === 1 ? '1 reunião' : `${count} reuniões`}>{count}</span>
          <ChevronDown aria-hidden="true" className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="space-y-2.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
