import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  priority: PriorityFilter;
  onPriorityChange: (v: PriorityFilter) => void;
}

const priorities: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

export function TaskFilters({ search, onSearchChange, priority, onPriorityChange }: TaskFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 mb-6">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar tarefa"
          placeholder="Buscar tarefa..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div role="group" aria-label="Filtrar por prioridade" className="flex flex-wrap gap-1 rounded-xl border bg-card p-1">
        {priorities.map((p) => (
          <Button
            key={p.value}
            variant="ghost"
            size="sm"
            className={cn(
              'text-sm min-h-11 flex-1 px-3 rounded-lg',
              priority === p.value && 'bg-background shadow-sm text-foreground font-medium'
            )}
            aria-pressed={priority === p.value}
            onClick={() => onPriorityChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
