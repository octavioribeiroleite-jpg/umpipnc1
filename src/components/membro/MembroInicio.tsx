import { useState, useEffect } from 'react';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, ChevronRight, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MembroInicioProps {
  onTabChange: (tab: 'inicio' | 'eventos' | 'pagamentos' | 'comunicados' | 'dizimos') => void;
}

export function MembroInicio({ onTabChange }: MembroInicioProps) {
  const { session } = useMembroSession();
  const [pendingCharges, setPendingCharges] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [nextEvent, setNextEvent] = useState<{ title: string; date: string } | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      setLoading(true);

      const [eventsRes, announcementsRes, chargesRes] = await Promise.all([
        supabase
          .from('events')
          .select('title, start_date')
          .gte('start_date', new Date().toISOString())
          .neq('status', 'cancelado')
          .order('start_date', { ascending: true })
          .limit(1),
        supabase
          .from('pastor_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.functions.invoke('member-get-charges'),
      ]);

      const memberCharges = (chargesRes.data?.charges || []).filter((charge: any) =>
        charge.status === 'pendente' || charge.status === 'parcial'
      );
      if (memberCharges) {
        setPendingCharges({
          count: memberCharges.length,
          total: memberCharges.reduce((sum: number, c: any) => {
            const paid = Number(c.paid_amount || 0);
            return sum + Math.max(Number(c.amount || 0) - paid, 0);
          }, 0),
        });
      }

      if (eventsRes.data?.[0]) {
        setNextEvent({
          title: eventsRes.data[0].title,
          date: eventsRes.data[0].start_date,
        });
      }

      if (announcementsRes.data) {
        const filtered = announcementsRes.data.filter((a: any) => {
          if (a.scope === 'church') return true;
          if (a.target_societies && Array.isArray(a.target_societies) && session.societyId) {
            return a.target_societies.includes(session.societyId);
          }
          return false;
        });
        setRecentAnnouncements(filtered.slice(0, 3));
      }

      setLoading(false);
    };

    fetchData();
  }, [session]);

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
      {/* Compact Welcome */}
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold">
          Olá, {session?.memberName?.split(' ')[0] || 'Membro'}! 👋
        </span>
        {session && (
          <span className="text-xs text-muted-foreground">• {session.societyName}</span>
        )}
      </div>

      {/* Dízimos quick access */}
      <button onClick={() => onTabChange('dizimos')} className="w-full text-left">
        <Card className="border-primary/30 bg-primary/5 hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary">Dízimos e Ofertas</p>
                <p className="text-xs text-muted-foreground">Copiar chave PIX</p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-primary" />
            </div>
          </CardContent>
        </Card>
      </button>

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
                  ? `R$ ${pendingCharges.total.toFixed(2).replace('.', ',')} pendente`
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
