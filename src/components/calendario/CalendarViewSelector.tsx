import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ViewMode = 'week' | 'fortnight' | 'month';

interface CalendarViewSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function CalendarViewSelector({ viewMode, onViewModeChange }: CalendarViewSelectorProps) {
  return (
    <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)} className="md:hidden">
      <TabsList className="w-full">
        <TabsTrigger value="week" className="flex-1 text-xs">Semana</TabsTrigger>
        <TabsTrigger value="fortnight" className="flex-1 text-xs">15 dias</TabsTrigger>
        <TabsTrigger value="month" className="flex-1 text-xs">Mês</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
