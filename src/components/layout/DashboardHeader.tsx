import { Bell, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExitConfirmDialog, useExitConfirm } from './ExitConfirmDialog';

export function DashboardHeader({ hasNotifications }: { hasNotifications: boolean }) {
  const { profile, society, isAdmin, isPastor, signOut } = useAuth();
  const navigate = useNavigate();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const name = profile?.full_name || 'Diretoria IPNC';
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const role = isAdmin ? 'Administração' : isPastor ? 'Área pastoral' : 'Diretoria';
  const scope = society?.slug?.toUpperCase();

  return <header className="dashboard-topbar">
    <p className="dashboard-motto">Juntos por uma igreja viva,<br />servindo a Cristo.</p>
    <div className="dashboard-topbar-actions">
      <button type="button" className="dashboard-notifications" aria-label="Abrir comunicados" onClick={() => navigate('/comunicados')}>
        <Bell aria-hidden="true" />
        {hasNotifications && <span className="dashboard-notification-dot" aria-label="Há pendências ou comunicados" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="dashboard-account" aria-label={`Abrir menu da conta de ${name}`}>
            <span className="dashboard-avatar" aria-hidden="true">{initials}</span>
            <span className="dashboard-account-copy"><strong>{name}</strong><span>{role}{scope ? ` — ${scope}` : ''}</span></span>
            <ChevronDown className="dashboard-account-chevron" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/configuracoes')}><Settings className="mr-2 h-4 w-4" />Configurações</DropdownMenuItem>
          <DropdownMenuItem onSelect={requestExit}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={async () => { await signOut(); navigate('/auth'); }} />
  </header>;
}
