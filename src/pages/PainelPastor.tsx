import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, Users, ListTodo, Calendar, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { AlertsSection } from '@/components/pastor/AlertsSection';
import { SocietyOverviewCard } from '@/components/pastor/SocietyOverviewCard';
import { AISummaryDrawer } from '@/components/pastor/AISummaryDrawer';
import logoIpnc from '@/assets/logo-ipnc.png';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietyStats {
  membersActive: number;
  tasksDone: number;
  tasksPending: number;
  saldo: number;
  totalEntradas: number;
  totalSaidas: number;
  totalMensalidades: number;
  lastMeetingDate?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  status: string;
  location?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function PainelPastor() {
  const { user, isPastor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState<Society[]>([]);
  const [societyStats, setSocietyStats] = useState<Record<string, SocietyStats>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [societiesRes, membersRes, tasksRes, transRes, paymentsRes, eventsRes, meetingsRes] = await Promise.all([
        supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
        supabase.from('members').select('id, active, society_id'),
        supabase.from('tasks').select('id, status, society_id'),
        supabase.from('transactions').select('amount, type, society_id'),
        supabase.from('membership_payments').select('amount, status, member_id'),
        supabase.from('events').select('id, title, start_date, status, location').gte('start_date', new Date().toISOString()).order('start_date', { ascending: true }).limit(5),
        supabase.from('meetings').select('id, date, society_id').order('date', { ascending: false }),
      ]);

      const socs = societiesRes.data || [];
      setSocieties(socs);
      setUpcomingEvents(eventsRes.data || []);

      const members = membersRes.data || [];
      const tasks = tasksRes.data || [];
      const transactions = transRes.data || [];
      const payments = paymentsRes.data || [];
      const meetings = meetingsRes.data || [];

      const stats: Record<string, SocietyStats> = {};
      for (const soc of socs) {
        const socMembers = members.filter(m => m.society_id === soc.id);
        const socMemberIds = new Set(socMembers.map(m => m.id));
        const socTasks = tasks.filter(t => t.society_id === soc.id);
        const socTrans = transactions.filter(t => t.society_id === soc.id);
        const socPayments = payments.filter(p => p.status === 'pago' && socMemberIds.has(p.member_id));

        const totalEntradas = socTrans.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
        const totalSaidas = socTrans.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);
        const totalMensalidades = socPayments.reduce((s, p) => s + Number(p.amount), 0);
        const lastMeeting = meetings.find(m => m.society_id === soc.id);

        stats[soc.id] = {
          membersActive: socMembers.filter(m => m.active).length,
          tasksDone: socTasks.filter(t => t.status === 'done').length,
          tasksPending: socTasks.filter(t => t.status !== 'done').length,
          saldo: totalMensalidades + totalEntradas - totalSaidas,
          totalEntradas,
          totalSaidas,
          totalMensalidades,
          lastMeetingDate: lastMeeting?.date,
        };
      }
      setSocietyStats(stats);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || (!isPastor && !isAdmin)) return;
    fetchDirectStats();
  }, [user, isPastor, isAdmin, fetchDirectStats]);

  // Global stats
  const totalMembers = Object.values(societyStats).reduce((s, v) => s + v.membersActive, 0);
  const totalSaldo = Object.values(societyStats).reduce((s, v) => s + v.saldo, 0);
  const totalPending = Object.values(societyStats).reduce((s, v) => s + v.tasksPending, 0);

  return (
    <PastorLayout>
      {statsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <img src={logoIpnc} alt="Renovo IPNC" className="h-20 w-20 animate-logo-pulse" />
          <p className="text-sm text-muted-foreground animate-fade-up">Carregando dados...</p>
          <Progress value={undefined} className="w-48 h-1" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchDirectStats()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 1. Greeting + AI button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{getGreeting()}, Pastor!</h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <AISummaryDrawer />
          </div>

          {/* 2. Quick Metrics Grid 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Membros</span>
              </div>
              <p className="text-xl font-bold mt-1">{totalMembers}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Saldo</span>
              </div>
              <p className={`text-xl font-bold mt-1 ${totalSaldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
                R$ {totalSaldo.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-xl font-bold mt-1">{totalPending}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Eventos</span>
              </div>
              <p className="text-xl font-bold mt-1">{upcomingEvents.length}</p>
            </Card>
          </div>

          {/* 3. Alerts (only real pendencies) */}
          <AlertsSection />

          {/* 4. Societies compact grid */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Sociedades
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {societies.map(s => (
                <SocietyOverviewCard key={s.id} society={s} stats={societyStats[s.id]} />
              ))}
            </div>
          </div>

          {/* 5. Upcoming Events (max 3) */}
          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Próximos Eventos
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/pastor/calendario')}>
                    Ver todos <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-1">
                {upcomingEvents.slice(0, 3).map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate">{e.title}</p>
                      {e.location && <p className="text-[10px] text-muted-foreground truncate">{e.location}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(e.start_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PastorLayout>
  );
}
