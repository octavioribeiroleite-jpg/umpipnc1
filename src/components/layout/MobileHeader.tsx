import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import {
  Menu,
  LogOut,
  Home,
  Users,
  Calendar,
  Wallet,
  CheckSquare,
  FolderOpen,
  Settings,
  UserCheck,
  ClipboardCheck,
  MessageSquare,
  Vote,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/reunioes', icon: Users, label: 'Reuniões' },
  { to: '/calendario', icon: Calendar, label: 'Calendário' },
  { to: '/financas', icon: Wallet, label: 'Finanças' },
  { to: '/tarefas', icon: CheckSquare, label: 'Tarefas' },
  { to: '/plenarias', icon: ClipboardCheck, label: 'Plenárias' },
  { to: '/eleicoes', icon: Vote, label: 'Eleições' },
  { to: '/arquivos', icon: FolderOpen, label: 'Arquivos' },
];

const adminItems = [
  { to: '/usuarios', icon: UserCheck, label: 'Usuários' },
  { to: '/pastor-sugestoes', icon: MessageSquare, label: 'Sugestões do Pastor' },
];

export function MobileHeader() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    setSheetOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setSheetOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const allItems = [...navItems, ...(isAdmin ? adminItems : []), { to: '/configuracoes', icon: Settings, label: 'Configurações' }];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 pb-2">
                <div className="flex items-center gap-3">
                  <img src={logoIpnc} alt="IPNC" className="h-10 w-10 object-contain" />
                  <SheetTitle className="text-lg">IPNC</SheetTitle>
                </div>
              </SheetHeader>
              <Separator />
              <nav className="flex-1 overflow-y-auto py-2 px-2">
                {allItems.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => handleNavigate(item.to)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.to)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
              <Separator />
              {user && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <img src={logoIpnc} alt="Renovo IPNC" className="h-10 w-10 object-contain" />
          <span className="font-semibold text-foreground text-lg">IPNC</span>
        </div>
      </div>
    </header>
  );
}
