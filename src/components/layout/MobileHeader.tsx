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
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();

  const isHome = location.pathname === '/';
  const contextualSubtitle = routeSubtitles.find(([path]) => location.pathname.startsWith(path))?.[1];
  const subtitle = contextualSubtitle
    || (isAdmin ? 'Administração geral da igreja' : isPastor ? 'Visão pastoral' : 'Gestão da sociedade');
  const title = profile?.full_name || society?.name || 'IPNC';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="safe-top fixed inset-x-0 top-0 z-50 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#064e43_0%,#064237_54%,#04332d_100%)] text-white shadow-[0_8px_24px_rgba(3,35,29,0.18)] md:hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-14 -top-20 h-36 w-36 rounded-full border border-emerald-200/10" />
        <div className="absolute right-16 top-0 h-16 w-32 rotate-[-18deg] rounded-[100%] bg-emerald-300/5" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent" />
      </div>

      <div className="relative flex h-mobile-header items-center justify-between gap-2 px-page-x">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="touch-target flex flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-md">
            <img src={logoIpnc} alt="Renovo IPNC" className="h-7 w-7 object-contain" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold leading-tight tracking-tight text-white xs:text-base">
              {title}
            </h1>
            <p className="mt-0.5 hidden truncate text-[10px] font-medium leading-none text-emerald-50/80 xs:block">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <UpdateAppButton
            variant="icon"
            className="!h-9 !w-9 rounded-full border border-white/15 bg-white/10 !text-white backdrop-blur-md hover:!bg-white/20 hover:!text-white"
          />

          {profile && (
            <button
              type="button"
              onClick={requestExit}
              aria-label="Sair"
              title="Sair"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
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
