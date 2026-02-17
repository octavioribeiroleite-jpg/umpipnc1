import { useState } from 'react';
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
  Menu,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import logoIpnc from '@/assets/logo-ipnc.png';

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Reuniões', path: '/reunioes' },
  { icon: CheckSquare, label: 'Tarefas', path: '/tarefas' },
  { icon: Calendar, label: 'Calendário', path: '/calendario' },
  { icon: DollarSign, label: 'Finanças', path: '/financas' },
  { icon: FolderOpen, label: 'Arquivos', path: '/arquivos' },
  { icon: ClipboardCheck, label: 'Plenárias', path: '/plenarias' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    setOpen(false);
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src={logoIpnc} alt="Renovo IPNC" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm text-sidebar-primary">Renovo</span>
            <span className="text-xs text-sidebar-muted">IPNC</span>
          </div>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-sidebar text-sidebar-foreground p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <img src={logoIpnc} alt="Renovo IPNC" className="h-8 w-8 object-contain" />
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-sm text-sidebar-primary">Renovo</span>
                    <span className="text-xs text-sidebar-muted">IPNC</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-2">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <button
                          onClick={() => handleNavigate(item.path)}
                          className={cn(
                            'flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200',
                            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                              : 'text-sidebar-foreground'
                          )}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* User section */}
              <div className="p-4 border-t border-sidebar-border">
                {profile && (
                  <div className="mb-3 px-2">
                    <p className="font-medium text-sm truncate">{profile.full_name}</p>
                    <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
                  </div>
                )}
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>Sair</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
