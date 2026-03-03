import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PastorSidebar } from './PastorSidebar';
import { PastorMobileHeader } from './PastorMobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import logoIpnc from '@/assets/logo-ipnc.png';
import { OfflineBanner } from '@/components/OfflineBanner';

interface PastorLayoutProps {
  children: React.ReactNode;
}

export function PastorLayout({ children }: PastorLayoutProps) {
  const { user, profile, loading, signOut, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start pt-[18vh] relative">
        <div className="absolute inset-0 bg-cover bg-center safe-top" style={{ backgroundImage: 'url(/images/bg-app.png)' }} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center">
          <img src={logoIpnc} alt="Renovo IPNC" className="h-56 w-56 mx-auto object-contain mb-6 animate-logo-pulse" />
          <h1 className="text-white text-2xl font-bold tracking-tight mb-1">Igreja Presbiteriana</h1>
          <p className="text-white/60 text-base mb-8">de Nova Carapina</p>
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
    <div className="min-h-screen">
      <OfflineBanner />

      {/* Desktop layout */}
      {!isMobile && (
        <div className="flex min-h-screen">
          <PastorSidebar />
          <main className="flex-1 overflow-auto bg-background/60 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      )}

      {/* Mobile layout with hamburger menu */}
      {isMobile && (
        <div className="flex flex-col min-h-screen">
          <PastorMobileHeader />
          <main className="flex-1 overflow-auto pt-16 px-3 pb-4 bg-background/60 backdrop-blur-sm">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
