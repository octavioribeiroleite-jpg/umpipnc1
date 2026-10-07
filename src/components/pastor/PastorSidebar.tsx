import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Circle, Globe, Heart, LayoutDashboard, LoaderCircle, Megaphone, MessageSquare, Users, Vote } from 'lucide-react';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { NavigationRail, NavigationSidebar, type WorkspaceNavigationGroup } from '@/components/layout/WorkspaceNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { supabase } from '@/integrations/supabase/client';

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
  const isActive = (path: string) => path === '/pastor' ? location.pathname === '/pastor' : location.pathname.startsWith(path);
  const items = [
    { path: '/pastor', label: 'Visão Geral', icon: LayoutDashboard },
    { path: '/pastor/calendario', label: 'Calendário', icon: Calendar },
    { path: '/pastor/comunicados', label: 'Comunicados', icon: Megaphone },
    { path: '/pastor/sugestoes', label: 'Sugestões', icon: MessageSquare },
    { path: '/eleicoes', label: 'Eleições', icon: Vote },
    { path: '/dizimos', label: 'Dízimos', icon: Heart },
    { path: '/visitantes', label: 'Visitantes', icon: Globe },
  ].map(item => ({ ...item, key: item.path, active: isActive(item.path), onClick: () => navigate(item.path) }));
  const groups: WorkspaceNavigationGroup[] = [{
    key: 'societies',
    label: 'Sociedades',
    items: societies.map(society => ({
      key: society.id,
      label: society.name,
      icon: Circle,
      iconStyle: { color: society.color, fill: society.color, padding: '5px' },
      active: location.pathname === `/pastor/sociedade/${society.slug}`,
      onClick: () => navigate(`/pastor/sociedade/${society.slug}`),
    })),
    status: compact => societiesRead.isError ? (
      compact ? <Button type="button" variant="ghost" size="icon" className="diretoria-nav-group__retry" aria-label="Não foi possível consultar sociedades. Tentar novamente" title="Consultar sociedades novamente" onClick={() => void societiesRead.refetch()} disabled={societiesRead.isFetching}><Users className="h-5 w-5" /></Button>
        : <div className="diretoria-nav-group__error"><QueryErrorState message="Não foi possível consultar as sociedades." onRetry={() => void societiesRead.refetch()} retrying={societiesRead.isFetching} hasPreviousData={societiesRead.data !== undefined} /></div>
    ) : societiesRead.data === undefined ? (
      <div role="status" aria-label="Consultando sociedades" className="diretoria-nav-group__loading">{compact ? <LoaderCircle aria-hidden="true" className="mx-auto h-5 w-5 animate-spin" /> : 'Consultando…'}</div>
    ) : null,
  }];
  const doSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const navigationProps = {
    items,
    groups,
    onHome: () => navigate('/pastor'),
    homeLabel: 'Início do painel pastoral',
    navigationLabel: 'Navegação pastoral',
    onExit: requestExit,
  };

  return <>
    <div className="hidden min-[1100px]:flex"><NavigationSidebar {...navigationProps} profile={{ name: profile?.full_name || 'Pastor', description: 'Área pastoral' }} /></div>
    <div className="hidden min-[700px]:flex min-[1100px]:hidden"><NavigationRail {...navigationProps} /></div>
    <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={doSignOut} />
  </>;
}
