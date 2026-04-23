import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import {
  ArrowLeft,
} from 'lucide-react';
import { InstallButton } from '@/components/layout/InstallButton';

export function MobileHeader() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useSwipeBack();

  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md safe-top">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <img src={logoIpnc} alt="Renovo IPNC" className="h-9 w-9 sm:h-10 sm:w-10 object-contain flex-shrink-0" />
          <span className="font-semibold text-foreground text-base sm:text-lg truncate">
            {profile?.full_name || 'IPNC'}
          </span>
        </div>
        <div className="flex-shrink-0">
          <InstallButton />
        </div>
      </div>
    </header>
  );
}
