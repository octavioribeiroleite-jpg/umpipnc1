import { useId } from 'react';
import { Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  department: string;
  onDepartmentChange: (v: string) => void;
  departments: string[];
}

export function BirthdayFilters({ search, onSearchChange, department, onDepartmentChange, departments }: Props) {
  const searchId = useId();
  const departmentId = useId();
  return (
    <div className="ebd-birthday-filters grid min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,.45fr)]">
      <div className="min-w-0 space-y-2">
        <Label htmlFor={searchId}>Buscar aniversariante</Label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id={searchId} placeholder="Buscar por nome..." value={search} onChange={e => onSearchChange(e.target.value)} className="h-11 pl-9" />
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor={departmentId}>Departamento</Label>
        <Select value={department} onValueChange={onDepartmentChange}>
          <SelectTrigger id={departmentId} className="h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
