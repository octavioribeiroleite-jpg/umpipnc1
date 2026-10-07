import { type ReactNode, type Ref } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import './workspace-header.css';

interface Props {
  accountName: string;
  accountRole: string;
  title?: string;
  mobileTitle?: string;
  titleAsHeading?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  menu: ReactNode;
  accountButtonRef?: Ref<HTMLButtonElement>;
  className?: string;
}

/** One account/header presentation; each module supplies its own authorized actions. */
export function WorkspaceHeader({ accountName, accountRole, title, mobileTitle, titleAsHeading = false, onBack, actions, menu, accountButtonRef, className = '' }: Props) {
  const initials = accountName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const Title = titleAsHeading ? 'h1' : 'p';
  return <header className={`dashboard-topbar ipnc-workspace-header ${className}`}>
    <div className="ipnc-workspace-header__heading">
      {onBack && <button type="button" className="ipnc-workspace-header__back" onClick={onBack} aria-label="Voltar"><ArrowLeft aria-hidden="true" /></button>}
      {title ? <Title className="ipnc-workspace-header__title">{title}</Title> : <><p className="dashboard-motto">Juntos por uma igreja viva,<br />servindo a Cristo.</p>{mobileTitle && <p className="ipnc-workspace-header__mobile-title">{mobileTitle}</p>}</>}
    </div>
    <div className="dashboard-topbar-actions">
      {actions}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button ref={accountButtonRef} type="button" className="dashboard-account" aria-label={`Abrir menu da conta de ${accountName}`}>
            <span className="dashboard-avatar" aria-hidden="true">{initials || 'IP'}</span>
            <span className="dashboard-account-copy"><strong>{accountName}</strong><span>{accountRole}</span></span>
            <ChevronDown className="dashboard-account-chevron" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{accountName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>;
}
