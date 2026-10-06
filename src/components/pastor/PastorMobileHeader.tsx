import { useRef } from 'react';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import {
  ArrowLeft,
} from 'lucide-react';
import { InstallButton } from '@/components/layout/InstallButton';
import { useNavigationHeight } from '@/components/layout/useNavigationHeight';

export function PastorMobileHeader() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useSwipeBack();
  const headerContentRef = useRef<HTMLDivElement>(null);
  useNavigationHeight(headerContentRef, '--mobile-header-content-height');

  const isPastorHome = location.pathname === '/pastor';

  return (
    <header className="ipnc-mobile-header fixed top-0 left-0 right-0 z-50 border-b border-border bg-card">
      <div ref={headerContentRef} className="ipnc-mobile-header-content ipnc-safe-page-x flex items-center justify-between min-h-16 py-2 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {!isPastorHome && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="flex h-[48px] w-[48px] items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {isPastorHome && (
            <div className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <img src={logoIpnc} alt="Marca IPNC" className="h-full w-full object-contain" />
            </div>
          )}
          <span title={profile?.full_name} className="font-semibold text-foreground text-sm sm:text-base break-words leading-tight">
            {profile?.full_name?.trim().split(/\s+/).slice(0, 1).join(' ') || 'Painel do Pastor'}
          </span>
        </div>
        <div className="flex-shrink-0">
          <InstallButton />
        </div>
      </div>
    </header>
  );
}
