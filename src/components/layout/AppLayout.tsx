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

      {/* Keep one content tree: CSS-hidden copies still mount effects and channels. */}
      <div className="min-h-screen min-w-0 md:flex md:h-screen md:overflow-hidden">
        <div className="md:hidden"><MobileHeader /></div>
        <div className="hidden md:flex lg:hidden"><TabletNavigationRail /></div>
        <div className="hidden lg:flex"><AppSidebar /></div>
        <main className="safe-bottom-content min-w-0 flex-1 overflow-x-hidden bg-background/80 px-page-x pt-mobile-header md:overflow-y-auto md:pb-0 md:pt-0 md:backdrop-blur-sm">
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
