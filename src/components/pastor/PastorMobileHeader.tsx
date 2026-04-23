import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import {
  ArrowLeft,
} from 'lucide-react';
import { InstallButton } from '@/components/layout/InstallButton';

export function PastorMobileHeader() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useSwipeBack();

  const isPastorHome = location.pathname === '/pastor';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md safe-top">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {!isPastorHome && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <img src={logoIpnc} alt="IPNC" className="h-9 w-9 sm:h-10 sm:w-10 object-contain flex-shrink-0" />
          <span className="font-semibold text-foreground text-sm sm:text-base md:text-lg truncate">
            {profile?.full_name || 'Painel do Pastor'}
          </span>
        </div>
        <div className="flex-shrink-0">
          <InstallButton />
        </div>
      </div>
    </header>
  );
}
