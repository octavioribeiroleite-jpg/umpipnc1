import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import logoIpnc from '@/assets/logo-ipnc.png';
import { UpdateAppButton } from '@/components/UpdateAppButton';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { getAppNavigationItems, isNavigationPathActive } from './appNavigation';
import './diretoria-navigation.css';

export function TabletNavigationRail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const items = getAppNavigationItems(isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="diretoria-nav-shell diretoria-rail">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Ir para a página inicial"
        title="Home"
        className="diretoria-rail__brand"
      >
        <img src={logoIpnc} alt="Marca IPNC" />
      </button>

      <div className="diretoria-rail__divider" />

      <nav className="diretoria-rail__nav scrollbar-thin" aria-label="Navegação principal do tablet">
        <ul className="diretoria-rail__list">
          {items.map((item) => {
            const active = isNavigationPathActive(location.pathname, item.path);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  className={cn(
                    'diretoria-nav-item',
                    active && 'diretoria-nav-item--active',
                  )}
                >
                  <item.icon aria-hidden="true" className="diretoria-nav-item__icon" />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="diretoria-rail__footer">
        <UpdateAppButton
          variant="icon"
          className="diretoria-rail__update"
        />
        <button
          type="button"
          onClick={requestExit}
          aria-label="Sair"
          title="Sair"
          className="diretoria-rail__exit"
        >
          <LogOut aria-hidden="true" className="diretoria-nav-item__icon" />
        </button>
      </div>

      <ExitConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleSignOut}
      />
    </aside>
  );
}
