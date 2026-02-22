import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  CheckSquare,
  DollarSign,
  FolderOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ClipboardCheck,
  MessageSquare,
  Vote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import logoIpnc from '@/assets/logo-ipnc.png';

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Reuniões', path: '/reunioes' },
  { icon: CheckSquare, label: 'Tarefas', path: '/tarefas' },
  { icon: Calendar, label: 'Calendário', path: '/calendario' },
  { icon: DollarSign, label: 'Finanças', path: '/financas' },
  { icon: FolderOpen, label: 'Arquivos', path: '/arquivos' },
  { icon: ClipboardCheck, label: 'Plenárias', path: '/plenarias' },
  { icon: Vote, label: 'Eleições', path: '/eleicoes' },
];

const adminMenuItems = [
  { icon: UserCheck, label: 'Usuários', path: '/usuarios' },
  { icon: MessageSquare, label: 'Sugestões do Pastor', path: '/sugestoes' },
];

const bottomMenuItems = [
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const allMenuItems = [
    ...menuItems,
    ...(isAdmin ? adminMenuItems : []),
    ...bottomMenuItems,
  ];

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-lg p-1 flex items-center justify-center">
              <img src={logoIpnc} alt="Renovo IPNC" className="h-9 w-9 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm text-sidebar-primary">Renovo</span>
              <span className="text-xs text-sidebar-muted">IPNC</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-2">
          {allMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                      : 'text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', collapsed ? 'mx-auto' : 'mr-3')} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="mb-3 px-2">
            <p className="font-medium text-sm truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className={cn('h-5 w-5', collapsed ? '' : 'mr-3')} />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
