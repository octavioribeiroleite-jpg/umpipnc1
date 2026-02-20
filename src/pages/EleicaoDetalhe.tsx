import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { AttendanceList } from '@/components/eleicoes/AttendanceList';
import { CandidateForm } from '@/components/eleicoes/CandidateForm';
import { VotingPanel } from '@/components/eleicoes/VotingPanel';
import { ResultPanel } from '@/components/eleicoes/ResultPanel';

interface Election {
  id: string;
  name: string;
  position: string;
  status: string;
  total_present: number;
  society_id: string | null;
  created_by: string;
  created_at: string;
}

interface AttendanceItem { id: string; name: string; present: boolean; }
interface Candidate { id: string; name: string; photo_url: string | null; display_order: number; }

export default function EleicaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [election, setElection] = useState<Election | null>(null);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!id) return;
    const [elRes, atRes, caRes] = await Promise.all([
      supabase.from('elections' as any).select('*').eq('id', id).single(),
      supabase.from('election_attendance' as any).select('*').eq('election_id', id).order('name' as any),
      supabase.from('election_candidates' as any).select('*').eq('election_id', id).order('display_order' as any),
    ]);

    if (elRes.error) {
      toast({ title: 'Eleição não encontrada', variant: 'destructive' });
      navigate('/eleicoes');
      return;
    }

    setElection(elRes.data as any);
    setAttendance((atRes.data as any[]) || []);
    setCandidates((caRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  if (loading || !election) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const statusLabel: Record<string, string> = { draft: 'Rascunho', open: 'Em Votação', finished: 'Finalizada' };
  const isDraft = election.status === 'draft';

  return (
    <AppLayout>
      <PageHeader
        title={election.name}
        description={`Cargo: ${election.position}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={election.status === 'open' ? 'default' : 'secondary'}>
              {statusLabel[election.status]}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/eleicoes')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <AttendanceList
          electionId={election.id}
          societyId={election.society_id}
          attendance={attendance}
          onRefresh={fetchAll}
          disabled={!isDraft}
        />

        <CandidateForm
          electionId={election.id}
          candidates={candidates}
          onRefresh={fetchAll}
          disabled={!isDraft}
        />

        <VotingPanel
          electionId={election.id}
          status={election.status}
          totalPresent={election.total_present}
          onRefresh={fetchAll}
        />

        {election.status === 'finished' && (
          <ResultPanel
            electionId={election.id}
            totalPresent={election.total_present}
            candidates={candidates}
          />
        )}
      </div>
    </AppLayout>
  );
}
