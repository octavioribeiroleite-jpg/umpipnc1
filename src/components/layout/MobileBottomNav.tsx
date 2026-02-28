import { Home, Users, Calendar, Wallet, MoreHorizontal, CheckSquare, FolderOpen, Settings, UserCheck, ClipboardCheck, MessageSquare, Vote, Heart, Globe, BookOpen } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const mainNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/reunioes', icon: Users, label: 'Reuniões' },
  { to: '/calendario', icon: Calendar, label: 'Calendário' },
  { to: '/financas', icon: Wallet, label: 'Finanças' },
];

export function MobileBottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  const moreNavItems = [
    { to: '/tarefas', icon: CheckSquare, label: 'Tarefas' },
    { to: '/comunicados', icon: MessageSquare, label: 'Comunicados' },
    { to: '/plenarias', icon: ClipboardCheck, label: 'Plenárias' },
    { to: '/dizimos', icon: Heart, label: 'Dízimos' },
    { to: '/arquivos', icon: FolderOpen, label: 'Arquivos' },
    { to: '/estudos', icon: BookOpen, label: 'Estudos' },
    ...(isAdmin ? [
      { to: '/eleicoes', icon: Vote, label: 'Eleições' },
      { to: '/visitantes', icon: Globe, label: 'Visitantes' },
      { to: '/usuarios', icon: UserCheck, label: 'Usuários' },
      { to: '/sugestoes', icon: MessageSquare, label: 'Sugestões do Pastor' },
    ] : []),
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreNavItems.some((item) => isActive(item.to));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
              isActive(item.to)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {moreNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
