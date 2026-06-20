import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AppCard } from '@/components/ui/app-card';
import { Plus, FileText, CalendarDays, Clock, CheckCircle2, Users, Search } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import { ReuniaoFilters } from '@/components/reunioes/ReuniaoFilters';
import { ReuniaoCard } from '@/components/reunioes/ReuniaoCard';
import { ReuniaoPastaData } from '@/components/reunioes/ReuniaoPastaData';
import { FAB } from '@/components/ui/fab';
import { cn } from '@/lib/utils';

type QuickFilter = 'all' | 'aberta' | 'fechada' | 'pendente' | 'hoje';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'emerald',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  tone?: 'emerald' | 'amber' | 'blue' | 'purple';
}) {
  const toneClass = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  }[tone];

  return (
    <AppCard className="min-w-[142px] flex-1 p-4">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 text-xs font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{description}</p>
        </div>
      </div>
    </AppCard>
  );
}

export default function Reunioes() {
  const navigate = useNavigate();
  const { meetings, loading, deleteMeeting, refetch } = useMeetings();
  const { isManagement } = useAuth();
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const todayIso = new Date().toISOString().slice(0, 10);

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const futureMeetings = meetings
      .filter(meeting => new Date(meeting.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pendingMeetings = meetings.filter(meeting =>
      meeting.status === 'aberta' || meeting.agendaItemsCount === 0 || meeting.aiValidatedCount < meeting.aiSuggestionsCount
    );

    const participants = meetings.reduce((sum, meeting) => sum + meeting.participantsCount, 0);

    return {
      next: futureMeetings.length,
      pending: pendingMeetings.length,
      closed: meetings.filter(meeting => meeting.status === 'fechada').length,
      participants,
    };
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;
      if (monthFilter !== 'all') {
        const meetingMonth = meeting.date.substring(0, 7);
        if (meetingMonth !== monthFilter) return false;
      }
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const matchesTitle = meeting.title.toLowerCase().includes(search);
        const matchesModerator = meeting.moderatorName.toLowerCase().includes(search);
        if (!matchesTitle && !matchesModerator) return false;
      }
      if (quickFilter === 'aberta' && meeting.status !== 'aberta') return false;
      if (quickFilter === 'fechada' && meeting.status !== 'fechada') return false;
      if (quickFilter === 'hoje' && meeting.date.slice(0, 10) !== todayIso) return false;
      if (quickFilter === 'pendente') {
        const hasPending = meeting.status === 'aberta' || meeting.agendaItemsCount === 0 || meeting.aiValidatedCount < meeting.aiSuggestionsCount;
        if (!hasPending) return false;
      }
      return true;
    });
  }, [meetings, statusFilter, monthFilter, searchFilter, quickFilter, todayIso]);

  const groupedMeetings = useMemo(() => {
    const groups: Record<string, typeof filteredMeetings> = {};
    filteredMeetings.forEach(meeting => {
      const dateKey = meeting.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(meeting);
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredMeetings]);

  const getAiStatus = (meeting: typeof meetings[0]) => {
    if (meeting.aiValidatedCount > 0 && meeting.aiValidatedCount === meeting.aiSuggestionsCount) return 'validated' as const;
    if (meeting.aiSuggestionsCount > 0) return 'pending' as const;
    return 'not_generated' as const;
  };

  const quickFilters: { value: QuickFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'aberta', label: 'Abertas' },
    { value: 'fechada', label: 'Fechadas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'hoje', label: 'Hoje' },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Reuniões"
        description="Acompanhe, organize e registre cada reunião"
        action={
          <Button onClick={() => navigate('/reunioes/nova')} className="hidden md:inline-flex">
            <Plus className="h-4 w-4 mr-2" /> Nova Reunião
          </Button>
        }
      />

      <FAB onClick={() => navigate('/reunioes/nova')} />

      <div className="mb-4 -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
        <StatCard title="Próxima" value={dashboardStats.next} description="reuniões futuras" icon={CalendarDays} />
        <StatCard title="Pendentes" value={dashboardStats.pending} description="exigem atenção" icon={Clock} tone="amber" />
        <StatCard title="Atas fechadas" value={dashboardStats.closed} description="reuniões concluídas" icon={CheckCircle2} tone="blue" />
        <StatCard title="Participações" value={dashboardStats.participants} description="presenças registradas" icon={Users} tone="purple" />
      </div>

      <ReuniaoFilters
        onStatusChange={setStatusFilter}
        onMonthChange={setMonthFilter}
        onSearchChange={setSearchFilter}
      />

      <div className="mb-4 -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {quickFilters.map(filter => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setQuickFilter(filter.value)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[0.98]',
              quickFilter === filter.value
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                : 'border-border bg-card text-foreground hover:bg-muted/60'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 md:space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : groupedMeetings.length === 0 ? (
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title={meetings.length === 0 ? 'Nenhuma reunião cadastrada' : 'Nenhuma reunião encontrada'}
            description={meetings.length === 0 ? 'Crie sua primeira reunião para começar.' : 'Tente alterar a busca ou os filtros selecionados.'}
            action={
              meetings.length === 0 ? (
                <Button variant="outline" onClick={() => navigate('/reunioes/nova')}>
                  <Plus className="h-4 w-4 mr-2" /> Criar Primeira Reunião
                </Button>
              ) : undefined
            }
          />
        ) : (
          groupedMeetings.map(([date, meetingsInDate]) => (
            <ReuniaoPastaData key={date} date={date} count={meetingsInDate.length} defaultOpen={true}>
              {meetingsInDate.map((meeting) => (
                <ReuniaoCard
                  key={meeting.id}
                  id={meeting.id}
                  title={meeting.title}
                  date={meeting.date}
                  moderatorName={meeting.moderatorName}
                  status={meeting.status}
                  participantsCount={meeting.participantsCount}
                  progress={{
                    pautaComplete: meeting.agendaItemsCount > 0,
                    totalContributions: meeting.totalContributions,
                    finalizedContributions: meeting.finalizedContributions,
                    contributionsRevealed: meeting.contributions_revealed,
                    aiStatus: getAiStatus(meeting),
                  }}
                  onDelete={isManagement ? deleteMeeting : undefined}
                  onFinalize={refetch}
                  canManage={isManagement}
                />
              ))}
            </ReuniaoPastaData>
          ))
        )}
      </div>
    </AppLayout>
  );
}
