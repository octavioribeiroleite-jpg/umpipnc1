import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, UserCheck, Vote, Trophy, Monitor, Pencil, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { AttendanceList } from '@/components/eleicoes/AttendanceList';
import { CandidateForm } from '@/components/eleicoes/CandidateForm';
import { VotingPanel } from '@/components/eleicoes/VotingPanel';
import { ResultPanel } from '@/components/eleicoes/ResultPanel';
import { DeviceRegistration } from '@/components/eleicoes/DeviceRegistration';
import { ElectionStepper, StepDef } from '@/components/eleicoes/ElectionStepper';
import { ElectionStepCard } from '@/components/eleicoes/ElectionStepCard';

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
  const [activeStep, setActiveStep] = useState<string | null>(null);

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
    const parsedCandidates = ((caRes.data as any[]) || []).map((c: any) => ({
      ...c,
      photo_urls: Array.isArray(c.photo_urls) ? c.photo_urls : [],
    }));
    setCandidates(parsedCandidates);
    setDevices((devRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`election-devices-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'election_devices',
        filter: `election_id=eq.${id}`,
      }, () => {
        void fetchAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const votingMode = (election as any)?.voting_mode || 'shared';
  const showDevices = votingMode === 'both' || votingMode === 'shared';
  const electionType = ((election as any)?.type as string) || 'cargo';

  const completion = useMemo(() => {
    return {
      candidatos: candidates.length > 0,
      presenca: (election?.total_present || 0) > 0,
      dispositivos: !showDevices || devices.length > 0,
      votacao: election?.status === 'open' || election?.status === 'finished',
    };
  }, [candidates, election, devices, showDevices]);

  const steps: StepDef[] = useMemo(() => {
    const s: StepDef[] = [
      { key: 'candidatos', label: electionType === 'camisa' ? 'Modelos' : 'Candidatos' },
      { key: 'presenca', label: 'Presença' },
    ];
    if (showDevices) s.push({ key: 'dispositivos', label: 'Dispositivos' });
    s.push({ key: 'votacao', label: 'Iniciar' });
    return s;
  }, [electionType, showDevices]);

  // Determine current step automatically (first non-completed)
  const autoCurrentIndex = useMemo(() => {
    const idx = steps.findIndex((s) => !completion[s.key as keyof typeof completion]);
    return idx === -1 ? steps.length - 1 : idx;
  }, [steps, completion]);

  const currentStepKey = activeStep || steps[autoCurrentIndex]?.key;
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey);

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
  const devicesLocked = election.status === 'finished';
  const presentCount = attendance.filter((a) => a.present).length;

  const summaries: Record<string, string> = {
    candidatos: `${candidates.length} ${electionType === 'camisa' ? 'modelo(s)' : 'candidato(s)'} cadastrado(s)`,
    presenca: `${election.total_present} presente(s) confirmado(s)`,
    dispositivos: `${devices.length} dispositivo(s) cadastrado(s)`,
    votacao: election.status === 'finished' ? 'Votação concluída' : 'Votação em andamento',
  };

  const stepIcons: Record<string, JSX.Element> = {
    candidatos: <UserCheck className="h-4 w-4" />,
    presenca: <Users className="h-4 w-4" />,
    dispositivos: <Monitor className="h-4 w-4" />,
    votacao: <Vote className="h-4 w-4" />,
  };

  const stepTitles: Record<string, string> = {
    candidatos: electionType === 'camisa' ? 'Modelos' : 'Candidatos',
    presenca: 'Chamada de Presença',
    dispositivos: 'Dispositivos Fixos',
    votacao: 'Iniciar Votação',
  };

  const renderStepContent = (key: string) => {
    switch (key) {
      case 'candidatos':
        return (
          <CandidateForm
            electionId={election.id}
            candidates={candidates}
            onRefresh={fetchAll}
            disabled={!isDraft}
            type={electionType as 'cargo' | 'camisa'}
          />
        );
      case 'presenca':
        return (
          <AttendanceList
            electionId={election.id}
            societyId={election.society_id}
            attendance={attendance}
            onRefresh={fetchAll}
            disabled={!isDraft}
          />
        );
      case 'dispositivos':
        return (
          <DeviceRegistration
            electionId={election.id}
            devices={devices}
            onRefresh={fetchAll}
            disabled={devicesLocked}
          />
        );
      case 'votacao':
        return (
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
        );
    }
  };

  const handleStepClick = (idx: number) => {
    setActiveStep(steps[idx].key);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="rounded-[18px] bg-white/90 dark:bg-card/95 border border-white/20 dark:border-border/40 shadow-sm backdrop-blur-sm p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/eleicoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold truncate">{election.name}</h1>
              <Badge
                variant={election.status === 'open' ? 'default' : 'secondary'}
                className="shrink-0 gap-1"
              >
                {election.status === 'draft' && <Pencil className="h-3 w-3" />}
                {statusLabel[election.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{election.position}</p>
          </div>
        </div>

        {election.status !== 'finished' && (
          <>
            <ElectionStepper
              steps={steps}
              currentIndex={currentIndex >= 0 ? currentIndex : autoCurrentIndex}
              completed={completion as any}
              onStepClick={handleStepClick}
            />
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              Etapa {(currentIndex >= 0 ? currentIndex : autoCurrentIndex) + 1} de {steps.length}: {stepTitles[currentStepKey || '']}
            </p>
          </>
        )}
      </div>

      {/* Step cards */}
      {election.status !== 'finished' && (
        <div className="space-y-2">
          {steps.map((step) => {
            const isDone = completion[step.key as keyof typeof completion];
            const isActive = step.key === currentStepKey;
            const state: 'done' | 'active' | 'pending' = isActive ? 'active' : isDone ? 'done' : 'pending';
            const stepIdx = steps.findIndex((s) => s.key === step.key);
            const canOpen = isDone || stepIdx <= autoCurrentIndex;
            const isLast = stepIdx === steps.length - 1;
            const nextStep = steps[stepIdx + 1];

            return (
              <ElectionStepCard
                key={step.key}
                state={state}
                icon={stepIcons[step.key]}
                title={stepTitles[step.key]}
                summary={isDone || isActive ? summaries[step.key] : 'Pendente'}
                onToggle={!isActive && canOpen ? () => setActiveStep(step.key) : undefined}
                onAdvance={isActive && nextStep ? () => setActiveStep(nextStep.key) : undefined}
                canAdvance={isDone}
                advanceLabel={nextStep ? `Avançar: ${stepTitles[nextStep.key]}` : undefined}
                isLastStep={isLast}
              >
                {isActive && renderStepContent(step.key)}
              </ElectionStepCard>
            );
          })}
        </div>
      )}

      {/* Result */}
      {election.status === 'finished' && (
        <div className="rounded-[18px] bg-white/90 dark:bg-card/95 border border-white/20 dark:border-border/40 shadow-sm backdrop-blur-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              <h2 className="text-sm font-semibold">Resultado</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/eleicao/${election.id}/apresentar`, '_blank', 'noopener')}
              >
                <Monitor className="h-3.5 w-3.5 mr-1.5" />
                Abrir apresentação
                <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
              </Button>
              <Button
                size="sm"
                variant={(election as any).show_result ? 'secondary' : 'default'}
                onClick={async () => {
                  const next = !(election as any).show_result;
                  await supabase
                    .from('elections' as any)
                    .update({ show_result: next } as any)
                    .eq('id', election.id);
                  toast({
                    title: next
                      ? 'Resultado revelado no projetor'
                      : 'Resultado ocultado no projetor',
                  });
                  fetchAll();
                }}
              >
                {(election as any).show_result ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 mr-1.5" /> Ocultar no projetor
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Mostrar resultado
                  </>
                )}
              </Button>
            </div>
          </div>
          <ResultPanel
            electionId={election.id}
            totalPresent={election.total_present}
            candidates={candidates}
          />
        </div>
      )}
    </AppLayout>
  );
}
