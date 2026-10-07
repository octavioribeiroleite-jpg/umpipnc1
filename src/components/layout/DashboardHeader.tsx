import { Bell, Download, LogOut, RefreshCw, Settings } from 'lucide-react';
import { useRef } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { applyUpdateNow } from '@/lib/registerSW';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ExitConfirmDialog, useExitConfirm } from './ExitConfirmDialog';
import { WorkspaceHeader } from './WorkspaceHeader';

export function DashboardHeader({ hasNotifications, workspace = 'diretoria' }: { hasNotifications: boolean; workspace?: 'diretoria' | 'pastor' }) {
  const { profile, society, isAdmin, isPastor, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const accountRef = useRef<HTMLButtonElement>(null);
  const { isInstalled, open: openInstall } = usePWAInstall();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const name = profile?.full_name || 'Diretoria IPNC';
  const role = isAdmin ? 'Administração' : isPastor ? 'Área pastoral' : 'Diretoria';
  const scope = society?.slug?.toUpperCase();
  const pastoral = workspace === 'pastor' || (isPastor && !isAdmin);

  return <>
    <WorkspaceHeader className="ipnc-workspace-header--diretoria" mobileTitle={pastoral ? 'Painel pastoral' : 'Diretoria IPNC'} accountButtonRef={accountRef} onBack={pathname !== '/' && pathname !== '/pastor' ? () => navigate(-1) : undefined} accountName={name} accountRole={`${role}${scope ? ` — ${scope}` : ''}`} actions={
      <button type="button" className="dashboard-notifications" aria-label="Abrir comunicados" onClick={() => navigate(pastoral ? '/pastor/comunicados' : '/comunicados')}>
        <Bell aria-hidden="true" />
        {hasNotifications && <span className="dashboard-notification-dot" aria-label="Há pendências ou comunicados" />}
      </button>
    } menu={<>
          <DropdownMenuItem onSelect={() => navigate('/configuracoes')}><Settings className="mr-2 h-4 w-4" />Configurações</DropdownMenuItem>
          {!isInstalled && <DropdownMenuItem onSelect={() => openInstall(accountRef.current ?? undefined)}><Download className="mr-2 h-4 w-4" />Instalar aplicativo</DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => void applyUpdateNow().catch(error => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar. Tente novamente.'))}><RefreshCw className="mr-2 h-4 w-4" />Atualizar para última versão</DropdownMenuItem>
          <DropdownMenuItem onSelect={requestExit}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
    </>} />
    <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={async () => { await signOut(); navigate('/auth'); }} />
  </>;
}
