import { useNavigate, useLocation } from 'react-router-dom';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  MessageSquare,
  LogOut,
  Users,
  Heart,
  Globe,
  Vote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logoIpnc from '@/assets/logo-ipnc.png';
import { BuildStamp } from '@/components/BuildStamp';
import { useScrollIndicators } from '@/hooks/useScrollIndicators';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function PastorSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const [societies, setSocieties] = useState<Society[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const { canScrollUp, canScrollDown, scrollUp, scrollDown } = useScrollIndicators(navRef);

  const doSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  useEffect(() => {
    supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name')
      .then(({ data }) => { if (data) setSocieties(data); });
  }, []);

  const mainItems = [
    { path: '/pastor', label: 'Visão Geral', icon: LayoutDashboard },
    { path: '/pastor/calendario', label: 'Calendário', icon: Calendar },
    { path: '/pastor/comunicados', label: 'Comunicados', icon: Megaphone },
    { path: '/pastor/sugestoes', label: 'Sugestões', icon: MessageSquare },
    { path: '/eleicoes', label: 'Eleições', icon: Vote },
    { path: '/dizimos', label: 'Dízimos', icon: Heart },
    { path: '/visitantes', label: 'Visitantes', icon: Globe },
  ];

  const isActive = (path: string) => {
    if (path === '/pastor') return location.pathname === '/pastor';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-56 xl:w-60 sticky top-0 h-screen flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1 flex items-center justify-center">
            <img src={logoIpnc} alt="IPNC" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <h2 className="font-bold text-sm">Painel do Pastor</h2>
            <p className="text-xs text-sidebar-muted">{profile?.full_name || 'Pastor'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="relative flex-1 min-h-0">
      {canScrollUp && (
        <button onClick={scrollUp} aria-label="Ver itens acima" className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-sidebar-border bg-sidebar/95 p-1 text-sidebar-foreground shadow-md">
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      <nav ref={navRef} className="h-full p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {mainItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive(item.path)
                ? 'bg-sidebar-accent text-sidebar-primary-foreground font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </button>
        ))}

        {/* Societies */}
        <div className="pt-4">
          <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-muted font-semibold mb-2">
            Sociedades
          </p>
          {societies.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/pastor/sociedade/${s.slug}`)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                location.pathname === `/pastor/sociedade/${s.slug}`
                  ? 'bg-sidebar-accent text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
              )}
            >
              <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      </nav>
      {canScrollDown && (
        <button onClick={scrollDown} aria-label="Ver mais itens" className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-sidebar-border bg-sidebar/95 p-1 text-sidebar-foreground shadow-md">
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={requestExit}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
        <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={doSignOut} />
        <BuildStamp className="mt-3" />
      </div>
    </aside>
  );
}
