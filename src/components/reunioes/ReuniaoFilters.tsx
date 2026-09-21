import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReuniaoFiltersProps {
  onStatusChange: (status: string) => void;
  onMonthChange: (month: string) => void;
  onSearchChange: (search: string) => void;
}

export function ReuniaoFilters({ onStatusChange, onMonthChange, onSearchChange }: ReuniaoFiltersProps) {
  const [search, setSearch] = useState('');
  const [statusValue, setStatusValue] = useState('all');
  const [monthValue, setMonthValue] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const activeFiltersCount = (statusValue !== 'all' ? 1 : 0) + (monthValue !== 'all' ? 1 : 0);

  const filterSelects = (
    <>
      <Select onValueChange={handleStatusChange} value={statusValue}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="aberta">Abertas</SelectItem>
          <SelectItem value="fechada">Fechadas</SelectItem>
        </SelectContent>
      </Select>
      <Select onValueChange={handleMonthChange} value={monthValue}>
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
    </>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou moderador..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-12 rounded-2xl bg-card"
            />
          </div>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-12 w-12 shrink-0 rounded-2xl bg-card">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="flex flex-col gap-2 pt-1">
              {filterSelects}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou moderador..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {filterSelects}
    </div>
  );
}
