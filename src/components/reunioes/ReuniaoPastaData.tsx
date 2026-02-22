import { useState } from 'react';
import { Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ReuniaoPastaDataProps {
  date: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ReuniaoPastaData({ date, count, children, defaultOpen = true }: ReuniaoPastaDataProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const formattedDate = format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg transition-colors",
          "bg-muted/50 hover:bg-muted cursor-pointer",
          "border border-border/50"
        )}>
          {isOpen ? (
            <FolderOpen className="h-5 w-5 text-primary" />
          ) : (
            <Folder className="h-5 w-5 text-muted-foreground" />
          )}
          
          <span className="font-medium text-foreground">
            {formattedDate}
          </span>
          
          <span className="text-sm text-muted-foreground">
            ({count} {count === 1 ? 'reunião' : 'reuniões'})
          </span>
          
          <div className="ml-auto">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-4 mt-2 pl-4 border-l-2 border-border/50 space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
