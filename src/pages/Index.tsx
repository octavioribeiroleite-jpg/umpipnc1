import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PastorNotificationBanner } from '@/components/pastor/PastorNotificationBanner';
import { PastorLoginNotification } from '@/components/pastor/PastorLoginNotification';
import { PastorCalendarWidget } from '@/components/pastor/PastorCalendarWidget';
import { PastorDayEventList } from '@/components/pastor/PastorDayEventList';
import { useEvents, EventStatus } from '@/hooks/useEvents';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppCard } from '@/components/ui/app-card';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeBirthdayCard } from '@/components/aniversariantes/HomeBirthdayCard';
import {
  DollarSign,
  Users,
  Calendar,
  Plus,
  Bell,
  CheckSquare,
  ChevronRight,
  Gift,
  Megaphone,
  Clock,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white/90 p-3 text-center shadow-sm transition active:scale-[0.98] dark:border-border dark:bg-card/95"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[11px] font-semibold leading-tight text-foreground">{label}</span>
    </button>
  );
}

function StatTile({
  title,
  value,
  subtitle,
  icon: Icon,
  onClick,
  tone = 'emerald',
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  onClick?: () => void;
  tone?: 'emerald' | 'blue' | 'purple' | 'amber';
}) {
  const toneClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  }[tone];

  return (
    <AppCard
      variant={onClick ? 'interactive' : 'stat'}
      className="min-h-[122px] p-4"
      onClick={onClick}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
          {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </AppCard>
  );
}

export default function Index() {
  const { user, loading, rolesLoaded, isPastor, profile, isAdmin, isManagement, roles, effectiveSocietyId: societyId } = useAuth();
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
    if (user) {
      const fetchPending = async () => {
        let query = supabase
          .from('member_payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente');
        if (societyId) query = query.eq('society_id', societyId);
        const { count } = await query;
        setPendingSubmissions(count || 0);
      };
      fetchPending();
    }
  }, [user, societyId]);

  const todayCount = useMemo(() => {
    const d = new Date();
    return events.filter(ev => {
      const s = new Date(ev.start_date);
      return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
    }).length;
  }, [events]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startToday);
    endOfWeek.setDate(startToday.getDate() + 7);
    return events.filter(ev => {
      const s = new Date(ev.start_date);
      return s >= startToday && s <= endOfWeek;
    }).length;
  }, [events]);

  const awaitingCount = useMemo(() => {
    return events.filter(ev => ev.status === 'confirmado' || ev.status === 'pendente').length;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [...events]
      .filter(ev => new Date(ev.start_date) >= startToday)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 3);
  }, [events]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
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

  if (loading || !rolesLoaded) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-[28px]" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
          </div>
          <Skeleton className="h-64 w-full rounded-[18px]" />
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <AppLayout>
      <PastorLoginNotification />

      <section className="relative -mx-3 -mt-14 mb-4 overflow-hidden rounded-b-[32px] bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 px-5 pb-8 pt-20 text-white shadow-lg sm:-mx-4">
        <div className="absolute -right-16 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute bottom-3 right-6 text-[92px] font-black leading-none text-white/5">IPNC</div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100">{todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{greeting}, {firstName || 'Diretoria'} 👋</h1>
            <p className="mt-1 text-sm text-emerald-50/90">UMP IPNC • Uma família, um propósito.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/comunicados')}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="Abrir comunicados"
          >
            <Bell className="h-5 w-5" />
            {pendingSubmissions > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-emerald-900" />}
          </button>
        </div>
      </section>

      <PastorNotificationBanner />

      <AppCard
        variant="interactive"
        className="mb-4 flex items-center justify-between gap-3 p-4"
        onClick={() => pendingSubmissions > 0 ? navigate('/financas?tab=comprovantes') : navigate('/comunicados')}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {pendingSubmissions > 0 ? <Receipt className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {pendingSubmissions > 0 ? 'Comprovantes pendentes' : 'Central da diretoria'}
            </p>
            <p className="text-sm text-muted-foreground">
              {pendingSubmissions > 0
                ? `${pendingSubmissions} comprovante${pendingSubmissions > 1 ? 's' : ''} aguardando aprovação`
                : 'Acompanhe comunicados, tarefas e eventos da UMP'}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </AppCard>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatTile title="Reuniões" value={weekCount} subtitle="eventos nos próximos 7 dias" icon={Users} onClick={() => navigate('/reunioes')} />
        <StatTile title="Hoje" value={todayCount} subtitle="eventos para hoje" icon={Clock} tone="blue" onClick={() => navigate('/calendario')} />
        <StatTile title="Tarefas" value={awaitingCount} subtitle="eventos aguardando atenção" icon={CheckSquare} tone="purple" onClick={() => navigate('/tarefas')} />
        <StatTile title="Finanças" value={pendingSubmissions} subtitle="comprovantes pendentes" icon={DollarSign} tone="amber" onClick={() => navigate('/financas?tab=comprovantes')} />
      </div>

      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-700" />
            <h2 className="text-lg font-bold text-foreground">Próximos eventos</h2>
          </div>
          <button type="button" onClick={() => navigate('/calendario')} className="text-sm font-semibold text-emerald-700">
            Ver calendário
          </button>
        </div>

        <AppCard className="divide-y divide-border/60 p-0">
          {eventsLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const eventDate = new Date(event.start_date);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate('/calendario')}
                  className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40"
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="text-lg font-bold leading-none">{format(eventDate, 'dd')}</span>
                    <span className="text-[10px] font-bold uppercase">{format(eventDate, 'MMM', { locale: ptBR })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(eventDate, 'HH:mm')} {event.location ? `• ${event.location}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Nenhum evento próximo encontrado.</div>
          )}
        </AppCard>
      </section>

      <section className="mb-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-700" />
          <h2 className="text-lg font-bold text-foreground">Acesso rápido</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction label="Reunião" icon={Users} onClick={() => navigate('/reunioes')} />
          <QuickAction label="Evento" icon={Calendar} onClick={() => navigate('/calendario')} />
          <QuickAction label="Tarefa" icon={Plus} onClick={() => navigate('/tarefas')} />
          <QuickAction label="Finanças" icon={DollarSign} onClick={() => navigate('/financas')} />
        </div>
      </section>

      <section className="mb-5">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-700" />
          <h2 className="text-lg font-bold text-foreground">Aniversariantes</h2>
        </div>
        <HomeBirthdayCard />
      </section>

      <section className="mb-5">
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

      <section className="mb-6">
        <PastorDayEventList
          selectedDate={selectedDate}
          events={events}
          onUpdateStatus={isManagement || isAdmin ? handleUpdateStatus : undefined as any}
          isUpdating={updateEvent.isPending}
        />
      </section>

      <AppCard className="mb-2 bg-gradient-to-br from-emerald-900 to-emerald-700 p-5 text-center text-white">
        <p className="text-base font-semibold">&quot;Tu, porém, renova-te em Cristo.&quot;</p>
        <p className="mt-1 text-sm text-emerald-100">Tema da UMP IPNC 2026</p>
      </AppCard>
    </AppLayout>
  );
}
