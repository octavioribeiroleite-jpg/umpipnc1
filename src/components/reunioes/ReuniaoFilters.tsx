import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ReuniaoFiltersProps {
  onStatusChange: (status: string) => void;
  onMonthChange: (month: string) => void;
  onSearchChange: (search: string) => void;
}

export function ReuniaoFilters({ onStatusChange, onMonthChange, onSearchChange }: ReuniaoFiltersProps) {
  const [search, setSearch] = useState('');

  const currentYear = new Date().getFullYear();
  const months = [
    { value: 'all', label: 'Todos os meses' },
    { value: `${currentYear}-01`, label: 'Janeiro' },
    { value: `${currentYear}-02`, label: 'Fevereiro' },
    { value: `${currentYear}-03`, label: 'Março' },
    { value: `${currentYear}-04`, label: 'Abril' },
    { value: `${currentYear}-05`, label: 'Maio' },
    { value: `${currentYear}-06`, label: 'Junho' },
    { value: `${currentYear}-07`, label: 'Julho' },
    { value: `${currentYear}-08`, label: 'Agosto' },
    { value: `${currentYear}-09`, label: 'Setembro' },
    { value: `${currentYear}-10`, label: 'Outubro' },
    { value: `${currentYear}-11`, label: 'Novembro' },
    { value: `${currentYear}-12`, label: 'Dezembro' },
  ];

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select onValueChange={onStatusChange} defaultValue="all">
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="aberta">Abertas</SelectItem>
          <SelectItem value="fechada">Fechadas</SelectItem>
        </SelectContent>
      </Select>
      <Select onValueChange={onMonthChange} defaultValue="all">
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
