import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export type MeetingStatusFilter = 'all' | 'aberta' | 'fechada';

interface ReuniaoFiltersProps {
  status: MeetingStatusFilter;
  month: string;
  search: string;
  months: { value: string; label: string }[];
  onStatusChange: (status: MeetingStatusFilter) => void;
  onMonthChange: (month: string) => void;
  onSearchChange: (search: string) => void;
}

const statusOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'aberta', label: 'Abertas' },
  { value: 'fechada', label: 'Finalizadas' },
] as const;

export function ReuniaoFilters({ status, month, search, months, onStatusChange, onMonthChange, onSearchChange }: ReuniaoFiltersProps) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Input type="search" aria-label="Buscar reuniões por título" placeholder="Buscar reunião" value={search}
          onChange={event => onSearchChange(event.target.value)} className="min-h-12 rounded-lg bg-card px-2.5" />
        <Select onValueChange={onMonthChange} value={month}>
          <SelectTrigger aria-label="Filtrar por mês" className="min-h-12 gap-1 rounded-lg bg-card px-2.5 text-xs [&>svg]:hidden">
            <span className="min-w-0 flex-1 truncate text-left"><SelectValue /></span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div role="group" aria-label="Situação das reuniões" className="grid grid-cols-3 gap-1">
        {statusOptions.map(option => (
          <button key={option.value} type="button" aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
            className="meeting-filter-tab min-h-12 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
