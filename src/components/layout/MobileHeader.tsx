import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { ArrowLeft, LogOut } from 'lucide-react';
import { UpdateAppButton } from '@/components/UpdateAppButton';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';

const routeSubtitles: Array<[string, string]> = [
  ['/financas', 'Gestão financeira da sociedade'],
  ['/reunioes', 'Reuniões e atas da sociedade'],
  ['/calendario', 'Agenda e compromissos'],
  ['/tarefas', 'Organização das atividades'],
  ['/plenarias', 'Plenárias e deliberações'],
  ['/comunicados', 'Comunicação com os membros'],
  ['/aniversariantes', 'Datas especiais da sociedade'],
  ['/arquivos', 'Documentos e arquivos'],
  ['/dizimos', 'Dízimos e ofertas'],
  ['/estudos', 'Estudos e conteúdos'],
  ['/secretaria', 'Gestão da Secretaria EBD'],
  ['/configuracoes', 'Configurações da sociedade'],
  ['/usuarios', 'Gestão de acessos'],
];

export function MobileHeader() {
  const { profile, society, isAdmin, isPastor, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useSwipeBack();
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    const shell = header?.closest<HTMLElement>('.app-page');
    if (!header || !shell) return;
    const measure = () => shell.style.setProperty('--mobile-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => { observer.disconnect(); shell.style.removeProperty('--mobile-header-height'); };
  }, []);

  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();

  const isHome = location.pathname === '/';
  const contextualSubtitle = routeSubtitles.find(([path]) => location.pathname.startsWith(path))?.[1];
  const subtitle = contextualSubtitle
    || (isAdmin ? 'Administração geral da igreja' : isPastor ? 'Visão pastoral' : 'Gestão da sociedade');
  const fullTitle = profile?.full_name || society?.name || 'IPNC';
  const title = profile?.full_name ? profile.full_name.trim().split(/\s+/).slice(0, 1).join(' ') : fullTitle;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header ref={headerRef} className={`diretoria-mobile-header${isHome ? ' diretoria-mobile-header--home' : ''} safe-top fixed inset-x-0 top-0 z-50 overflow-hidden border-b border-white/10 bg-sidebar text-white shadow-[0_8px_24px_rgba(3,35,29,0.18)] min-[700px]:hidden`}>
      <div className="relative flex min-h-[64px] py-2 items-center justify-between gap-2 px-page-x">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="min-h-[48px] min-w-[48px] flex flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {isHome && (<div className="dashboard-mobile-brand flex flex-shrink-0 items-center justify-center">
            <img src={logoIpnc} alt="Marca IPNC" className="h-[48px] w-[52px] object-contain" />
          </div> )}

          <div className="min-w-0">
            <p title={fullTitle} className="break-words text-sm font-extrabold leading-tight tracking-tight text-white xs:text-base">
              {title}
            </p>
            <p className="mt-0.5 hidden break-words text-[13px] font-medium leading-none text-emerald-50/80 xs:block">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <UpdateAppButton
            variant="icon"
            className="!h-[48px] !w-[48px] rounded-full border border-white/15 bg-white/10 !text-white backdrop-blur-md hover:!bg-white/20 hover:!text-white"
          />

          {profile && (
            <button
              type="button"
              onClick={requestExit}
              aria-label="Sair"
              title="Sair"
              className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
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
