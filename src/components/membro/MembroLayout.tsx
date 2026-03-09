import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Home, Calendar, CreditCard, Bell, Heart, LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoIpnc from '@/assets/logo-ipnc.png';

export type MembroTab = 'inicio' | 'eventos' | 'pagamentos' | 'comunicados' | 'dizimos';

interface MembroLayoutProps {
  children: ReactNode;
  activeTab: MembroTab;
  onTabChange: (tab: MembroTab) => void;
}

const menuItems: { icon: typeof Home; label: string; tab: MembroTab }[] = [
  { icon: Home, label: 'Início', tab: 'inicio' },
  { icon: Calendar, label: 'Eventos', tab: 'eventos' },
  { icon: CreditCard, label: 'Pagamentos', tab: 'pagamentos' },
  { icon: Bell, label: 'Comunicados', tab: 'comunicados' },
  { icon: Heart, label: 'Dízimos', tab: 'dizimos' },
];

export function MembroLayout({ children, activeTab, onTabChange }: MembroLayoutProps) {
  const { session, clearSession } = useMembroSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNav = (tab: MembroTab) => {
    onTabChange(tab);
    setOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md safe-top">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground p-0">
                <div className="flex flex-col h-full">
                  {/* Sidebar header */}
                  <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
                    <img src={logoIpnc} alt="IPNC" className="h-10 w-10 object-contain" />
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-sm text-sidebar-primary">Renovo</span>
                      <span className="text-xs text-sidebar-muted">IPNC</span>
                    </div>
                  </div>

                  {/* Nav items */}
                  <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-1 px-2">
                      {menuItems.map((item) => {
                        const isActive = activeTab === item.tab;
                        return (
                          <li key={item.tab}>
                            <button
                              onClick={() => handleNav(item.tab)}
                              className={cn(
                                'flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200',
                                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                isActive
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                                  : 'text-sidebar-foreground'
                              )}
                            >
                              <item.icon className="h-5 w-5 mr-3" />
                              <span className="font-medium">{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  {/* User section */}
                  <div className="p-4 border-t border-sidebar-border">
                    {session && (
                      <div className="mb-3 px-2">
                        <p className="font-medium text-sm truncate">{session.memberName}</p>
                        <p className="text-xs text-sidebar-muted truncate">{session.societyName}</p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      <span>Sair</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <img src={logoIpnc} alt="IPNC" className="h-8 w-8 object-contain" />
            <div>
              <p className="font-semibold text-sm leading-tight">{session?.memberName || 'Membro'}</p>
              {session && (
                <p className="text-xs text-muted-foreground">{session.societyName}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-background/60 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto w-full p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
