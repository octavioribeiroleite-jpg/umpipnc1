import { type ReactNode, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { silentUpdateCheck } from '@/lib/registerSW';
import { OfflineBanner } from '@/components/OfflineBanner';
import './diretoria-theme.css';
import { ExitConfirmDialog } from './ExitConfirmDialog';
import { AppSidebar } from './AppSidebar';
import { BottomNav, type BottomNavItem } from './BottomNav';
import { MobileHeader } from './MobileHeader';
import { PullToRefresh } from './PullToRefresh';
import { TabletNavigationRail } from './TabletNavigationRail';
import {
  adminNavigationItems,
  isNavigationPathActive,
  primaryNavigationItems,
  secondaryNavigationItems,
  type AppNavigationItem,
} from './appNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [exitOpen, setExitOpen] = useState(false);
  useEffect(() => {
    document.body.classList.add('diretoria-theme');
    return () => document.body.classList.remove('diretoria-theme');
  }, []);

  useEffect(() => {
    void silentUpdateCheck();
  }, [location.pathname]);

  const toBottomItem = (item: AppNavigationItem): BottomNavItem => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    active: isNavigationPathActive(location.pathname, item.path),
    onClick: () => navigate(item.path),
  });

  const mainItems = primaryNavigationItems.map(toBottomItem);
  const moreItems: BottomNavItem[] = [
    ...secondaryNavigationItems.map(toBottomItem),
    ...(isAdmin ? adminNavigationItems.map(toBottomItem) : []),
    {
      key: 'sair',
      icon: LogOut,
      label: 'Sair',
      onClick: () => setExitOpen(true),
    },
  ];

  return (
    <div className="app-page min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:text-primary focus:shadow-lg">Pular para o conteúdo</a>
      <ExitConfirmDialog open={exitOpen} onOpenChange={setExitOpen} onConfirm={async () => { await signOut(); navigate('/auth'); }} />
      {/* Keep one content tree: CSS-hidden copies still mount effects and channels. */}
      <div className="min-h-screen min-w-0 md:flex md:h-screen md:overflow-hidden">
        <div className="md:hidden"><MobileHeader /></div>
        <div className="hidden md:flex lg:hidden"><TabletNavigationRail /></div>
        <div className="hidden lg:flex"><AppSidebar /></div>
        <main id="main-content" tabIndex={-1} className="safe-bottom-content min-w-0 flex-1 bg-background px-page-x pt-mobile-header md:overflow-y-auto md:pb-0 md:pt-0">
          <OfflineBanner />
          <PullToRefresh>
            <div className="mx-auto w-full min-w-0 max-w-reading py-3 md:max-w-app md:py-5 lg:py-6">
              {children}
            </div>
          </PullToRefresh>
        </main>
        <div className="md:hidden"><BottomNav mainItems={mainItems} moreItems={moreItems} /></div>
      </div>
    </div>
  );
}
