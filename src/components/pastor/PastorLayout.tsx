import { useWorkspaceTheme } from '@/hooks/useWorkspaceTheme';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PastorSidebar } from './PastorSidebar';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { PastorMobileNav } from './PastorMobileNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import AppLoadingSplash from '@/components/layout/AppLoadingSplash';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import '@/pages/dashboard.css';

interface PastorLayoutProps {
  children: React.ReactNode;
  wide?: boolean;
}

export function PastorLayout({ children, wide = false }: PastorLayoutProps) {
  const { user, loading, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();
  useSwipeBack();
  useWorkspaceTheme(Boolean(user && !loading && (isAdmin || isPastor)));

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return <AppLoadingSplash label="Carregando…" />;
  }

  if (!user) return null;

  if (!isPastor && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="ipnc-pastor-layout ipnc-dashboard-shell ipnc-navigation-layout ipnc-safe-managed min-h-[var(--app-viewport-height)] w-full bg-background text-foreground">
      <a href="#pastor-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:text-primary focus:shadow-lg">
        Ir para o conteúdo
      </a>
      <div className="min-h-[var(--app-viewport-height)] min-w-0 min-[700px]:flex min-[700px]:h-[var(--app-viewport-height)] min-[700px]:overflow-hidden">
        <div className="hidden min-[700px]:block">
          <PastorSidebar />
        </div>
        {/* One content tree preserves form state and subscriptions across breakpoints. */}
        <main id="pastor-content" tabIndex={-1} className="safe-bottom-content ipnc-safe-page-x min-w-0 flex-1 min-[700px]:overflow-y-auto min-[700px]:pb-0 min-[700px]:pt-0">
          <OfflineBanner />
          <div className={`ipnc-workspace-main mx-auto w-full min-w-0 py-4 min-[700px]:py-6 ${wide ? 'max-w-[1360px]' : 'max-w-[1120px]'}`}>
            <DashboardHeader workspace="pastor" hasNotifications={false} />
            {children}
          </div>
        </main>
        <div className="min-[700px]:hidden">
          <PastorMobileNav />
        </div>
      </div>
    </div>
  );
}
