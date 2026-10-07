import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import logoIpnc from '@/assets/logo-ipnc.png';
import { BuildStamp } from '@/components/BuildStamp';
import { UpdateAppButton } from '@/components/UpdateAppButton';
import { useScrollIndicators } from '@/hooks/useScrollIndicators';
import './diretoria-navigation.css';

export interface WorkspaceNavigationItem {
  key: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  iconStyle?: CSSProperties;
  disabled?: boolean;
}

export interface WorkspaceNavigationGroup {
  key: string;
  label: string;
  items: WorkspaceNavigationItem[];
  status?: (compact: boolean) => ReactNode;
}

const emptyGroups: WorkspaceNavigationGroup[] = [];

interface NavigationProps {
  items: WorkspaceNavigationItem[];
  groups?: WorkspaceNavigationGroup[];
  onHome: () => void;
  homeLabel?: string;
  navigationLabel?: string;
  onExit: () => void;
  exitLabel?: string;
  className?: string;
}

interface SidebarProps extends NavigationProps {
  profile?: { name: string; description?: string };
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function NavigationList({ items, compact }: { items: WorkspaceNavigationItem[]; compact: boolean }) {
  return <ul className="diretoria-sidebar__list">
    {items.map(item => <li key={item.key}>
      <button type="button" onClick={item.onClick} disabled={item.disabled} aria-label={item.label} aria-current={item.active ? 'page' : undefined} title={compact ? item.label : undefined} className={cn('diretoria-nav-item', item.active && 'diretoria-nav-item--active')}>
        <item.icon aria-hidden="true" className="diretoria-nav-item__icon" style={item.iconStyle} />
        {!compact && <span className="diretoria-nav-item__label">{item.label}</span>}
      </button>
    </li>)}
  </ul>;
}

function NavigationGroups({ groups, compact }: { groups: WorkspaceNavigationGroup[]; compact: boolean }) {
  return groups.map(group => <section key={group.key} className="diretoria-nav-group" aria-label={group.label}>
    {!compact && <p className="diretoria-nav-group__title">{group.label}</p>}
    {group.status?.(compact)}
    <NavigationList items={group.items} compact={compact} />
  </section>);
}

/** Shared presentation only. Each workspace supplies its permitted destinations
 * and owns confirmation, sessions and navigation callbacks.
 */
export function NavigationSidebar({ items, groups = emptyGroups, onHome, homeLabel = 'Ir para a página inicial', navigationLabel = 'Navegação principal', onExit, exitLabel = 'Sair', profile, collapsed: controlledCollapsed, onCollapsedChange, className }: SidebarProps) {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? localCollapsed;
  const navRef = useRef<HTMLElement>(null);
  const { canScrollUp, canScrollDown, scrollUp, scrollDown, updateIndicators } = useScrollIndicators(navRef);
  useEffect(() => { updateIndicators(); }, [items, groups, collapsed, updateIndicators]);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setLocalCollapsed(next);
    onCollapsedChange?.(next);
  };

  return (
    <aside className={cn('ipnc-navigation-sidebar diretoria-nav-shell diretoria-sidebar', className)} data-collapsed={collapsed}>
      <div className="diretoria-sidebar__header">
        <button type="button" onClick={onHome} aria-label={homeLabel} title="Home" className="diretoria-sidebar__brand"><img src={logoIpnc} alt="Marca IPNC" /></button>
        <Button type="button" variant="ghost" size="icon" onClick={toggleCollapsed} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} className="diretoria-sidebar__collapse">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <div className="diretoria-sidebar__body">
        {canScrollUp && !collapsed && <button type="button" onClick={scrollUp} aria-label="Ver itens acima" className="diretoria-sidebar__scroll diretoria-sidebar__scroll--up"><ChevronUp className="h-4 w-4" /></button>}
        <nav ref={navRef} className="diretoria-sidebar__nav scrollbar-thin" aria-label={navigationLabel}>
          <NavigationList items={items} compact={collapsed} />
          <NavigationGroups groups={groups} compact={collapsed} />
        </nav>
        {canScrollDown && !collapsed && <button type="button" onClick={scrollDown} aria-label="Ver mais itens" className="diretoria-sidebar__scroll diretoria-sidebar__scroll--down"><ChevronDown className="h-4 w-4" /></button>}
      </div>
      <div className="diretoria-sidebar__footer">
        {!collapsed && profile && <div className="diretoria-sidebar__profile"><p className="diretoria-sidebar__profile-name">{profile.name}</p>{profile.description && <p className="diretoria-sidebar__profile-email">{profile.description}</p>}</div>}
        <div className="diretoria-sidebar__update"><UpdateAppButton variant={collapsed ? 'icon' : 'full'} className="diretoria-sidebar__update-button" /></div>
        <Button type="button" variant="ghost" onClick={onExit} className="diretoria-sidebar__exit" aria-label={exitLabel} title={collapsed ? exitLabel : undefined}><LogOut aria-hidden="true" className="diretoria-nav-item__icon" />{!collapsed && <span>{exitLabel}</span>}</Button>
        {!collapsed && <BuildStamp className="diretoria-sidebar__build-stamp" />}
      </div>
    </aside>
  );
}

export function NavigationRail({ items, groups = emptyGroups, onHome, homeLabel = 'Ir para a página inicial', navigationLabel = 'Navegação principal do tablet', onExit, exitLabel = 'Sair', className }: NavigationProps) {
  return (
    <aside className={cn('ipnc-navigation-rail diretoria-nav-shell diretoria-rail', className)}>
      <button type="button" onClick={onHome} aria-label={homeLabel} title="Home" className="diretoria-rail__brand"><img src={logoIpnc} alt="Marca IPNC" /></button>
      <div className="diretoria-rail__divider" />
      <nav className="diretoria-rail__nav scrollbar-thin" aria-label={navigationLabel}>
        <NavigationList items={items} compact />
        <NavigationGroups groups={groups} compact />
      </nav>
      <div className="diretoria-rail__footer"><UpdateAppButton variant="icon" className="diretoria-rail__update" /><button type="button" onClick={onExit} aria-label={exitLabel} title={exitLabel} className="diretoria-rail__exit"><LogOut aria-hidden="true" className="diretoria-nav-item__icon" /></button></div>
    </aside>
  );
}
