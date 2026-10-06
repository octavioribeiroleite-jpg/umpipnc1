import type { ReactNode } from 'react';
import { BarChart3, Cake, ClipboardList, Home, Lock, LogOut, ShieldCheck, Users, FileSpreadsheet } from 'lucide-react';
import type { EbdView } from '@/lib/ebd-navigation';
import logoIpnc from '@/assets/logo-ipnc.png';
import { BottomNav } from '@/components/layout/BottomNav';
import './secretaria-navigation.css';

interface Props { admin: boolean; currentView: EbdView; onView: (view: EbdView) => void; onExit: () => void; children: ReactNode }
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
export function SecretariaNavigation({ admin, currentView, onView, onExit, children }: Props) {
  const items = destinations.filter(item => admin || !item.admin).map(item => ({ ...item, active: currentView === item.key, onClick: () => onView(item.key) }));
  return <div className="ebd-navigation-shell ipnc-navigation-layout ipnc-safe-managed">
    <a href="#ebd-main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-card focus:p-3">Ir para o conteúdo</a>
    <aside className="ebd-sidebar">
      <button type="button" className="ebd-sidebar-brand" onClick={() => onView('home')} aria-label="Início da Secretaria"><img src={logoIpnc} alt="Marca IPNC" /><span>IPNC<small>Secretaria EBD</small></span></button>
      <nav aria-label="Secretaria EBD"><ul>{items.map(item => <li key={item.key}><button type="button" onClick={item.onClick} title={item.label} aria-label={item.label} aria-current={item.active ? 'page' : undefined}><item.icon aria-hidden="true" /><span>{item.label}</span></button></li>)}</ul></nav>
      <button type="button" className="ebd-sidebar-exit" onClick={onExit} title="Sair da Secretaria" aria-label="Sair da Secretaria"><LogOut aria-hidden="true" /><span>Sair da Secretaria</span></button>
    </aside>
    <div className="ebd-navigation-content">{children}</div>
    <BottomNav desktopBreakpoint="700" mainItems={items.slice(0, admin ? 3 : 2)} moreItems={[...items.slice(admin ? 3 : 2), { key: 'exit', label: 'Sair da Secretaria', icon: LogOut, onClick: onExit }]} moreTitle="Secretaria EBD" />
  </div>;
}
