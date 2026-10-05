import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ViewMode = 'week' | 'fortnight' | 'month';

interface CalendarViewSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function CalendarViewSelector({ viewMode, onViewModeChange }: CalendarViewSelectorProps) {
  return (
    <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)} className="md:hidden">
      <TabsList className="flex h-auto w-full p-1" aria-label="Período do calendário">
        <TabsTrigger value="week" className="min-h-11 flex-1 text-sm">Semana</TabsTrigger>
        <TabsTrigger value="fortnight" className="min-h-11 flex-1 text-sm">15 dias</TabsTrigger>
        <TabsTrigger value="month" className="min-h-11 flex-1 text-sm">Mês</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
