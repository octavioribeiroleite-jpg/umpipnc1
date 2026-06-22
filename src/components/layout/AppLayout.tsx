import { type ReactNode, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { silentUpdateCheck } from '@/lib/registerSW';
import { OfflineBanner } from '@/components/OfflineBanner';
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
      onClick: async () => {
        await signOut();
        navigate('/auth');
      },
    },
  ];

  return (
    <div className="app-page min-h-screen overflow-x-hidden">
      <OfflineBanner />

      {/* Telefone: cabeçalho superior + navegação inferior */}
      <div className="flex min-h-screen flex-col md:hidden">
        <MobileHeader />
        <main className="safe-bottom-content min-w-0 flex-1 overflow-x-hidden bg-background/80 px-page-x pt-mobile-header">
          <PullToRefresh>
            <div className="mx-auto w-full min-w-0 max-w-reading py-3">
              {children}
            </div>
          </PullToRefresh>
        </main>
        <BottomNav mainItems={mainItems} moreItems={moreItems} />
      </div>

      {/* Tablet: rail lateral compacto, sem navegação inferior */}
      <div className="hidden h-screen min-w-0 overflow-hidden md:flex lg:hidden">
        <TabletNavigationRail />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full min-w-0 max-w-app px-page-x py-5">
            {children}
          </div>
        </main>
      </div>

      {/* Computador: sidebar completa e conteúdo amplo */}
      <div className="hidden h-screen min-w-0 overflow-hidden lg:flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full min-w-0 max-w-app px-page-x py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
