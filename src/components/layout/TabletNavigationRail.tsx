import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import logoIpnc from '@/assets/logo-ipnc.png';
import { UpdateAppButton } from '@/components/UpdateAppButton';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { getAppNavigationItems, isNavigationPathActive } from './appNavigation';

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
    <aside className="sticky top-0 flex h-screen w-[72px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[8px_0_28px_rgba(3,35,29,0.12)]">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Ir para a página inicial"
        title="Home"
        className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-sm transition-colors hover:bg-white/15"
      >
        <img src={logoIpnc} alt="Renovo IPNC" className="h-9 w-9 object-contain" />
      </button>

      <div className="mx-3 my-3 h-px bg-sidebar-border" />

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin" aria-label="Navegação principal do tablet">
        <ul className="space-y-1.5">
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
                    'relative flex h-12 w-full items-center justify-center rounded-2xl transition-all duration-200',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {active && (
                    <span className="absolute -right-2 h-6 w-1 rounded-l-full bg-emerald-200" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-2">
        <UpdateAppButton
          variant="icon"
          className="!h-12 !w-full rounded-2xl !text-sidebar-foreground hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground"
        />
        <button
          type="button"
          onClick={requestExit}
          aria-label="Sair"
          title="Sair"
          className="flex h-12 w-full items-center justify-center rounded-2xl text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
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
