import { useState, type ReactNode } from 'react';
import { BarChart3, Cake, ClipboardList, Home, Lock, LogOut, ShieldCheck, Users, FileSpreadsheet } from 'lucide-react';
import type { EbdView } from '@/lib/ebd-navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { NavigationSidebar, NavigationRail } from '@/components/layout/WorkspaceNavigation';
import './secretaria-navigation.css';

interface Props { admin: boolean; currentView: EbdView; onView: (view: EbdView) => void; onExit: () => void; profileLabel?: string; profileDescription?: string; children: ReactNode }
const destinations = [
  { key: 'home', label: 'Início', icon: Home, admin: false },
  { key: 'chamada', label: 'Chamada', icon: ClipboardList, admin: false },
  { key: 'historico', label: 'Histórico', icon: BarChart3, admin: true },
  { key: 'turmas', label: 'Turmas', icon: Users, admin: true },
  { key: 'aniversariantes', label: 'Aniversariantes', icon: Cake, admin: true },
  { key: 'planilha', label: 'Alunos', icon: FileSpreadsheet, admin: true },
  { key: 'configuracoes', label: 'Senhas das salas', icon: Lock, admin: true },
  { key: 'acessos', label: 'Acessos', icon: ShieldCheck, admin: true },
] satisfies { key: EbdView; label: string; icon: typeof Home; admin: boolean }[];

/** Navigation is presentation only; Secretaria owns sessions and view guards. */
export function SecretariaNavigation({ admin, currentView, onView, onExit, profileLabel, profileDescription = 'Secretaria EBD', children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const items = destinations.filter(item => admin || !item.admin).map(item => ({ ...item, active: currentView === item.key, onClick: () => onView(item.key) }));
  return <div className="ebd-navigation-shell ipnc-dashboard-shell ipnc-navigation-layout ipnc-safe-managed" data-sidebar-collapsed={collapsed}>
    <a href="#ebd-main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-card focus:p-3">Ir para o conteúdo</a>
    <div className="ebd-desktop-navigation"><NavigationSidebar items={items} onHome={() => onView('home')} homeLabel="Início da Secretaria" navigationLabel="Secretaria EBD" onExit={onExit} exitLabel="Sair da Secretaria" profile={{ name: profileLabel || (admin ? 'Administrador · EBD' : 'Professor · EBD'), description: profileDescription }} collapsed={collapsed} onCollapsedChange={setCollapsed} /></div>
    <div className="ebd-tablet-navigation"><NavigationRail items={items} onHome={() => onView('home')} homeLabel="Início da Secretaria" navigationLabel="Secretaria EBD no tablet" onExit={onExit} exitLabel="Sair da Secretaria" /></div>
    <div className="ebd-navigation-content">{children}</div>
    <BottomNav desktopBreakpoint="700" mainItems={items.slice(0, admin ? 3 : 2)} moreItems={[...items.slice(admin ? 3 : 2), { key: 'exit', label: 'Sair da Secretaria', icon: LogOut, onClick: onExit }]} moreTitle="Secretaria EBD" />
  </div>;
}
