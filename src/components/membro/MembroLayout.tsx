import { type ReactNode, useRef } from 'react';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { Home, Calendar, CreditCard, Bell, Heart, LogOut } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import { BottomNav, type BottomNavItem } from '@/components/layout/BottomNav';
import { useNavigationHeight } from '@/components/layout/useNavigationHeight';

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
  const headerContentRef = useRef<HTMLDivElement>(null);
  useNavigationHeight(headerContentRef, '--mobile-header-content-height');

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
    <div className="ipnc-membro-layout ipnc-navigation-layout ipnc-safe-managed min-h-[var(--app-viewport-height)] flex flex-col bg-background">
      {/* Header */}
      <header className="ipnc-mobile-header fixed top-0 left-0 right-0 z-40 border-b border-border bg-card">
        <div ref={headerContentRef} className="ipnc-mobile-header-content ipnc-safe-page-x flex min-h-16 items-center justify-between py-3 max-w-2xl mx-auto w-full gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <img src={logoIpnc} alt="Marca IPNC" className="h-full w-full object-contain" />
            </div>
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
      <main className="safe-bottom-content flex-1 min-w-0 bg-background pt-mobile-header">
        <div className="ipnc-safe-page-x max-w-2xl mx-auto w-full py-3 sm:py-4">
          {children}
        </div>
      </main>
      <BottomNav mainItems={mainItems} moreItems={moreItems} moreTitle="Área do membro" />
      <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={doLogout} />
    </div>
  );
}
