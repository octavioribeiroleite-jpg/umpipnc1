import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Bell, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MembroInicioProps {
  onTabChange: (tab: 'inicio' | 'eventos' | 'pagamentos' | 'comunicados') => void;
}

export function MembroInicio({ onTabChange }: MembroInicioProps) {
  const { profile, society } = useAuth();
  const [pendingCharges, setPendingCharges] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [nextEvent, setNextEvent] = useState<{ title: string; date: string } | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      setLoading(true);

      const membersQuery = supabase
        .from('members')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      const eventsQuery = supabase
        .from('events')
        .select('title, start_date')
        .gte('start_date', new Date().toISOString())
        .neq('status', 'cancelado')
        .order('start_date', { ascending: true })
        .limit(1);

      const announcementsQuery = supabase
        .from('pastor_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const [memberRes, eventsRes, announcementsRes] = await Promise.all([
        membersQuery,
        eventsQuery,
        announcementsQuery,
      ]);

      if (memberRes.data?.id) {
        const { data: charges } = await supabase
          .from('charges')
          .select('amount')
          .eq('member_id', memberRes.data.id)
          .eq('status', 'pendente');

        if (charges) {
          setPendingCharges({
            count: charges.length,
            total: charges.reduce((sum, c) => sum + Number(c.amount), 0),
          });
        }
      }

      if (eventsRes.data?.[0]) {
        setNextEvent({
          title: eventsRes.data[0].title,
          date: eventsRes.data[0].start_date,
        });
      }

      if (announcementsRes.data) {
        setRecentAnnouncements(announcementsRes.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">
            Olá, {profile?.full_name?.split(' ')[0] || 'Membro'}! 👋
          </h2>
          {society && (
            <p className="text-sm text-muted-foreground mt-1">{society.name}</p>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onTabChange('pagamentos')} className="text-left">
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cobranças</span>
              </div>
              <p className="text-2xl font-bold">{pendingCharges.count}</p>
              <p className="text-xs text-muted-foreground">
                {pendingCharges.total > 0
                  ? `R$ ${pendingCharges.total.toFixed(2)} pendente`
                  : 'Nenhuma pendência'}
              </p>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onTabChange('eventos')} className="text-left">
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Próximo evento</span>
              </div>
              {nextEvent ? (
                <>
                  <p className="text-sm font-medium line-clamp-1">{nextEvent.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(nextEvent.date), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento</p>
              )}
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Recent announcements */}
      {recentAnnouncements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Comunicados recentes</CardTitle>
              <button
                onClick={() => onTabChange('comunicados')}
                className="text-xs text-primary flex items-center gap-1"
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAnnouncements.map((a) => (
              <div
                key={a.id}
                className={`p-3 rounded-lg border ${
                  a.priority === 'urgente' ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.priority === 'urgente' && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">Urgente</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
