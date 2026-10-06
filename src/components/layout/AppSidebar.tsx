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
import './diretoria-navigation.css';

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
      className="diretoria-nav-shell diretoria-sidebar"
      data-collapsed={collapsed}
    >
      <div className="diretoria-sidebar__header">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Ir para a página inicial"
          title="Home"
          className="diretoria-sidebar__brand"
        >
          <img src={logoIpnc} alt="Marca IPNC" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="diretoria-sidebar__collapse"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="diretoria-sidebar__body">
        {canScrollUp && !collapsed && (
          <button
            type="button"
            onClick={scrollUp}
            aria-label="Ver itens acima"
            className="diretoria-sidebar__scroll diretoria-sidebar__scroll--up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}

        <nav ref={navRef} className="diretoria-sidebar__nav scrollbar-thin" aria-label="Navegação principal">
          <ul className="diretoria-sidebar__list">
            {menuItems.map((item) => {
              const active = isNavigationPathActive(location.pathname, item.path);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'diretoria-nav-item',
                      active && 'diretoria-nav-item--active',
                    )}
                  >
                    <item.icon aria-hidden="true" className="diretoria-nav-item__icon" />
                    {!collapsed && <span className="diretoria-nav-item__label">{item.label}</span>}
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
            className="diretoria-sidebar__scroll diretoria-sidebar__scroll--down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="diretoria-sidebar__footer">
        {!collapsed && profile && (
          <div className="diretoria-sidebar__profile">
            <p className="diretoria-sidebar__profile-name">{profile.full_name}</p>
            <p className="diretoria-sidebar__profile-email">{profile.email}</p>
          </div>
        )}

        <div className="diretoria-sidebar__update">
          <UpdateAppButton variant={collapsed ? 'icon' : 'full'} className="diretoria-sidebar__update-button" />
        </div>

        <Button
          variant="ghost"
          onClick={requestExit}
          className="diretoria-sidebar__exit"
          aria-label="Sair"
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut aria-hidden="true" className="diretoria-nav-item__icon" />
          {!collapsed && <span>Sair</span>}
        </Button>

        <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={handleSignOut} />
        {!collapsed && <BuildStamp className="diretoria-sidebar__build-stamp" />}
      </div>
    </aside>
  );
}
