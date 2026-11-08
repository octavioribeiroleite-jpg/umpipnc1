import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, UserCheck, Vote, Trophy, Monitor, Pencil, ExternalLink, Eye, EyeOff, ListChecks, Check, Lock, ArrowRight } from 'lucide-react';
import { AttendanceList } from '@/components/eleicoes/AttendanceList';
import { CandidateForm } from '@/components/eleicoes/CandidateForm';
import { VotingPanel } from '@/components/eleicoes/VotingPanel';
import { ResultPanel } from '@/components/eleicoes/ResultPanel';
import { ElectionReportDownload } from '@/components/eleicoes/ElectionReportDownload';
import { DeviceRegistration } from '@/components/eleicoes/DeviceRegistration';
import { StepDef } from '@/components/eleicoes/ElectionStepper';
import { ElectionStepCard } from '@/components/eleicoes/ElectionStepCard';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { useAuth } from '@/contexts/AuthContext';
import { findElectionSequence, UMP_POSITIONS } from '@/lib/election-sequence';
import { NextElectionDialog } from '@/components/eleicoes/NextElectionDialog';

interface Election {
  id: string;
  name: string;
  position: string;
  status: string;
  total_present: number;
  society_id: string | null;
  created_by: string;
  created_at: string;
  seats_count?: number;
  max_choices_per_ballot?: number;
  current_round?: number;
  majority_rule?: string;
  nominations_open?: boolean;
}

interface AttendanceItem { id: string; name: string; present: boolean; }
interface Candidate { id: string; name: string; photo_url: string | null; display_order: number; birth_date?: string | null; nomination_round?: number; }
interface Device { id: string; label: string; token: string; activated: boolean; }

export default function EleicaoDetalhe() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [election, setElection] = useState<Election | null>(null);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const read = useSnapshotRead(id || 'missing');
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [changingMode, setChangingMode] = useState(false);
  const modeInFlight = useRef(false);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef<string | null>(null);
  const stageScopeRef = useRef<string | null>(null);

  const fetchAll = () => read.run(async () => {
    if (!id) throw new Error('Eleição indisponível');
    const [elRes, atRes, caRes, devRes] = await Promise.all([
      supabase.from('elections' as any).select('*').eq('id', id).single(),
      supabase.from('election_attendance' as any).select('*').eq('election_id', id).order('name' as any),
      supabase.from('election_candidates' as any).select('*').eq('election_id', id).order('display_order' as any),
      supabase.from('election_devices' as any).select('*').eq('election_id', id).order('created_at' as any),
    ]);

    for (const result of [elRes, atRes, caRes, devRes]) if (result.error) throw result.error;
    if (!elRes.data) throw new Error('Eleição indisponível');

    return () => {
    setElection(elRes.data as any);
    setAttendance((atRes.data as any[]) || []);
    const parsedCandidates = ((caRes.data as any[]) || []).map((c: any) => ({
      ...c,
      photo_urls: Array.isArray(c.photo_urls) ? c.photo_urls : [],
    }));
    setCandidates(parsedCandidates);
    setDevices((devRes.data as any[]) || []);
    };
  });

  useEffect(() => { setActiveStep(null); fetchAll(); }, [id]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elections', filter: `id=eq.${id}` }, () => void fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_candidates', filter: `election_id=eq.${id}` }, () => void fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_attendance', filter: `election_id=eq.${id}` }, () => void fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const sequenceStep = user && id ? findElectionSequence(user.id, id) : null;

  const votingMode = (election as any)?.voting_mode || 'shared';
  const showDevices = votingMode === 'both' || votingMode === 'shared';
  const electionType = ((election as any)?.type as string) || 'cargo';

  const currentRound = election?.current_round || 1;
  const nominationsOpen = !!election?.nominations_open;
  const currentCandidates = useMemo(() => candidates.filter(candidate => (candidate.nomination_round ?? currentRound) === currentRound), [candidates, currentRound]);

  const completion = useMemo(() => {
    return {
      candidatos: currentCandidates.length > 0,
      presenca: (election?.total_present || 0) > 0 && election?.total_present === attendance.filter(person => person.present).length,
      dispositivos: !showDevices || devices.length > 0,
      votacao: (election?.status === 'open' && !nominationsOpen) || election?.status === 'finished',
    };
  }, [currentCandidates, election, attendance, devices, showDevices, nominationsOpen]);

  const steps: StepDef[] = useMemo(() => {
    const s: StepDef[] = [
      { key: 'presenca', label: 'Presença' },
      { key: 'candidatos', label: electionType === 'camisa' ? 'Modelos' : 'Candidatos' },
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

  // Choose an initial step once per election. Saving the first candidate must
  // not navigate away from a form where the organizer is adding more names.
  useEffect(() => {
    if (!read.hasSnapshot || !election?.id) return;
    const scope = `${election.id}:${currentRound}:${nominationsOpen ? 'nominations' : 'voting'}`;
    if (stageScopeRef.current !== scope) {
      stageScopeRef.current = scope;
      setActiveStep(nominationsOpen ? 'candidatos' : election.status === 'open' ? 'votacao' : steps[autoCurrentIndex]?.key || null);
      return;
    }
    setActiveStep(previous => {
      const index = steps.findIndex(step => step.key === previous);
      return index >= 0 && index <= autoCurrentIndex ? previous : steps[autoCurrentIndex]?.key || null;
    });
  }, [id, read.hasSnapshot, election?.id, election?.status, currentRound, nominationsOpen, steps, autoCurrentIndex]);

  const selectedIndex = steps.findIndex(step => step.key === activeStep);
  const currentStepKey = selectedIndex >= 0 && selectedIndex <= autoCurrentIndex
    ? activeStep : steps[autoCurrentIndex]?.key;
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey);

  useEffect(() => {
    if (!read.hasSnapshot || !currentStepKey) return;
    if (previousStepRef.current && previousStepRef.current !== currentStepKey) {
      stepContentRef.current?.focus({ preventScroll: true });
      stepContentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    previousStepRef.current = currentStepKey;
  }, [currentStepKey, read.hasSnapshot]);

  if (!read.hasSnapshot || !election) {
    return (
      <AppLayout width="wide">
        {read.error ? <QueryErrorState message="Não foi possível consultar a eleição e suas etapas." onRetry={fetchAll} retrying={read.loading} /> : <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>}
      </AppLayout>
    );
  }

  const statusLabel: Record<string, string> = { draft: 'Rascunho', open: 'Em Votação', finished: 'Finalizada' };
  const isDraft = election.status === 'draft';
  const devicesLocked = election.status === 'finished';

  const summaries: Record<string, string> = {
    candidatos: `${currentCandidates.length} ${electionType === 'camisa' ? 'modelo(s)' : 'candidato(s)'} cadastrado(s)`,
    presenca: `${attendance.filter(person => person.present).length} de ${attendance.length} presentes${completion.presenca ? ' · chamada confirmada' : ''}`,
    dispositivos: `${devices.length} dispositivo(s) cadastrado(s)`,
    votacao: nominationsOpen ? 'Novas indicações · votos ainda fechados' : election.status === 'finished' ? 'Votação concluída' : election.status === 'open' ? 'Votação em andamento' : 'Confira tudo e abra a votação',
  };

  const stepIcons: Record<string, JSX.Element> = {
    candidatos: <UserCheck className="h-4 w-4" />,
    presenca: <Users className="h-4 w-4" />,
    dispositivos: <Monitor className="h-4 w-4" />,
    votacao: <Vote className="h-4 w-4" />,
  };

  const stepTitles: Record<string, string> = {
    candidatos: electionType === 'camisa' ? 'Modelos' : nominationsOpen ? `Indicações · ${currentRound}º escrutínio` : 'Candidatos',
    presenca: 'Chamada de Presença',
    dispositivos: 'Dispositivos Fixos',
    votacao: election.status === 'open' && !nominationsOpen ? 'Votação em andamento' : `Iniciar ${currentRound}º escrutínio`,
  };

  const handlePersonalDevices = async () => {
    if (modeInFlight.current || !isDraft) return;
    modeInFlight.current = true; setChangingMode(true);
    try {
      const { data, error } = await supabase.from('elections').update({ voting_mode: 'individual' })
        .eq('id', election.id).eq('status', 'draft').select('id').single();
      if (error || !data) throw error || new Error('A votação mudou.');
      await fetchAll();
      setActiveStep('votacao');
    } catch {
      toast({ title: 'Não foi possível mudar o modo de votação', description: 'Tente novamente antes de continuar.', variant: 'destructive' });
    } finally { modeInFlight.current = false; setChangingMode(false); }
  };

  const renderStepContent = (key: string) => {
    switch (key) {
      case 'candidatos':
        return (
          <CandidateForm
            key={`${election.id}:${currentRound}`}
            electionId={election.id}
            candidates={currentCandidates}
            onRefresh={fetchAll}
            disabled={(!isDraft && !nominationsOpen) || !completion.presenca}
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
          <div className="space-y-4">
          {isDraft && <div className="rounded-lg border border-border p-3 space-y-2"><p className="text-sm">Se cada participante votar pelo próprio navegador, não é necessário cadastrar uma urna fixa.</p><Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={changingMode} onClick={() => void handlePersonalDevices()}>{changingMode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Usar apenas celulares</Button></div>}
          <DeviceRegistration
            electionId={election.id}
            devices={devices}
            onRefresh={fetchAll}
            disabled={devicesLocked || changingMode}
          />
          </div>
        );
      case 'votacao':
        return (
          <VotingPanel
            key={`${election.id}:${election.current_round || 1}`}
            electionId={election.id}
            electionName={election.name}
            status={election.status}
            totalPresent={election.total_present}
            votingMode={votingMode}
            devices={devices}
            candidates={candidates}
            election={election as any}
            onRefresh={fetchAll}
          />
        );
    }
  };

  const handleStepClick = (idx: number) => {
    if (idx <= autoCurrentIndex) setActiveStep(steps[idx].key);
  };

  return (
    <AppLayout width="wide">
      {read.error && <QueryErrorState message="Não foi possível atualizar a eleição e suas etapas." onRetry={fetchAll} retrying={read.loading} hasPreviousData />}
      <header className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Voltar às eleições" onClick={() => navigate('/eleicoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 basis-[calc(100%_-_4rem)] space-y-1 sm:basis-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{sequenceStep ? `Diretoria UMP · Cargo ${sequenceStep.index + 1} de ${UMP_POSITIONS.length}` : 'Sala de votação'}</p>
            <h1 className="break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{election.position}</h1>
          </div>
          <Badge variant={election.status === 'open' ? 'default' : 'secondary'} className="shrink-0 gap-1 self-start">
            {(election.status === 'draft' || nominationsOpen) && <Pencil className="h-3 w-3" />}{nominationsOpen ? 'Indicações abertas' : statusLabel[election.status]}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{election.name}</p>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-3">
          <p className="min-w-0 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {nominationsOpen ? `${currentRound}º escrutínio · indicações abertas · votos fechados` : election.status === 'finished' ? 'Votação concluída' : election.status === 'open'
              ? `${election.current_round || 1}º escrutínio · ${election.total_present} presentes`
              : <><span className="font-semibold text-foreground">Etapa {(currentIndex >= 0 ? currentIndex : autoCurrentIndex) + 1} de {steps.length}</span> · {stepTitles[currentStepKey || '']}</>}
          </p>
          <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
            <DialogTrigger asChild><Button variant="outline" className="gap-2 px-3 text-xs sm:text-sm"><ListChecks className="h-4 w-4" />Etapas e opções</Button></DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Etapas e opções</DialogTitle>
                <DialogDescription>{election.status === 'finished' ? 'Consulte a chamada, os candidatos e as urnas desta votação.' : 'Consulte ou revise uma etapa disponível. A votação mantém os dados já salvos.'}</DialogDescription>
              </DialogHeader>
              <nav aria-label="Etapas da eleição" className="space-y-2">
                {steps.filter(step => election.status !== 'finished' || step.key !== 'votacao').map((step, index) => {
                  const done = completion[step.key as keyof typeof completion];
                  const available = election.status === 'finished' || index <= autoCurrentIndex;
                  const selected = step.key === currentStepKey;
                  return <button key={step.key} type="button" disabled={!available} aria-current={selected ? 'step' : undefined}
                    onClick={() => { handleStepClick(index); if (election.status !== 'finished') setOptionsOpen(false); }}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors motion-reduce:transition-none disabled:opacity-50 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{done ? <Check className="h-4 w-4" /> : available ? stepIcons[step.key] : <Lock className="h-4 w-4" />}</span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{stepTitles[step.key]}</span><span className="block text-xs leading-relaxed text-muted-foreground">{done ? summaries[step.key] : selected ? 'Etapa atual' : 'Pendente'}</span></span>
                    {available && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>;
                })}
              </nav>
              {election.status === 'finished' && currentStepKey && currentStepKey !== 'votacao' && <section className="border-t border-border pt-4" aria-label={`Consulta: ${stepTitles[currentStepKey]}`}>{renderStepContent(currentStepKey)}</section>}
              {sequenceStep && <section className="space-y-3 border-t border-border pt-4" aria-label="Roteiro da diretoria UMP">
                <h3 className="text-sm font-semibold">Diretoria UMP · 5 cargos</h3>
                <ol className="space-y-2 text-sm">{UMP_POSITIONS.map((position, index) => <li key={position} className={`flex items-center gap-2 ${index === sequenceStep.index ? 'font-semibold text-primary' : 'text-muted-foreground'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{index + 1}</span>{position}</li>)}</ol>
                <p className="text-xs leading-relaxed text-muted-foreground">Roteiro salvo neste navegador. Os resultados permanecem na lista de eleições.</p>
              </section>}
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {nominationsOpen && <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">Novas indicações para o {currentRound}º escrutínio</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">Cadastre os indicados desta rodada e inicie os votos quando estiver pronto. A chamada, as urnas e o histórico anterior foram preservados.</p>
      </div>}
      {election.status !== 'finished' && currentStepKey && (
        <div ref={stepContentRef} tabIndex={-1} aria-label={stepTitles[currentStepKey]} className="scroll-mt-4 focus:outline-none">
        <ElectionStepCard
          state="active"
          icon={stepIcons[currentStepKey]}
          title={stepTitles[currentStepKey]}
          summary={currentStepKey === 'votacao' ? undefined : summaries[currentStepKey]}
          onAdvance={steps[currentIndex + 1] ? () => setActiveStep(steps[currentIndex + 1].key) : undefined}
          canAdvance={completion[currentStepKey as keyof typeof completion]}
          advanceLabel={steps[currentIndex + 1] ? `Avançar: ${stepTitles[steps[currentIndex + 1].key]}` : undefined}
          isLastStep={currentIndex === steps.length - 1}
        >
          {renderStepContent(currentStepKey)}
        </ElectionStepCard>
        </div>
      )}

      {election.status === 'finished' && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
          <div className="mb-4"><NextElectionDialog key={election.id} election={election} attendance={attendance} /></div>
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
          <div className="mb-4"><ElectionReportDownload electionId={election.id} /></div>
          <ResultPanel
            electionId={election.id}
            totalPresent={election.total_present}
            candidates={candidates}
            election={election as any}
          />
        </div>
      )}
    </AppLayout>
  );
}
