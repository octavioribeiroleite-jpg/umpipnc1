import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PastorSidebar } from './PastorSidebar';
import { PastorMobileHeader } from './PastorMobileHeader';
import { PastorMobileNav } from './PastorMobileNav';
import logoIpnc from '@/assets/logo-ipnc.png';
import { OfflineBanner } from '@/components/OfflineBanner';

interface PastorLayoutProps {
  children: React.ReactNode;
}

export function PastorLayout({ children }: PastorLayoutProps) {
  const { user, loading, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start pt-[18vh] relative px-4">
        <div className="absolute inset-0 bg-cover bg-center safe-top" style={{ backgroundImage: 'url(/images/bg-app.png)' }} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center">
          <img
            src={logoIpnc}
            alt="Renovo IPNC"
            className="h-32 w-32 sm:h-44 sm:w-44 md:h-56 md:w-56 mx-auto object-contain mb-6 animate-logo-pulse"
          />
          <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-1">Igreja Presbiteriana</h1>
          <p className="text-white/60 text-sm sm:text-base mb-8">de Nova Carapina</p>
          <p className="text-white/50 text-sm animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!isPastor && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      <OfflineBanner />
      <a href="#pastor-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:text-primary focus:shadow-lg">
        Ir para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <div className="hidden lg:block">
          <PastorSidebar />
        </div>
        <div className="lg:hidden">
          <PastorMobileHeader />
        </div>
        {/* One content tree preserves form state and subscriptions across breakpoints. */}
        <main id="pastor-content" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-6 lg:py-7 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <div className="lg:hidden">
          <PastorMobileNav />
        </div>
      </div>
    </div>
  );
}
