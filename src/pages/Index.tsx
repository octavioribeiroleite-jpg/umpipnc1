import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Calendar,
  CheckSquare,
  Coins,
  ChevronRight,
  Megaphone,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, type EventStatus } from '@/hooks/useEvents';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { MetricGrid } from '@/components/layout/ResponsivePrimitives';
import { AppCard } from '@/components/ui/app-card';
import { MetricCard } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { HomeBirthdayCard } from '@/components/aniversariantes/HomeBirthdayCard';
import { PastorNotificationBanner } from '@/components/pastor/PastorNotificationBanner';
import { PastorLoginNotification } from '@/components/pastor/PastorLoginNotification';
import { PastorCalendarWidget } from '@/components/pastor/PastorCalendarWidget';
import { PastorDayEventList } from '@/components/pastor/PastorDayEventList';
import dashboardChurch from '@/assets/dashboard-church-v1.webp';
import './dashboard.css';

type DashboardStats = {
  activeMembers: number;
  openTasks: number;
  overdueTasks: number;
  monthlyRevenue: number;
  pendingCharges: number;
  announcements: number;
};

const currency = (value: number) =>
  `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function QuickAction({
  label,
  icon: Icon,
  onClick,
  tone = 'green',
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'green' | 'gold';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`dashboard-quick-action dashboard-quick-action--${tone}`}
    >
      <div className="dashboard-quick-icon">
        <Icon className="h-4 w-4" />
      </div>
      <span className="w-full min-w-0 whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">
        {label}
      </span>
    </button>
  );
}

export default function Index() {
  const {
    user,
    loading,
    rolesLoaded,
    isPastor,
    profile,
    isAdmin,
    isManagement,
    roles,
    society,
    effectiveSocietyId: societyId,
  } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const summaryEventsRead = useEvents(undefined, undefined, societyId || undefined);
  const { events, hasEventsSnapshot, isError: eventsError, isFetching: eventsFetching, refetch: refetchEvents, updateEvent } = summaryEventsRead;
  const summaryEvents = summaryEventsRead.events;
  const dashboardRead = useSnapshotRead(`home:${user?.id ?? ''}:${societyId ?? 'all'}:${roles.join(',')}`);
  const { run: runDashboard } = dashboardRead;

  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeMembers: 0,
    openTasks: 0,
    overdueTasks: 0,
    monthlyRevenue: 0,
    pendingCharges: 0,
    announcements: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && rolesLoaded) {
      if (isPastor && !isAdmin) {
        navigate('/pastor');
      } else if (
        roles.includes('visualizador') &&
        !isAdmin &&
        !isManagement &&
        !isPastor
      ) {
        navigate('/membro');
      }
    }
  }, [user, loading, rolesLoaded, navigate, isPastor, isAdmin, isManagement, roles]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    await runDashboard(async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const todayIso = now.toISOString().split('T')[0];
      const currentYearText = String(now.getFullYear());

        let submissionsQuery = supabase
          .from('member_payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente');

        let membersQuery = supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('active', true);

        let openTasksQuery = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'done');

        let overdueTasksQuery = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'done')
          .lt('due_date', todayIso);

        let transactionsQuery = supabase
          .from('transactions')
          .select('amount, type')
          .eq('type', 'entrada')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        let pendingChargesQuery = supabase
          .from('charges')
          .select('id', { count: 'exact', head: true })
          .eq('competence', currentYearText)
          .in('status', ['pendente', 'parcial']);

        let announcementsQuery = supabase
          .from('pastor_announcements')
          .select('id', { count: 'exact', head: true });

        if (societyId) {
          submissionsQuery = submissionsQuery.eq('society_id', societyId);
          membersQuery = membersQuery.eq('society_id', societyId);
          openTasksQuery = openTasksQuery.eq('society_id', societyId);
          overdueTasksQuery = overdueTasksQuery.eq('society_id', societyId);
          transactionsQuery = transactionsQuery.eq('society_id', societyId);
          pendingChargesQuery = pendingChargesQuery.eq('society_id', societyId);
          announcementsQuery = announcementsQuery.contains('target_societies', [societyId]);
        }

        const [
          submissionsRes,
          membersRes,
          openTasksRes,
          overdueTasksRes,
          transactionsRes,
          pendingChargesRes,
          announcementsRes,
        ] = await Promise.all([
          submissionsQuery,
          membersQuery,
          openTasksQuery,
          overdueTasksQuery,
          transactionsQuery,
          pendingChargesQuery,
          announcementsQuery,
        ]);

        const failed = [submissionsRes, membersRes, openTasksRes, overdueTasksRes, transactionsRes, pendingChargesRes, announcementsRes].find(result => result.error);
        if (failed?.error) throw failed.error;
        const monthlyRevenue = (transactionsRes.data || [])
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        return () => {
        setPendingSubmissions(submissionsRes.count || 0);
        setDashboardStats({
          activeMembers: membersRes.count || 0,
          openTasks: openTasksRes.count || 0,
          overdueTasks: overdueTasksRes.count || 0,
          monthlyRevenue,
          pendingCharges: pendingChargesRes.count || 0,
          announcements: announcementsRes.count || 0,
        });
        };
    });
  }, [user, societyId, runDashboard]);

  useEffect(() => {
    if (!user) return;
    void fetchDashboardData();

    const channel = supabase
      .channel('home-dashboard-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_payment_submissions' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pastor_announcements' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDashboardData]);

  const todayCount = useMemo(() => {
    const currentDate = new Date();
    return summaryEvents.filter((event) => {
      const startDate = new Date(event.start_date);
      return startDate.getFullYear() === currentDate.getFullYear()
        && startDate.getMonth() === currentDate.getMonth()
        && startDate.getDate() === currentDate.getDate();
    }).length;
  }, [summaryEvents]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startToday);
    endOfWeek.setDate(startToday.getDate() + 7);
    return summaryEvents.filter((event) => {
      const startDate = new Date(event.start_date);
      return startDate >= startToday && startDate <= endOfWeek;
    }).length;
  }, [summaryEvents]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [...summaryEvents]
      .filter((event) => new Date(event.start_date) >= startToday)
      .sort((first, second) => new Date(first.start_date).getTime() - new Date(second.start_date).getTime())
      .slice(0, 3);
  }, [summaryEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }
  };

  const handleToday = () => {
    const currentDate = new Date();
    setSelectedDate(currentDate);
    setCurrentMonth(currentDate.getMonth());
    setCurrentYear(currentDate.getFullYear());
  };

  const handleUpdateStatus = (id: string, status: EventStatus) => {
    updateEvent.mutate({ id, status });
  };

  if (loading || !rolesLoaded) {
    return (
      <AppLayout width="wide" variant="dashboard">
        <div className="app-stack py-2">
          <Skeleton className="h-32 w-full rounded-hero md:h-40" />
          <Skeleton className="h-20 w-full rounded-card" />
          <div className="metric-grid">
            <Skeleton className="h-20 rounded-card md:h-28" />
            <Skeleton className="h-20 rounded-card md:h-28" />
            <Skeleton className="h-20 rounded-card md:h-28" />
            <Skeleton className="h-20 rounded-card md:h-28" />
          </div>
          <Skeleton className="h-56 w-full rounded-panel" />
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);
  const societyLabel = society?.slug?.toUpperCase() || 'IPNC';

  return (
    <AppLayout width="wide" variant="dashboard">
      <div className="diretoria-dashboard">
      <PastorLoginNotification />
      <DashboardHeader hasNotifications={dashboardRead.hasSnapshot && (pendingSubmissions > 0 || dashboardStats.announcements > 0)} />
      <section className="dashboard-welcome" aria-labelledby="dashboard-greeting">
        <img className="dashboard-welcome-image" src={dashboardChurch} alt="" aria-hidden="true" />
        <div className="dashboard-welcome-copy">
          <p className="dashboard-date">{capitalizedDate}</p>
          <h1 id="dashboard-greeting">{greeting}, <span>{firstName || 'Diretoria'}!</span></h1>
          <p className="dashboard-society">{societyLabel}{societyLabel !== 'IPNC' ? ' IPNC' : ''} • {dashboardRead.hasSnapshot ? `${dashboardStats.activeMembers} membro${dashboardStats.activeMembers === 1 ? '' : 's'} ativo${dashboardStats.activeMembers === 1 ? '' : 's'}` : 'Diretoria'}</p>
        </div>
        <blockquote className="dashboard-verse"><p>“Mas tu, ó homem de Deus,<br />avança...”</p><cite>1 Timóteo 6:11</cite></blockquote>
          <button
            type="button"
            onClick={() => navigate('/comunicados')}
            className="dashboard-welcome-notifications"
            aria-label="Abrir comunicados"
          >
            <Bell className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            {dashboardRead.hasSnapshot && (pendingSubmissions > 0 || dashboardStats.announcements > 0) && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-emerald-900" />
            )}
          </button>
      </section>

      <PastorNotificationBanner />
      {dashboardRead.error && <div className="mb-section-gap"><QueryErrorState message="Não foi possível consultar os indicadores da diretoria." onRetry={() => void fetchDashboardData()} retrying={dashboardRead.loading} hasPreviousData={dashboardRead.hasSnapshot} /></div>}
      {eventsError && <div className="mb-section-gap"><QueryErrorState message="Não foi possível consultar a agenda." onRetry={() => void refetchEvents()} retrying={eventsFetching} hasPreviousData={hasEventsSnapshot} /></div>}

      <AppCard
        variant="interactive"
        className="dashboard-central flex items-center justify-between gap-3"
        role="link"
        tabIndex={0}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(dashboardRead.hasSnapshot && pendingSubmissions > 0 ? '/financas?tab=comprovantes' : '/comunicados'); } }}
        onClick={() => dashboardRead.hasSnapshot && pendingSubmissions > 0
          ? navigate('/financas?tab=comprovantes')
          : navigate('/comunicados')}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-11 sm:w-11">
            {dashboardRead.hasSnapshot && pendingSubmissions > 0
              ? <Receipt className="h-5 w-5" />
              : <Megaphone className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="min-w-0 whitespace-normal break-words text-sm font-semibold text-foreground sm:text-base">
              {dashboardRead.hasSnapshot && pendingSubmissions > 0 ? 'Comprovantes pendentes' : 'Central da diretoria'}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
              {!dashboardRead.hasSnapshot ? (dashboardRead.error ? 'Consulta indisponível' : 'Consultando comunicados e comprovantes…') : pendingSubmissions > 0
                ? `${pendingSubmissions} comprovante${pendingSubmissions > 1 ? 's' : ''} aguardando aprovação`
                : `${dashboardStats.announcements} comunicado${dashboardStats.announcements === 1 ? '' : 's'} ${dashboardStats.announcements === 1 ? 'disponível' : 'disponíveis'} para acompanhamento`}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
      </AppCard>

      <MetricGrid className="dashboard-metrics">
        <MetricCard
          title="Eventos"
          value={summaryEventsRead.hasEventsSnapshot ? weekCount : '—'}
          description={summaryEventsRead.hasEventsSnapshot ? `${todayCount} hoje • próximos 7 dias` : 'Consultando agenda'}
          icon={Calendar}
          tone="success"
          className="dashboard-metric dashboard-metric--green"
          onClick={() => navigate('/calendario')}
        />
        <MetricCard
          title="Membros"
          value={dashboardRead.hasSnapshot ? dashboardStats.activeMembers : '—'}
          description="ativos na sociedade"
          icon={Users}
          tone="info"
          className="dashboard-metric dashboard-metric--blue"
          onClick={() => navigate('/usuarios')}
        />
        <MetricCard
          title="Tarefas"
          value={dashboardRead.hasSnapshot ? dashboardStats.openTasks : '—'}
          description={dashboardRead.hasSnapshot ? `${dashboardStats.overdueTasks} vencida${dashboardStats.overdueTasks === 1 ? '' : 's'}` : 'Consultando tarefas'}
          icon={CheckSquare}
          tone={dashboardStats.overdueTasks > 0 ? 'warning' : 'default'}
          className={`dashboard-metric dashboard-metric--${dashboardStats.overdueTasks > 0 ? 'gold' : 'green'}`}
          onClick={() => navigate('/tarefas')}
        />
        <MetricCard
          title="Finanças"
          value={dashboardRead.hasSnapshot ? currency(dashboardStats.monthlyRevenue) : '—'}
          description={dashboardRead.hasSnapshot ? `Entradas no mês • ${dashboardStats.pendingCharges} cobrança${dashboardStats.pendingCharges === 1 ? '' : 's'} pendente${dashboardStats.pendingCharges === 1 ? '' : 's'}` : 'Consultando finanças'}
          icon={Coins}
          tone="warning"
          className="dashboard-metric dashboard-metric--gold"
          onClick={() => navigate('/financas')}
        />
      </MetricGrid>

      <div className="dashboard-primary-grid">
        <section className="dashboard-events">
          <AppCard noPadding className="dashboard-panel">
          <SectionHeader
            title="Próximos eventos"
            icon={<Calendar />}
            action={(
              <button
                type="button"
                onClick={() => navigate('/calendario')}
                className="min-h-12 px-2 text-sm font-semibold text-primary hover:underline"
              >
                Ver calendário
              </button>
            )}
            className="dashboard-section-heading"
          />

          <div className="dashboard-events-body divide-y divide-border/60">
            {!summaryEventsRead.hasEventsSnapshot && !summaryEventsRead.isError ? (
              <div className="space-y-2.5 p-3 sm:p-4">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : !summaryEventsRead.hasEventsSnapshot ? null : upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => {
                const eventDate = new Date(event.start_date);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate('/calendario')}
                    className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition hover:bg-muted/40 sm:px-4 sm:py-3.5"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-12 sm:w-12">
                      <span className="text-base font-bold leading-none sm:text-lg">{format(eventDate, 'dd')}</span>
                      <span className="text-[9px] font-bold uppercase sm:text-[10px]">
                        {format(eventDate, 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="min-w-0 whitespace-normal break-words text-sm font-semibold text-foreground sm:text-base">
                        {event.title}
                      </p>
                      <p className="min-w-0 whitespace-normal break-words text-xs text-muted-foreground sm:text-sm">
                        {format(eventDate, 'HH:mm')} {event.location ? `• ${event.location}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            ) : (
              <div className="dashboard-events-empty"><Calendar aria-hidden="true" /><p>Nenhum evento próximo encontrado.</p><span>Os próximos encontros aparecerão aqui.</span></div>
            )}
          </div>
          </AppCard>
        </section>

        <div className="dashboard-side-stack">
          <AppCard noPadding className="dashboard-panel dashboard-quick-panel">
            <SectionHeader title="Acesso rápido" icon={<Sparkles />} className="dashboard-section-heading" />
            <div className="dashboard-quick-grid">
              <QuickAction label="Reunião" icon={Users} onClick={() => navigate('/reunioes')} />
              <QuickAction label="Evento" icon={Calendar} onClick={() => navigate('/calendario')} />
              <QuickAction label="Tarefa" icon={CheckSquare} tone="gold" onClick={() => navigate('/tarefas')} />
              <QuickAction label="Finanças" icon={Coins} tone="gold" onClick={() => navigate('/financas')} />
            </div>
          </AppCard>
          <HomeBirthdayCard variant="dashboard" />
        </div>
      </div>

      <div className="dashboard-calendar-grid">
        <section className="dashboard-calendar">
          <PastorCalendarWidget
            events={events}
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
        </section>

        <section className="dashboard-day-programs">
          {hasEventsSnapshot && <AppCard className="dashboard-panel"><PastorDayEventList
            selectedDate={selectedDate}
            events={events}
            onUpdateStatus={isManagement || isAdmin ? handleUpdateStatus : undefined}
            isUpdating={updateEvent.isPending}
          /></AppCard>}
        </section>
      </div>

      <footer className="dashboard-footer"><p>“Tu, porém, renova-te em Cristo.”</p><span>Tema da UMP IPNC 2026</span></footer>
      </div>
    </AppLayout>
  );
}
