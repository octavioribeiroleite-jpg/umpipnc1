import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PastorSidebar } from './PastorSidebar';
import { PastorMobileHeader } from './PastorMobileHeader';
import { PastorMobileNav } from './PastorMobileNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import AppLoadingSplash from '@/components/layout/AppLoadingSplash';

interface PastorLayoutProps {
  children: React.ReactNode;
  wide?: boolean;
}

export function PastorLayout({ children, wide = false }: PastorLayoutProps) {
  const { user, loading, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();

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
    <div className="ipnc-pastor-layout ipnc-navigation-layout ipnc-safe-managed min-h-[var(--app-viewport-height)] w-full bg-background text-foreground">
      <OfflineBanner />
      <a href="#pastor-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:text-primary focus:shadow-lg">
        Ir para o conteúdo
      </a>
      <div className="flex min-h-[var(--app-viewport-height)]">
        <div className="hidden min-[700px]:block">
          <PastorSidebar />
        </div>
        <div className="min-[700px]:hidden">
          <PastorMobileHeader />
        </div>
        {/* One content tree preserves form state and subscriptions across breakpoints. */}
        <main id="pastor-content" tabIndex={-1} className="ipnc-safe-page-x min-w-0 flex-1 pb-[calc(var(--bottom-nav-height)+1rem)] pt-[calc(var(--mobile-header-height)+1rem)] min-[700px]:pt-6 min-[700px]:pb-6">
          <div className={`mx-auto w-full ${wide ? 'max-w-[1360px]' : 'max-w-[1120px]'}`}>{children}</div>
        </main>
        <div className="min-[700px]:hidden">
          <PastorMobileNav />
        </div>
      </div>
    </div>
  );
}
