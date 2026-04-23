import { ReactNode } from 'react';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { Home, Calendar, CreditCard, Bell, Heart, LogOut } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import { BottomNav, type BottomNavItem } from '@/components/layout/BottomNav';

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
  useSwipeBack();

  const handleNav = (tab: MembroTab) => {
    onTabChange(tab);
  };

  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();

  const doLogout = () => {
    clearSession();
    navigate('/auth');
  };

  const mainItems: BottomNavItem[] = menuItems.slice(0, 4).map((item) => ({
    key: item.tab,
    icon: item.icon,
    label: item.label,
    active: activeTab === item.tab,
    onClick: () => handleNav(item.tab),
  }));

  const moreItems: BottomNavItem[] = [
    ...menuItems.slice(4).map((item) => ({
      key: item.tab,
      icon: item.icon,
      label: item.label,
      active: activeTab === item.tab,
      onClick: () => handleNav(item.tab),
    })),
    { key: 'sair', icon: LogOut, label: 'Sair', onClick: requestExit },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-md safe-top">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 max-w-2xl mx-auto w-full gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <img src={logoIpnc} alt="IPNC" className="h-8 w-8 object-contain flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight truncate">{session?.memberName || 'Membro'}</p>
              {session && (
                <p className="text-xs text-muted-foreground truncate">{session.societyName}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden bg-background/60 backdrop-blur-sm pt-16 pb-24">
        <div className="max-w-2xl mx-auto w-full p-3 sm:p-4">
          {children}
        </div>
      </main>
      <BottomNav mainItems={mainItems} moreItems={moreItems} moreTitle="Área do membro" />
      <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={doLogout} />
    </div>
  );
}
