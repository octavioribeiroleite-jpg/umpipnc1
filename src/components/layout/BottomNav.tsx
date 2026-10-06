import { useRef, useState } from 'react';
import { LucideIcon, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useNavigationHeight } from './useNavigationHeight';

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
  desktopBreakpoint?: 'md' | 'lg' | '700';
}

export function BottomNav({ mainItems, moreItems, moreTitle = 'Mais opções', desktopBreakpoint = 'md' }: BottomNavProps) {
  const [open, setOpen] = useState(false);
  const navContentRef = useRef<HTMLDivElement>(null);
  useNavigationHeight(navContentRef, '--mobile-nav-content-height');
  const visibleItems = mainItems.slice(0, 3);

  const overflowItems = [...mainItems.slice(3), ...moreItems];

  const handleMoreClick = (item: BottomNavItem) => {
    item.onClick();
    setOpen(false);
  };

  return (
    <nav aria-label="Navegação principal" className={cn(
      'ipnc-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-[0_-4px_16px_rgba(0,0,0,0.035)] backdrop-blur-md dark:border-border/40',
      desktopBreakpoint === 'lg' ? 'lg:hidden' : desktopBreakpoint === '700' ? 'min-[700px]:hidden' : 'md:hidden',
    )}>
      <div ref={navContentRef} className="ipnc-bottom-nav-content ipnc-safe-page-x mx-auto grid min-h-16 max-w-reading items-stretch gap-1" style={{ gridTemplateColumns: `repeat(${visibleItems.length + 1}, minmax(0, 1fr))` }}>
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
            <item.icon aria-hidden="true" className="h-[18px] w-[18px] flex-shrink-0" />
            <span className="w-full break-words text-center text-xs font-medium leading-tight">{item.label}</span>
          </button>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir mais opções"
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <MoreHorizontal aria-hidden="true" className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="w-full break-words text-center text-xs font-medium leading-tight">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="ipnc-navigation-sheet max-h-[calc(var(--app-viewport-height)*0.78)] overflow-y-auto rounded-t-2xl px-4 pb-5 pt-4">
            <SheetHeader className="text-left">
              <SheetTitle>{moreTitle}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 py-3 sm:grid-cols-4">
              {overflowItems.map((item) => (
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
                    <item.icon aria-hidden="true" className="h-5 w-5" />
                  )}
                  <span className="w-full break-words text-xs font-medium leading-snug">{item.label}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
