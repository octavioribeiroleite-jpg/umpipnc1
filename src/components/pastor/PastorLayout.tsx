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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src={logoIpnc} alt="Renovo IPNC" className="h-16 w-16 animate-logo-pulse" />
      </div>
    );
  }

  if (!user) return null;

  if (!isPastor && !isAdmin) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />

      {/* Desktop layout */}
      {!isMobile && (
        <div className="flex min-h-screen">
          <PastorSidebar />
          <main className="flex-1 overflow-auto">
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
          <main className="flex-1 overflow-auto pt-14 px-3 pb-4">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
