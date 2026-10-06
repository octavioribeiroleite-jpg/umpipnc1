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
  width?: 'standard' | 'wide' | 'reading';
  variant?: 'default' | 'dashboard';
}

export function AppLayout({ children, width = 'standard', variant = 'default' }: AppLayoutProps) {
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
    <div className={`app-page ipnc-navigation-layout ipnc-safe-managed min-h-[var(--app-viewport-height)]${variant === 'dashboard' ? ' diretoria-dashboard-shell' : ''}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:text-primary focus:shadow-lg">Pular para o conteúdo</a>
      <ExitConfirmDialog open={exitOpen} onOpenChange={setExitOpen} onConfirm={async () => { await signOut(); navigate('/auth'); }} />
      {/* Keep one content tree: CSS-hidden copies still mount effects and channels. */}
      <div className="min-h-[var(--app-viewport-height)] min-w-0 min-[700px]:flex min-[700px]:h-[var(--app-viewport-height)] min-[700px]:overflow-hidden">
        <div className="min-[700px]:hidden"><MobileHeader /></div>
        <div className="hidden min-[700px]:flex min-[1100px]:hidden"><TabletNavigationRail /></div>
        <div className="hidden min-[1100px]:flex"><AppSidebar /></div>
        <main id="main-content" tabIndex={-1} className="safe-bottom-content ipnc-safe-page-x min-w-0 flex-1 bg-background pt-mobile-header min-[700px]:overflow-y-auto min-[700px]:pb-0 min-[700px]:pt-0">
          <OfflineBanner />
          <PullToRefresh>
            <div className="mx-auto w-full min-w-0 py-4 min-[700px]:py-6" style={{ maxWidth: width === 'wide' ? '85rem' : width === 'reading' ? '48rem' : 'var(--content-max-width)' }}>
              {children}
            </div>
          </PullToRefresh>
        </main>
        <div className="min-[700px]:hidden"><BottomNav desktopBreakpoint="700" mainItems={mainItems} moreItems={moreItems} /></div>
      </div>
    </div>
  );
}
