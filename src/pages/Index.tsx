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
import { PageHeader } from '@/components/layout/PageHeader';
import { AppCard } from '@/components/ui/app-card';
import { SectionTitle } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeBirthdayCard } from '@/components/aniversariantes/HomeBirthdayCard';
import {
  DollarSign,
  Users,
  Calendar,
  Plus,
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
    <AppCard variant="interactive" className="flex flex-col items-center gap-1.5 md:gap-2 md:flex-1 md:min-w-[100px]" onClick={onClick}>
      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      </div>
      <span className="text-xs md:text-sm font-medium whitespace-nowrap">{label}</span>
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

  // Summary chips
  const todayCount = useMemo(() => {
    const d = new Date();
    return events.filter(ev => {
      const s = new Date(ev.start_date);
      return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
    }).length;
  }, [events]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    return events.filter(ev => {
      const s = new Date(ev.start_date);
      return s >= now && s <= endOfWeek;
    }).length;
  }, [events]);

  const awaitingCount = useMemo(() => {
    return events.filter(ev => ev.status === 'confirmado' || ev.status === 'pendente').length;
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
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
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
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)}
      />
      <PastorNotificationBanner />

      <UpdateAppButton />

      {/* Pending submissions notification */}
      {pendingSubmissions > 0 && (
        <AppCard
          variant="interactive"
          className="mb-4 bg-warning/10 border-warning/20"
          onClick={() => navigate('/financas?tab=comprovantes')}
        >
          <span className="text-warning text-sm font-medium">
            📋 {pendingSubmissions} comprovante{pendingSubmissions > 1 ? 's' : ''} de pagamento pendente{pendingSubmissions > 1 ? 's' : ''} de aprovação
          </span>
        </AppCard>
      )}

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <AppCard variant="stat">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Hoje</p>
          <p className="text-lg font-bold">{todayCount}</p>
        </AppCard>
        <AppCard variant="stat">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Semana</p>
          <p className="text-lg font-bold">{weekCount}</p>
        </AppCard>
        <AppCard variant="stat">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Aguardando</p>
          <p className="text-lg font-bold">{awaitingCount}</p>
        </AppCard>
      </div>

      {/* Calendar */}
      <div className="mb-4">
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
      </div>

      {/* Birthdays card */}
      <HomeBirthdayCard />

      {/* Day event list */}
      <div className="mb-6">
        <PastorDayEventList
          selectedDate={selectedDate}
          events={events}
          onUpdateStatus={isManagement || isAdmin ? handleUpdateStatus : undefined as any}
          isUpdating={updateEvent.isPending}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <SectionTitle className="text-base md:text-lg font-semibold normal-case tracking-normal">Acesso Rápido</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <QuickAction label="Nova Reunião" icon={Users} onClick={() => navigate('/reunioes')} />
          <QuickAction label="Novo Evento" icon={Calendar} onClick={() => navigate('/calendario')} />
          <QuickAction label="Finanças" icon={DollarSign} onClick={() => navigate('/financas')} />
          <QuickAction label="Nova Tarefa" icon={Plus} onClick={() => navigate('/tarefas')} />
        </div>
      </div>
    </AppLayout>
  );
}
