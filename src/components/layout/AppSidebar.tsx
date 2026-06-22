import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoIpnc from '@/assets/logo-ipnc.png';
import { BuildStamp } from '@/components/BuildStamp';
import { UpdateAppButton } from '@/components/UpdateAppButton';
import { useScrollIndicators } from '@/hooks/useScrollIndicators';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { getAppNavigationItems, isNavigationPathActive } from './appNavigation';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { canScrollUp, canScrollDown, scrollUp, scrollDown } = useScrollIndicators(navRef);
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const menuItems = getAppNavigationItems(isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300',
        collapsed ? 'w-16' : 'w-60 xl:w-64',
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        {!collapsed && (
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left">
            <div className="flex items-center justify-center rounded-lg bg-white p-1">
              <img src={logoIpnc} alt="Renovo IPNC" className="h-9 w-9 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-sidebar-primary">Renovo</span>
              <span className="text-xs text-sidebar-muted">IPNC</span>
            </div>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        {canScrollUp && !collapsed && (
          <button
            type="button"
            onClick={scrollUp}
            aria-label="Ver itens acima"
            className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-sidebar-border bg-sidebar/95 p-1 text-sidebar-foreground shadow-md"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}

        <nav ref={navRef} className="h-full overflow-y-auto py-4 scrollbar-thin" aria-label="Navegação principal">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const active = isNavigationPathActive(location.pathname, item.path);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex w-full items-center rounded-lg px-3 py-2.5 transition-all duration-200',
                      'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                        : 'text-sidebar-foreground',
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 flex-shrink-0', collapsed ? 'mx-auto' : 'mr-3')} />
                    {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {canScrollDown && !collapsed && (
          <button
            type="button"
            onClick={scrollDown}
            aria-label="Ver mais itens"
            className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-sidebar-border bg-sidebar/95 p-1 text-sidebar-foreground shadow-md"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{profile.full_name}</p>
            <p className="truncate text-xs text-sidebar-muted">{profile.email}</p>
          </div>
        )}

        <div className={cn('mb-2', collapsed && 'flex justify-center')}>
          {collapsed ? <UpdateAppButton variant="icon" /> : <UpdateAppButton variant="full" />}
        </div>

        <Button
          variant="ghost"
          onClick={requestExit}
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className={cn('h-5 w-5', collapsed ? '' : 'mr-3')} />
          {!collapsed && <span>Sair</span>}
        </Button>

        <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={handleSignOut} />
        {!collapsed && <BuildStamp className="mt-3" />}
      </div>
    </aside>
  );
}
