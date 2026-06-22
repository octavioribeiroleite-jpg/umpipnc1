import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { ArrowLeft, LogOut } from 'lucide-react';
import { InstallButton } from '@/components/layout/InstallButton';
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
    <header className="fixed inset-x-0 top-0 z-50 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#064e43_0%,#064237_54%,#04332d_100%)] text-white shadow-[0_8px_24px_rgba(3,35,29,0.18)] safe-top">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-24 h-40 w-40 rounded-full border border-emerald-200/10 sm:h-52 sm:w-52" />
        <div className="absolute right-20 top-0 h-20 w-40 rotate-[-18deg] rounded-[100%] bg-emerald-300/5 sm:h-24 sm:w-48" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent" />
      </div>

      <div className="relative flex h-14 items-center justify-between gap-2 px-2.5 sm:h-16 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/20 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md sm:h-12 sm:w-12">
            <img src={logoIpnc} alt="Renovo IPNC" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold leading-tight tracking-tight text-white sm:text-lg">
              {title}
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-medium text-emerald-50/80 sm:text-xs">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
          <UpdateAppButton
            variant="icon"
            className="!h-9 !w-9 rounded-full border border-white/15 bg-white/10 !text-white backdrop-blur-md hover:!bg-white/20 hover:!text-white sm:!h-10 sm:!w-10"
          />

          <div className="hidden sm:block [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-full [&_button]:border [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button]:backdrop-blur-md hover:[&_button]:bg-white/20">
            <InstallButton />
          </div>

          {profile && (
            <button
              onClick={requestExit}
              aria-label="Sair"
              title="Sair"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:h-10 sm:w-10"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
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
