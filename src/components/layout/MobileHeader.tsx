import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import {
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { InstallButton } from '@/components/layout/InstallButton';
import { UpdateAppButton } from '@/components/UpdateAppButton';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';

export function MobileHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useSwipeBack();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();

  const isHome = location.pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const lastUpdate = (() => {
    try {
      const iso =
        typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
      if (!iso) return '';
      const d = new Date(iso);
      const date = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      const time = d
        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        .replace(':', 'h');
      return `${date} ${time}`;
    } catch {
      return '';
    }
  })();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-emerald-950/80 text-white backdrop-blur-md safe-top">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="p-1.5 -ml-1.5 text-emerald-100 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <img src={logoIpnc} alt="Renovo IPNC" className="h-9 w-9 sm:h-10 sm:w-10 object-contain flex-shrink-0" />
          <span className="font-semibold text-white text-base sm:text-lg truncate">
            {profile?.full_name || 'IPNC'}
          </span>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {lastUpdate && (
            <span
              className="hidden xs:inline text-[10px] leading-tight text-muted-foreground mr-1 text-right"
              title={`Última atualização: ${lastUpdate}`}
            >
              v{lastUpdate}
            </span>
          )}
          <UpdateAppButton variant="icon" />
          <InstallButton />
          {profile && (
            <button
              onClick={requestExit}
              aria-label="Sair"
              title="Sair"
              className="p-1.5 text-emerald-100 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <ExitConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleSignOut}
      />
    </header>
  );
}
