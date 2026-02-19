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
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tarefa..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {priorities.map((p) => (
          <Button
            key={p.value}
            variant="ghost"
            size="sm"
            className={cn(
              'text-xs h-8 px-3 rounded-md',
              priority === p.value && 'bg-background shadow-sm text-foreground font-medium'
            )}
            onClick={() => onPriorityChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
