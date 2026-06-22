import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Calendar,
  CheckSquare,
  ChevronRight,
  DollarSign,
  Gift,
  Megaphone,
  Plus,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, type EventStatus } from '@/hooks/useEvents';
import { AppLayout } from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { MetricGrid } from '@/components/layout/ResponsivePrimitives';
import { AppCard } from '@/components/ui/app-card';
import { MetricCard } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeBirthdayCard } from '@/components/aniversariantes/HomeBirthdayCard';
import { PastorNotificationBanner } from '@/components/pastor/PastorNotificationBanner';
import { PastorLoginNotification } from '@/components/pastor/PastorLoginNotification';
import { PastorCalendarWidget } from '@/components/pastor/PastorCalendarWidget';
import { PastorDayEventList } from '@/components/pastor/PastorDayEventList';

type DashboardStats = {
  activeMembers: number;
  openTasks: number;
  overdueTasks: number;
  monthlyRevenue: number;
  pendingCharges: number;
  announcements: number;
};

const currency = (value: number) =>
  `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[66px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[16px] border border-emerald-100 bg-white/90 px-1.5 py-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98] dark:border-border dark:bg-card/95 sm:min-h-[78px] sm:gap-2 sm:px-2"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-9 sm:w-9">
        <Icon className="h-4 w-4" />
      </div>
      <span className="w-full truncate text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
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
    effectiveSocietyId: societyId,
  } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const { events, isLoading: eventsLoading, updateEvent } = useEvents(
    currentMonth,
    currentYear,
    societyId || undefined,
  );

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

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const todayIso = now.toISOString().split('T')[0];
      const currentYearText = String(now.getFullYear());

      try {
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

        const monthlyRevenue = (transactionsRes.data || [])
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        setPendingSubmissions(submissionsRes.count || 0);
        setDashboardStats({
          activeMembers: membersRes.count || 0,
          openTasks: openTasksRes.count || 0,
          overdueTasks: overdueTasksRes.count || 0,
          monthlyRevenue,
          pendingCharges: pendingChargesRes.count || 0,
          announcements: announcementsRes.count || 0,
        });
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      }
    };

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
  }, [user, societyId]);

  const todayCount = useMemo(() => {
    const currentDate = new Date();
    return events.filter((event) => {
      const startDate = new Date(event.start_date);
      return startDate.getFullYear() === currentDate.getFullYear()
        && startDate.getMonth() === currentDate.getMonth()
        && startDate.getDate() === currentDate.getDate();
    }).length;
  }, [events]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startToday);
    endOfWeek.setDate(startToday.getDate() + 7);
    return events.filter((event) => {
      const startDate = new Date(event.start_date);
      return startDate >= startToday && startDate <= endOfWeek;
    }).length;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [...events]
      .filter((event) => new Date(event.start_date) >= startToday)
      .sort((first, second) => new Date(first.start_date).getTime() - new Date(second.start_date).getTime())
      .slice(0, 3);
  }, [events]);

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
      <AppLayout>
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

  return (
    <AppLayout>
      <PastorLoginNotification />

      <section className="relative mb-section-gap overflow-hidden rounded-hero bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 px-4 py-4 text-white shadow-panel sm:px-5 sm:py-5 lg:min-h-[164px] lg:px-7 lg:py-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 lg:h-52 lg:w-52" />
        <div className="pointer-events-none absolute bottom-2 right-4 text-[58px] font-black leading-none text-white/[0.05] sm:text-[72px] lg:right-8 lg:text-[100px]">
          IPNC
        </div>

        <div className="relative flex min-w-0 items-start justify-between gap-3 lg:items-center">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-emerald-100 sm:text-sm">
              {capitalizedDate}
            </p>
            <h1 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {greeting}, {firstName || 'Diretoria'} 👋
            </h1>
            <p className="mt-1 text-xs leading-snug text-emerald-50/90 sm:text-sm lg:text-base">
              UMP IPNC • {dashboardStats.activeMembers} membro{dashboardStats.activeMembers === 1 ? '' : 's'} ativo{dashboardStats.activeMembers === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/comunicados')}
            className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 sm:h-11 sm:w-11"
            aria-label="Abrir comunicados"
          >
            <Bell className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            {(pendingSubmissions > 0 || dashboardStats.announcements > 0) && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-emerald-900" />
            )}
          </button>
        </div>
      </section>

      <PastorNotificationBanner />

      <AppCard
        variant="interactive"
        className="mb-section-gap flex min-h-[74px] items-center justify-between gap-3 rounded-card p-3 sm:min-h-[82px] sm:p-4"
        onClick={() => pendingSubmissions > 0
          ? navigate('/financas?tab=comprovantes')
          : navigate('/comunicados')}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-11 sm:w-11">
            {pendingSubmissions > 0
              ? <Receipt className="h-5 w-5" />
              : <Megaphone className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {pendingSubmissions > 0 ? 'Comprovantes pendentes' : 'Central da diretoria'}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
              {pendingSubmissions > 0
                ? `${pendingSubmissions} comprovante${pendingSubmissions > 1 ? 's' : ''} aguardando aprovação`
                : `${dashboardStats.announcements} comunicado${dashboardStats.announcements === 1 ? '' : 's'} disponível${dashboardStats.announcements === 1 ? '' : 'is'} para acompanhamento`}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
      </AppCard>

      <MetricGrid className="mb-section-gap">
        <MetricCard
          title="Eventos"
          value={weekCount}
          description={`${todayCount} hoje • próximos 7 dias`}
          icon={Calendar}
          tone="success"
          onClick={() => navigate('/calendario')}
        />
        <MetricCard
          title="Membros"
          value={dashboardStats.activeMembers}
          description="ativos na sociedade"
          icon={Users}
          tone="info"
          onClick={() => navigate('/usuarios')}
        />
        <MetricCard
          title="Tarefas"
          value={dashboardStats.openTasks}
          description={`${dashboardStats.overdueTasks} vencida${dashboardStats.overdueTasks === 1 ? '' : 's'}`}
          icon={CheckSquare}
          tone={dashboardStats.overdueTasks > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/tarefas')}
        />
        <MetricCard
          title="Finanças"
          value={currency(dashboardStats.monthlyRevenue)}
          description={`${dashboardStats.pendingCharges} cobrança${dashboardStats.pendingCharges === 1 ? '' : 's'} pendente${dashboardStats.pendingCharges === 1 ? '' : 's'}`}
          icon={DollarSign}
          tone="warning"
          valueClassName="whitespace-nowrap text-[clamp(1rem,4.2vw,1.75rem)] md:text-[clamp(1.15rem,2vw,2rem)]"
          onClick={() => navigate('/financas')}
        />
      </MetricGrid>

      <div className="grid min-w-0 gap-section-gap xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="min-w-0">
          <SectionHeader
            title="Próximos eventos"
            icon={<Calendar />}
            action={(
              <button
                type="button"
                onClick={() => navigate('/calendario')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 sm:text-sm"
              >
                Ver calendário
              </button>
            )}
            className="mb-2.5"
          />

          <AppCard className="divide-y divide-border/60 overflow-hidden rounded-panel p-0">
            {eventsLoading ? (
              <div className="space-y-2.5 p-3 sm:p-4">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => {
                const eventDate = new Date(event.start_date);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate('/calendario')}
                    className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition hover:bg-muted/40 sm:px-4 sm:py-3.5"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-12 sm:w-12">
                      <span className="text-base font-bold leading-none sm:text-lg">{format(eventDate, 'dd')}</span>
                      <span className="text-[9px] font-bold uppercase sm:text-[10px]">
                        {format(eventDate, 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                        {event.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">
                        {format(eventDate, 'HH:mm')} {event.location ? `• ${event.location}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-sm text-muted-foreground">Nenhum evento próximo encontrado.</div>
            )}
          </AppCard>
        </section>

        <div className="app-stack min-w-0">
          <section className="min-w-0">
            <SectionHeader title="Acesso rápido" icon={<Sparkles />} className="mb-2.5" />
            <div className="grid grid-cols-4 gap-2">
              <QuickAction label="Reunião" icon={Users} onClick={() => navigate('/reunioes')} />
              <QuickAction label="Evento" icon={Calendar} onClick={() => navigate('/calendario')} />
              <QuickAction label="Tarefa" icon={Plus} onClick={() => navigate('/tarefas')} />
              <QuickAction label="Finanças" icon={DollarSign} onClick={() => navigate('/financas')} />
            </div>
          </section>

          <section className="min-w-0">
            <SectionHeader title="Aniversariantes" icon={<Gift />} className="mb-2.5" />
            <HomeBirthdayCard />
          </section>
        </div>
      </div>

      <div className="mt-section-gap grid min-w-0 gap-section-gap xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0">
          <PastorCalendarWidget
            events={events}
            selectedDate={selectedDate}
            onDaySelect={setSelectedDate}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />
        </section>

        <section className="min-w-0">
          <PastorDayEventList
            selectedDate={selectedDate}
            events={events}
            onUpdateStatus={isManagement || isAdmin ? handleUpdateStatus : undefined as any}
            isUpdating={updateEvent.isPending}
          />
        </section>
      </div>

      <AppCard className="mt-section-gap mb-2 rounded-panel bg-gradient-to-br from-emerald-900 to-emerald-700 px-4 py-4 text-center text-white sm:px-5 sm:py-5">
        <p className="text-sm font-semibold sm:text-base">&quot;Tu, porém, renova-te em Cristo.&quot;</p>
        <p className="mt-1 text-xs text-emerald-100 sm:text-sm">Tema da UMP IPNC 2026</p>
      </AppCard>
    </AppLayout>
  );
}
