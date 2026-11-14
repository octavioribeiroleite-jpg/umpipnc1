import { QueryErrorState } from '@/components/ui/query-error-state';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import { ReuniaoFilters, type MeetingStatusFilter } from '@/components/reunioes/ReuniaoFilters';
import { ReuniaoCard } from '@/components/reunioes/ReuniaoCard';
import { ReuniaoPastaData } from '@/components/reunioes/ReuniaoPastaData';
import '@/components/reunioes/reunioes.css';

const monthKey = (date: string) => format(new Date(date), 'yyyy-MM');
const monthLabel = (month: string) => {
  const [year, number] = month.split('-').map(Number);
  const label = format(new Date(year, number - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const searchKey = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim();

export default function Reunioes() {
  const navigate = useNavigate();
  const { meetings, loading, error, deleteMeeting, refetch } = useMeetings();
  const { isManagement } = useAuth();

  const [statusFilter, setStatusFilter] = useState<MeetingStatusFilter>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredMeetings = useMemo(() => {
    const search = searchKey(searchFilter);
    return meetings.filter(meeting => {
      if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;
      if (monthFilter !== 'all' && monthKey(meeting.date) !== monthFilter) return false;
      if (search && !searchKey(meeting.title).includes(search)) return false;
      return true;
    });
  }, [meetings, statusFilter, monthFilter, searchFilter]);

  const groupedMeetings = useMemo(() => {
    const groups = new Map<string, typeof filteredMeetings>();
    for (const meeting of filteredMeetings) {
      const key = meeting.status === 'aberta' ? 'open' : monthKey(meeting.date);
      const group = groups.get(key) ?? [];
      group.push(meeting);
      groups.set(key, group);
    }
    return [...groups].sort(([a], [b]) => a === 'open' ? -1 : b === 'open' ? 1 : b.localeCompare(a));
  }, [filteredMeetings]);
  const months = useMemo(() => [...new Set(meetings.map(meeting => monthKey(meeting.date)))]
    .sort((a, b) => b.localeCompare(a)).map(value => ({ value, label: monthLabel(value) })), [meetings]);

  const getAiStatus = (meeting: typeof meetings[0]) => {
    if (meeting.aiValidatedCount > 0 && meeting.aiValidatedCount === meeting.aiSuggestionsCount) return 'validated' as const;
    if (meeting.aiSuggestionsCount > 0) return 'pending' as const;
    return 'not_generated' as const;
  };

  return (
    <AppLayout>
      <div className="meetings-workspace mx-auto w-full max-w-[56rem] space-y-4 sm:space-y-5">
        <header className="meeting-cover flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] p-5 sm:p-7">
          <div className="min-w-0">
            <h1 className="meeting-cover__title">Reuniões</h1>
            <p className="meeting-cover__meta mt-1 text-sm">Pautas, registros e atas da diretoria.</p>
          </div>
          <Button onClick={() => navigate('/reunioes/nova')} className="meeting-cover__new min-h-11 gap-2 rounded-xl focus-visible:ring-white">
            <Plus aria-hidden="true" className="size-4" /> Nova reunião
          </Button>
        </header>

        <ReuniaoFilters
          status={statusFilter}
          month={monthFilter}
          search={searchFilter}
          months={months}
          onStatusChange={setStatusFilter}
          onMonthChange={setMonthFilter}
          onSearchChange={setSearchFilter}
        />

        <div className="space-y-3 md:space-y-4">
          {error && <QueryErrorState message="Não foi possível carregar as reuniões." onRetry={() => void refetch()} retrying={loading} hasPreviousData={meetings.length > 0} />}
          {loading && meetings.length === 0 ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : groupedMeetings.length === 0 ? (error ? null : (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title={meetings.length === 0 ? 'Nenhuma reunião cadastrada' : 'Nenhuma reunião encontrada'}
              description={meetings.length === 0 ? 'Crie sua primeira reunião para começar.' : 'Tente alterar os filtros selecionados.'}
              action={
                meetings.length > 0 ? (
                  <Button variant="outline" onClick={() => { setStatusFilter('all'); setMonthFilter('all'); setSearchFilter(''); }}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          )) : (
            groupedMeetings.map(([key, meetingsInDate]) => (
              <ReuniaoPastaData key={key} label={key === 'open' ? 'Abertas' : monthLabel(key)} active={key === 'open'} count={meetingsInDate.length}>
                {meetingsInDate.map((meeting) => (
                  <ReuniaoCard
                    key={meeting.id}
                    id={meeting.id}
                    title={meeting.title}
                    date={meeting.date}
                    moderatorName={meeting.moderatorName}
                    status={meeting.status}
                    hasMinutes={!!meeting.final_minutes}
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
      </div>
    </AppLayout>
  );
}
