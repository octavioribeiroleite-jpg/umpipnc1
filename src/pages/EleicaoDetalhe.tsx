import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, UserCheck, Vote, Trophy, Monitor } from 'lucide-react';
import { AttendanceList } from '@/components/eleicoes/AttendanceList';
import { CandidateForm } from '@/components/eleicoes/CandidateForm';
import { VotingPanel } from '@/components/eleicoes/VotingPanel';
import { ResultPanel } from '@/components/eleicoes/ResultPanel';
import { DeviceRegistration } from '@/components/eleicoes/DeviceRegistration';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
interface Device { id: string; label: string; token: string; activated: boolean; }

export default function EleicaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [election, setElection] = useState<Election | null>(null);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!id) return;
    const [elRes, atRes, caRes, devRes] = await Promise.all([
      supabase.from('elections' as any).select('*').eq('id', id).single(),
      supabase.from('election_attendance' as any).select('*').eq('election_id', id).order('name' as any),
      supabase.from('election_candidates' as any).select('*').eq('election_id', id).order('display_order' as any),
      supabase.from('election_devices' as any).select('*').eq('election_id', id).order('created_at' as any),
    ]);

    if (elRes.error) {
      toast({ title: 'Eleição não encontrada', variant: 'destructive' });
      navigate('/eleicoes');
      return;
    }

    setElection(elRes.data as any);
    setAttendance((atRes.data as any[]) || []);
    // Parse photo_urls from jsonb
    const parsedCandidates = ((caRes.data as any[]) || []).map((c: any) => ({
      ...c,
      photo_urls: Array.isArray(c.photo_urls) ? c.photo_urls : [],
    }));
    setCandidates(parsedCandidates);
    setDevices((devRes.data as any[]) || []);
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
  const votingMode = (election as any).voting_mode || 'shared';
  const showDevices = votingMode === 'both' || votingMode === 'shared';

  // Accordion default open based on status
  const defaultOpen = (() => {
    switch (election.status) {
      case 'draft': return ['candidatos', 'votacao'];
      case 'open': return ['votacao'];
      case 'finished': return ['resultado'];
      default: return ['candidatos'];
    }
  })();

  return (
    <AppLayout>
      {/* Compact header */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/eleicoes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold truncate">{election.name}</h1>
            <Badge variant={election.status === 'open' ? 'default' : 'secondary'} className="shrink-0">
              {statusLabel[election.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{election.position}</p>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
        <AccordionItem value="candidatos" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Candidatos
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CandidateForm
              electionId={election.id}
              candidates={candidates}
              onRefresh={fetchAll}
              disabled={!isDraft}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="votacao" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Vote className="h-4 w-4" /> Votação
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <VotingPanel
              electionId={election.id}
              electionName={election.name}
              status={election.status}
              totalPresent={election.total_present}
              votingMode={votingMode}
              devices={devices}
              candidates={candidates}
              onRefresh={fetchAll}
            />
          </AccordionContent>
        </AccordionItem>

        {showDevices && (
          <AccordionItem value="dispositivos" className="border rounded-lg px-3">
            <AccordionTrigger className="py-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Dispositivos Fixos
                {devices.length > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-1">({devices.length})</span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <DeviceRegistration
                electionId={election.id}
                devices={devices}
                onRefresh={fetchAll}
                disabled={!isDraft}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="chamada" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Chamada de Presença
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <AttendanceList
              electionId={election.id}
              societyId={election.society_id}
              attendance={attendance}
              onRefresh={fetchAll}
              disabled={!isDraft}
            />
          </AccordionContent>
        </AccordionItem>

        {election.status === 'finished' && (
          <AccordionItem value="resultado" className="border rounded-lg px-3">
            <AccordionTrigger className="py-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Resultado
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ResultPanel
                electionId={election.id}
                totalPresent={election.total_present}
                candidates={candidates}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </AppLayout>
  );
}
