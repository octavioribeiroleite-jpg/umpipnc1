import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIpnc from '@/assets/logo-ipnc.png';
import {
  Menu,
  LogOut,
  LayoutDashboard,
  Calendar,
  Megaphone,
  MessageSquare,
  Users,
  Heart,
  Globe,
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
import { ShareAppDialog } from '@/components/layout/ShareAppDialog';
import { supabase } from '@/integrations/supabase/client';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const navItems = [
  { to: '/pastor', icon: LayoutDashboard, label: 'Visão Geral' },
  { to: '/pastor/calendario', icon: Calendar, label: 'Calendário' },
  { to: '/pastor/comunicados', icon: Megaphone, label: 'Comunicados' },
  { to: '/pastor/sugestoes', icon: MessageSquare, label: 'Sugestões' },
  { to: '/dizimos', icon: Heart, label: 'Dízimos' },
  { to: '/visitantes', icon: Globe, label: 'Visitantes' },
];

export function PastorMobileHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [societies, setSocieties] = useState<Society[]>([]);

  useEffect(() => {
    supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name')
      .then(({ data }) => { if (data) setSocieties(data); });
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
    if (path === '/pastor') return location.pathname === '/pastor';
    return location.pathname.startsWith(path);
  };

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
                  <SheetTitle className="text-lg">Painel do Pastor</SheetTitle>
                </div>
              </SheetHeader>
              <Separator />
              <nav className="flex-1 overflow-y-auto py-2 px-2">
                {navItems.map((item) => (
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

                {societies.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Sociedades
                    </p>
                    {societies.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleNavigate(`/pastor/sociedade/${s.slug}`)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          location.pathname === `/pastor/sociedade/${s.slug}`
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </>
                )}
                <Separator className="my-2" />
                <ShareAppDialog />
              </nav>
              <Separator />
              {user && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {profile?.full_name ? getInitials(profile.full_name) : 'P'}
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

          <img src={logoIpnc} alt="IPNC" className="h-10 w-10 object-contain" />
          <span className="font-semibold text-foreground text-lg">Painel do Pastor</span>
        </div>
      </div>
    </header>
  );
}
