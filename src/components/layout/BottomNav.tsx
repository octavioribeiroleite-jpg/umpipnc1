import { useState } from 'react';
import { LucideIcon, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  markerColor?: string;
}

interface BottomNavProps {
  mainItems: BottomNavItem[];
  moreItems: BottomNavItem[];
  moreTitle?: string;
}

export function BottomNav({ mainItems, moreItems, moreTitle = 'Mais opções' }: BottomNavProps) {
  const [open, setOpen] = useState(false);
  const visibleItems = mainItems.slice(0, 4);

  const handleMoreClick = (item: BottomNavItem) => {
    item.onClick();
    setOpen(false);
  };

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-white/90 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-border/40 dark:bg-card/95 md:hidden">
      <div className="mx-auto grid h-bottom-nav max-w-reading grid-cols-5 items-stretch gap-1 px-1">
        {visibleItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors',
              item.active
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="h-[18px] w-[18px] flex-shrink-0" fill={item.active ? 'currentColor' : 'none'} />
            <span className="w-full truncate text-center text-[10px] font-medium leading-none">{item.label}</span>
          </button>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir mais opções"
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="w-full truncate text-center text-[10px] font-medium leading-none">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[78vh] overflow-y-auto rounded-t-2xl px-4 pb-5 pt-4">
            <SheetHeader className="text-left">
              <SheetTitle>{moreTitle}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-2 py-3">
              {moreItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMoreClick(item)}
                  className={cn(
                    'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-1.5 py-2 text-center transition-colors hover:bg-muted',
                    item.active && 'border-primary/50 bg-primary/10 text-primary',
                  )}
                >
                  {item.markerColor ? (
                    <span className="h-5 w-5 rounded-full" style={{ backgroundColor: item.markerColor }} />
                  ) : (
                    <item.icon className="h-5 w-5" fill={item.active ? 'currentColor' : 'none'} />
                  )}
                  <span className="w-full text-[11px] font-medium leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
