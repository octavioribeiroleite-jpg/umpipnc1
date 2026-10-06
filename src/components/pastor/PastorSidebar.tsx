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
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryErrorState } from '@/components/ui/query-error-state';
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
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const societiesRead = useQuery({
    queryKey: ['pastor-navigation-societies', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name');
      if (error) throw error;
      return (data ?? []) as Society[];
    },
  });
  const societies = societiesRead.data ?? [];
  const navRef = useRef<HTMLElement>(null);
  const { canScrollUp, canScrollDown, scrollUp, scrollDown } = useScrollIndicators(navRef);

  const doSignOut = async () => {
    await signOut();
    navigate('/auth');
  };


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
    <aside className="ipnc-pastor-sidebar sticky top-0 h-[var(--app-viewport-height)] pl-[var(--safe-left)] [--pastor-sidebar-width:76px] min-[1100px]:[--pastor-sidebar-width:224px] flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col" style={{ width: 'calc(var(--pastor-sidebar-width) + var(--safe-left))' }}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="safe-top">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1 shrink-0 flex items-center justify-center">
            <img src={logoIpnc} alt="Marca IPNC" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm">Painel do Pastor</h2>
            <p className="break-words text-xs text-sidebar-muted">{profile?.full_name || 'Pastor'}</p>
          </div>
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
            aria-label={item.label} title={item.label}
            aria-current={isActive(item.path) ? 'page' : undefined}
            className={cn(
              'w-full flex items-center gap-3 min-h-12 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive(item.path)
                ? 'bg-sidebar-accent text-sidebar-primary-foreground font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="pastor-nav-label">{item.label}</span>
          </button>
        ))}

        {/* Societies */}
        <div className="pt-4">
          <p className="px-3 text-xs uppercase tracking-wider text-sidebar-muted font-semibold mb-2">
            Sociedades
          </p>
          {societiesRead.isError && <>
            <div className="hidden min-[1100px]:block"><QueryErrorState message="Não foi possível consultar as sociedades." onRetry={() => void societiesRead.refetch()} retrying={societiesRead.isFetching} hasPreviousData={societiesRead.data !== undefined} /></div>
            <Button variant="ghost" size="icon" className="min-[1100px]:hidden" aria-label="Não foi possível consultar sociedades. Tentar novamente" title="Consultar sociedades novamente" onClick={() => void societiesRead.refetch()} disabled={societiesRead.isFetching}><Users className="h-5 w-5" /></Button>
          </>}
          {societiesRead.data === undefined && !societiesRead.isError && <p role="status" className="pastor-nav-label px-3 text-sm text-sidebar-muted">Consultando…</p>}
          {societies.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/pastor/sociedade/${s.slug}`)}
              aria-label={s.name} title={s.name}
              aria-current={location.pathname === `/pastor/sociedade/${s.slug}` ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 min-h-12 px-3 py-2.5 rounded-lg text-sm transition-colors',
                location.pathname === `/pastor/sociedade/${s.slug}`
                  ? 'bg-sidebar-accent text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
              )}
            >
              <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="pastor-nav-label">{s.name}</span>
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
        <div className="safe-bottom">
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
      </div>
    </aside>
  );
}
