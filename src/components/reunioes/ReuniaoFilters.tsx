import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface ReuniaoFiltersProps {
  onStatusChange: (status: string) => void;
  onMonthChange: (month: string) => void;
  onSearchChange: (search: string) => void;
}

export function ReuniaoFilters({ onStatusChange, onMonthChange, onSearchChange }: ReuniaoFiltersProps) {
  const [search, setSearch] = useState('');
  const [statusValue, setStatusValue] = useState('all');
  const [monthValue, setMonthValue] = useState('all');

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

  const handleStatusChange = (value: string) => {
    setStatusValue(value);
    onStatusChange(value);
  };

  const handleMonthChange = (value: string) => {
    setMonthValue(value);
    onMonthChange(value);
  };

  return (
    <div className="mb-6 grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,200px)]">
      <div className="space-y-2">
        <Label htmlFor="meeting-search">Buscar reuniões</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="meeting-search" placeholder="Buscar por título…" value={search} onChange={event => handleSearchChange(event.target.value)} className="pl-9" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="meeting-status">Situação</Label>
        <Select onValueChange={handleStatusChange} value={statusValue}>
          <SelectTrigger id="meeting-status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="aberta">Abertas</SelectItem><SelectItem value="fechada">Fechadas</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="meeting-month">Mês</Label>
        <Select onValueChange={handleMonthChange} value={monthValue}>
          <SelectTrigger id="meeting-month"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}
