import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileHeader } from './MobileHeader';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PullToRefresh } from './PullToRefresh';
import { BottomNav, type BottomNavItem } from './BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { silentUpdateCheck } from '@/lib/registerSW';
import {
  Home,
  Users,
  Calendar,
  CheckSquare,
  DollarSign,
  FolderOpen,
  Settings,
  UserCheck,
  ClipboardCheck,
  ClipboardList,
  MessageSquare,
  Vote,
  Heart,
  Globe,
  BookOpen,
  Cake,
  LogOut,
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void silentUpdateCheck();
  }, [location.pathname]);

  const go = (path: string) => navigate(path);
  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  const mainItems: BottomNavItem[] = [
    { key: 'home', icon: Home, label: 'Home', active: isActive('/'), onClick: () => go('/') },
    { key: 'reunioes', icon: Users, label: 'Reuniões', active: isActive('/reunioes'), onClick: () => go('/reunioes') },
    { key: 'calendario', icon: Calendar, label: 'Calendário', active: isActive('/calendario'), onClick: () => go('/calendario') },
    { key: 'tarefas', icon: CheckSquare, label: 'Tarefas', active: isActive('/tarefas'), onClick: () => go('/tarefas') },
  ];

  const moreItems: BottomNavItem[] = [
    { key: 'financas', icon: DollarSign, label: 'Finanças', active: isActive('/financas'), onClick: () => go('/financas') },
    { key: 'plenarias', icon: ClipboardCheck, label: 'Plenárias', active: isActive('/plenarias'), onClick: () => go('/plenarias') },
    { key: 'dizimos', icon: Heart, label: 'Dízimos', active: isActive('/dizimos'), onClick: () => go('/dizimos') },
    { key: 'comunicados', icon: MessageSquare, label: 'Comunicados', active: isActive('/comunicados'), onClick: () => go('/comunicados') },
    { key: 'estudos', icon: BookOpen, label: 'Estudos', active: isActive('/estudos'), onClick: () => go('/estudos') },
    { key: 'secretaria', icon: ClipboardList, label: 'Secretaria', active: isActive('/secretaria'), onClick: () => go('/secretaria') },
    { key: 'aniversariantes', icon: Cake, label: 'Aniversários', active: isActive('/aniversariantes'), onClick: () => go('/aniversariantes') },
    { key: 'arquivos', icon: FolderOpen, label: 'Arquivos', active: isActive('/arquivos'), onClick: () => go('/arquivos') },
    ...(isAdmin
      ? [
          { key: 'eleicoes', icon: Vote, label: 'Eleições', active: isActive('/eleicoes'), onClick: () => go('/eleicoes') },
          { key: 'visitantes', icon: Globe, label: 'Visitantes', active: isActive('/visitantes'), onClick: () => go('/visitantes') },
          { key: 'usuarios', icon: UserCheck, label: 'Usuários', active: isActive('/usuarios'), onClick: () => go('/usuarios') },
          { key: 'sugestoes', icon: MessageSquare, label: 'Sugestões', active: isActive('/sugestoes'), onClick: () => go('/sugestoes') },
        ]
      : []),
    { key: 'config', icon: Settings, label: 'Configurações', active: isActive('/configuracoes'), onClick: () => go('/configuracoes') },
    { key: 'sair', icon: LogOut, label: 'Sair', onClick: async () => { await signOut(); go('/auth'); } },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <OfflineBanner />
      {/* Desktop layout with sidebar (>= lg breakpoint to give tablets the mobile UX) */}
      <div className="hidden lg:flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden bg-transparent backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl py-4 md:py-6 px-4 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile + tablet layout with hamburger menu */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 overflow-x-hidden pt-14 px-3 sm:px-4 pb-24 bg-transparent">
          <PullToRefresh>
            <div className="mx-auto w-full max-w-3xl">
              {children}
            </div>
          </PullToRefresh>
        </main>
        <BottomNav mainItems={mainItems} moreItems={moreItems} />
      </div>
    </div>
  );
}
