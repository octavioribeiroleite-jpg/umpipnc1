import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import { ReuniaoFilters } from '@/components/reunioes/ReuniaoFilters';
import { ReuniaoCard } from '@/components/reunioes/ReuniaoCard';
import { ReuniaoPastaData } from '@/components/reunioes/ReuniaoPastaData';

export default function Reunioes() {
  const navigate = useNavigate();
  const { meetings, loading, deleteMeeting, refetch } = useMeetings();
  const { isManagement } = useAuth();
  
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      // Status filter
      if (statusFilter !== 'all' && meeting.status !== statusFilter) {
        return false;
      }

      // Month filter
      if (monthFilter !== 'all') {
        const meetingMonth = meeting.date.substring(0, 7); // YYYY-MM
        if (meetingMonth !== monthFilter) {
          return false;
        }
      }

      // Search filter
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        if (!meeting.title.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [meetings, statusFilter, monthFilter, searchFilter]);

  // Agrupar reuniões por data
  const groupedMeetings = useMemo(() => {
    const groups: Record<string, typeof filteredMeetings> = {};
    
    filteredMeetings.forEach(meeting => {
      const dateKey = meeting.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
    });
    
    // Ordenar por data (mais recente primeiro)
    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredMeetings]);

  const getAiStatus = (meeting: typeof meetings[0]) => {
    if (meeting.aiValidatedCount > 0 && meeting.aiValidatedCount === meeting.aiSuggestionsCount) {
      return 'validated' as const;
    }
    if (meeting.aiSuggestionsCount > 0) {
      return 'pending' as const;
    }
    return 'not_generated' as const;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Reuniões"
        description="Gerencie as reuniões da diretoria"
        action={
          <Button onClick={() => navigate('/reunioes/nova')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reunião
          </Button>
        }
      />

      <ReuniaoFilters
        onStatusChange={setStatusFilter}
        onMonthChange={setMonthFilter}
        onSearchChange={setSearchFilter}
      />

      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : groupedMeetings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {meetings.length === 0
                ? 'Nenhuma reunião cadastrada.'
                : 'Nenhuma reunião encontrada com os filtros selecionados.'}
            </p>
            {meetings.length === 0 && (
              <Button
                variant="outline"
                onClick={() => navigate('/reunioes/nova')}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Reunião
              </Button>
            )}
          </div>
        ) : (
          groupedMeetings.map(([date, meetingsInDate]) => (
            <ReuniaoPastaData 
              key={date} 
              date={date} 
              count={meetingsInDate.length}
              defaultOpen={true}
            >
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
