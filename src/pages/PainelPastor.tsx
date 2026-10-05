import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppCard } from '@/components/ui/app-card';
import { SectionTitle } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import {
  Calendar, Megaphone, Heart, Vote,
  CalendarDays, CalendarClock, AlertCircle,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { AlertsSection } from '@/components/pastor/AlertsSection';
import { SocietyOverviewCard } from '@/components/pastor/SocietyOverviewCard';
import { AISummaryDrawer } from '@/components/pastor/AISummaryDrawer';
import { PastorCalendarWidget } from '@/components/pastor/PastorCalendarWidget';
import { PastorDayEventList } from '@/components/pastor/PastorDayEventList';
import { useEvents, type EventStatus } from '@/hooks/useEvents';

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

function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const quickActions = [
  { icon: Calendar, label: 'Calendário', path: '/pastor/calendario' },
  { icon: Megaphone, label: 'Comunicados', path: '/pastor/comunicados' },
  { icon: Heart, label: 'Dízimos', path: '/dizimos' },
  { icon: Vote, label: 'Eleições', path: '/eleicoes' },
];

export default function PainelPastor() {
  const { user, profile, isPastor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState<Society[]>([]);
  const [societyStats, setSocietyStats] = useState<Record<string, SocietyStats>>({});
  const statsRead = useSnapshotRead(`pastor-dashboard:${user?.id ?? ''}:${isPastor}:${isAdmin}`);
  const { run: runStats } = statsRead;

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(now);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const { events: allEvents, updateEvent, hasEventsSnapshot, isError: eventsError, isFetching: eventsFetching, refetch: refetchEvents } = useEvents();

  const summaryChips = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { locale: ptBR });
    const weekEnd = endOfWeek(today, { locale: ptBR });

    let todayCount = 0;
    let weekCount = 0;
    let awaitingCount = 0;

    for (const ev of allEvents) {
      const d = new Date(ev.start_date);
      if (isSameLocalDay(d, today)) todayCount++;
      if (d >= weekStart && d <= weekEnd) weekCount++;
      if ((ev.status === 'confirmado' || ev.status === 'pendente') && d < today && !isSameLocalDay(d, today)) {
        awaitingCount++;
      }
    }
    return { todayCount, weekCount, awaitingCount };
  }, [allEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const handleToday = () => {
    const t = new Date();
    setSelectedDate(t);
    setCurrentMonth(t.getMonth());
    setCurrentYear(t.getFullYear());
  };

  const handleUpdateStatus = (id: string, status: EventStatus) => {
    updateEvent.mutate({ id, status });
  };

  // Fetch society stats (same logic as before)
  const fetchDirectStats = useCallback(async () => {
    await runStats(async () => {
      const [societiesRes, membersRes, tasksRes, transRes, paymentsRes, meetingsRes] = await Promise.all([
        supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
        supabase.from('members').select('id, active, society_id'),
        supabase.from('tasks').select('id, status, society_id'),
        supabase.from('transactions').select('amount, type, society_id'),
        supabase.from('membership_payments').select('amount, status, member_id'),
        supabase.from('meetings').select('id, date, society_id').order('date', { ascending: false }),
      ]);

      const failed = [societiesRes, membersRes, tasksRes, transRes, paymentsRes, meetingsRes].find(result => result.error);
      if (failed?.error) throw failed.error;
      const socs = societiesRes.data || [];

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
          totalEntradas, totalSaidas, totalMensalidades,
          lastMeetingDate: lastMeeting?.date,
        };
      }
      return () => { setSocieties(socs); setSocietyStats(stats); };
    });
  }, [runStats]);

  useEffect(() => {
    if (!user || (!isPastor && !isAdmin)) return;
    fetchDirectStats();
  }, [user, isPastor, isAdmin, fetchDirectStats]);

  const pastorName = profile?.full_name?.split(' ')[0] || 'Pastor';

  return (
    <PastorLayout>
      <div className="space-y-6">
          {/* 1. Greeting + AI */}
          <PageHeader
            title={`${getGreeting()}, ${pastorName}`}
            eyebrow="Painel pastoral"
            description={format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            action={<AISummaryDrawer />}
          />

          {eventsError && <QueryErrorState message="Não foi possível consultar a agenda." onRetry={() => void refetchEvents()} retrying={eventsFetching} hasPreviousData={hasEventsSnapshot} />}

          {/* 2. Summary chips */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AppCard variant="stat">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-2xl font-bold leading-none">{hasEventsSnapshot ? summaryChips.todayCount : '—'}</p>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                </div>
              </div>
            </AppCard>
            <AppCard variant="stat">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-2xl font-bold leading-none">{hasEventsSnapshot ? summaryChips.weekCount : '—'}</p>
                  <p className="text-sm text-muted-foreground">Semana</p>
                </div>
              </div>
            </AppCard>
            <AppCard variant="stat">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold leading-none">{hasEventsSnapshot ? summaryChips.awaitingCount : '—'}</p>
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                </div>
              </div>
            </AppCard>
          </div>

          {/* 3. Calendar */}
          <PastorCalendarWidget
            events={allEvents}
            selectedDate={selectedDate}
            onDaySelect={setSelectedDate}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            hasSnapshot={hasEventsSnapshot}
            readError={eventsError}
          />

          {/* 4. Day event list */}
          {hasEventsSnapshot && <PastorDayEventList
            selectedDate={selectedDate}
            events={allEvents}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={updateEvent.isPending}
          />}

          <AlertsSection />

          {/* 5. Society Cards */}
          {statsRead.error && <QueryErrorState message="Não foi possível consultar os indicadores das sociedades." onRetry={() => void fetchDirectStats()} retrying={statsRead.loading} hasPreviousData={statsRead.hasSnapshot} />}
          {!statsRead.hasSnapshot && !statsRead.error && <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-40 rounded-card" /><Skeleton className="h-40 rounded-card" /></div>}
          <div className="grid gap-4 xl:grid-cols-2">
            {statsRead.hasSnapshot && societies.map(s => (
              <SocietyOverviewCard key={s.id} society={s} stats={societyStats[s.id]} />
            ))}
          </div>

          {/* 6. Quick Access — 4 cols */}
          <div>
            <SectionTitle>Acesso Rápido</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map(action => (
                <AppCard
                  key={action.path}
                  variant="interactive"
                  className="flex flex-col items-center gap-1.5"
                  role="link"
                  tabIndex={0}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(action.path); } }}
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="w-full text-center text-sm font-medium [overflow-wrap:anywhere] text-muted-foreground">{action.label}</span>
                </AppCard>
              ))}
            </div>
          </div>

      </div>
    </PastorLayout>
  );
}
