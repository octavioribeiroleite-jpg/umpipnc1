import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <OfflineBanner />

      {/* Desktop layout (>= lg) */}
      <div className="hidden lg:flex min-h-screen">
        <PastorSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden bg-background/60 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile + tablet layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <PastorMobileHeader />
        <main className="flex-1 overflow-x-hidden pt-14 px-3 sm:px-4 pb-24 bg-background/60 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl">
            {children}
          </div>
        </main>
        <PastorMobileNav />
      </div>
    </div>
  );
}
