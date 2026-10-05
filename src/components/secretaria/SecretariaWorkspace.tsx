import type { ReactNode } from 'react';
import { ArrowLeft, Home, LogOut, UserRound } from 'lucide-react';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
}

/** Shared visual shell; access rules and view state remain owned by Secretaria. */
export function SecretariaWorkspace({ title, profileLabel, onBack, onHome = onBack, onExit, syncNotice, children }: Props) {
  return (
    <div className="ebd-workspace">
      <header className="ebd-workspace-header safe-top">
        <div className="ebd-workspace-header-inner">
          <button type="button" className="ebd-back" onClick={onBack} aria-label="Voltar"><ArrowLeft aria-hidden="true" /></button>
          <div className="ebd-heading">
            <p>Secretaria EBD</p>
            <h1>{title}</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ebd-profile" aria-label="Menu do usuário"><UserRound aria-hidden="true" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>{profileLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onHome}><Home className="mr-2 h-4 w-4" />Menu da Secretaria</DropdownMenuItem>
              <DropdownMenuItem onSelect={onExit}><LogOut className="mr-2 h-4 w-4" />Sair da Secretaria</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="ebd-workspace-main">
        <div className="ebd-workspace-status">
          <div className="ebd-sync">{syncNotice}</div>
          <HeaderActions showVersion={false} />
        </div>
        {children}
      </main>
    </div>
  );
}
