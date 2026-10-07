import type { ReactNode } from 'react';
import { Home, LogOut } from 'lucide-react';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import '@/pages/secretaria-home.css';
import './secretaria-workspace.css';

interface Props {
  title: string;
  profileLabel: string;
  onBack: () => void;
  onHome?: () => void;
  onExit: () => void;
  syncNotice: ReactNode;
  children: ReactNode;
  header?: ReactNode;
}

/** Shared visual shell; access rules and view state remain owned by Secretaria. */
export function SecretariaWorkspace({ title, profileLabel, onBack, onHome = onBack, onExit, syncNotice, children, header }: Props) {
  return (
    <div className="ebd-workspace">
      <div className="ebd-workspace-topbar">{header ?? <WorkspaceHeader title={title} titleAsHeading accountName={profileLabel} accountRole="Secretaria EBD" onBack={onBack} actions={<HeaderActions showInstall={false} showVersion={false} />} menu={<><DropdownMenuItem onSelect={onHome}><Home className="mr-2 h-4 w-4" />Menu da Secretaria</DropdownMenuItem><DropdownMenuItem onSelect={onExit}><LogOut className="mr-2 h-4 w-4" />Sair da Secretaria</DropdownMenuItem></>} />}</div>
      <main id="ebd-main" tabIndex={-1} className="ebd-workspace-main">
        <div className="ebd-workspace-status">
          <div className="ebd-sync">{syncNotice}</div>
        </div>
        {children}
      </main>
    </div>
  );
}
