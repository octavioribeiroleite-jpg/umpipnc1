import { useEffect, useRef } from 'react';
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
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    const shell = header?.closest<HTMLElement>('.ipnc-pastor-layout');
    if (!header || !shell) return;
    const measure = () => shell.style.setProperty('--mobile-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => { observer.disconnect(); shell.style.removeProperty('--mobile-header-height'); };
  }, []);


  const isPastorHome = location.pathname === '/pastor';

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card safe-top">
      <div className="flex items-center justify-between min-h-[64px] py-2 px-3 sm:px-4 gap-2">
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
          {isPastorHome && <img src={logoIpnc} alt="IPNC" className="h-[36px] w-[36px] object-contain flex-shrink-0" />}
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
