import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Globe, Heart, LayoutDashboard, LogOut, Megaphone, MessageSquare, Users, Vote } from 'lucide-react';
import { BottomNav, type BottomNavItem } from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function PastorMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
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

  const isActive = (path: string) => (path === '/pastor' ? location.pathname === '/pastor' : location.pathname.startsWith(path));
  const go = (path: string) => navigate(path);

  const mainItems: BottomNavItem[] = [
    { key: 'geral', path: '/pastor', icon: LayoutDashboard, label: 'Geral', active: isActive('/pastor'), onClick: () => go('/pastor') } as BottomNavItem,
    { key: 'calendario', icon: Calendar, label: 'Calendário', active: isActive('/pastor/calendario'), onClick: () => go('/pastor/calendario') },
    { key: 'comunicados', icon: Megaphone, label: 'Comunicados', active: isActive('/pastor/comunicados'), onClick: () => go('/pastor/comunicados') },
    { key: 'sociedades', icon: Users, label: 'Sociedades', active: location.pathname.startsWith('/pastor/sociedade'), onClick: () => go(societies[0] ? `/pastor/sociedade/${societies[0].slug}` : '/pastor') },
  ];

  const moreItems: BottomNavItem[] = [
    ...(societiesRead.isError ? [{ key: 'retry-societies', icon: Users, label: 'Sociedades indisponíveis · tentar novamente', onClick: () => { void societiesRead.refetch(); } }] : []),
    ...societies.map((s) => ({
      key: `society-${s.id}`,
      icon: Users,
      label: s.name,
      markerColor: s.color,
      active: location.pathname === `/pastor/sociedade/${s.slug}`,
      onClick: () => go(`/pastor/sociedade/${s.slug}`),
    })),
    { key: 'sugestoes', icon: MessageSquare, label: 'Sugestões', active: isActive('/pastor/sugestoes'), onClick: () => go('/pastor/sugestoes') },
    { key: 'eleicoes', icon: Vote, label: 'Eleições', active: isActive('/eleicoes'), onClick: () => go('/eleicoes') },
    { key: 'dizimos', icon: Heart, label: 'Dízimos', active: isActive('/dizimos'), onClick: () => go('/dizimos') },
    { key: 'visitantes', icon: Globe, label: 'Visitantes', active: isActive('/visitantes'), onClick: () => go('/visitantes') },
    { key: 'sair', icon: LogOut, label: 'Sair', onClick: async () => { await signOut(); go('/auth'); } },
  ];

  return <BottomNav mainItems={mainItems} moreItems={moreItems} moreTitle="Painel do Pastor" desktopBreakpoint="lg" />;
}
