import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PastorSidebar } from './PastorSidebar';
import { PastorMobileNav } from './PastorMobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';

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
      {/* Mobile Header */}
      {isMobile && (
        <header className="border-b bg-card sticky top-0 z-40">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoIpnc} alt="Renovo IPNC" className="h-8 w-8 object-contain" />
              <div>
                <h1 className="font-bold text-sm">Painel do Pastor</h1>
                <p className="text-[10px] text-muted-foreground">{profile?.full_name || 'Pastor'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate('/auth'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && <PastorSidebar />}

        {/* Main Content */}
        <main className={`flex-1 ${isMobile ? 'pb-20' : ''} overflow-auto`}>
          <div className="max-w-5xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && <PastorMobileNav />}
    </div>
  );
}
