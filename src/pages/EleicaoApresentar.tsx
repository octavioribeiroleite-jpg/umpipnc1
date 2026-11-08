import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2, Radio, ShieldCheck, Users, CheckCircle2, Vote } from 'lucide-react';
import { ResultPanel } from '@/components/eleicoes/ResultPanel';
import { useBufferedVoteCount } from '@/hooks/useBufferedVoteCount';
import logo from '@/assets/logo-ipnc.png';

interface Election {
  id: string;
  name: string;
  position: string;
  status: string;
  total_present: number;
  show_result: boolean;
  nominations_open?: boolean;
  seats_count?: number;
  current_round?: number;
  majority_rule?: string;
}

interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  photo_urls?: string[] | null;
  birth_date?: string | null;
}

export default function EleicaoApresentar() {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const { loading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead(id || 'missing');

  const showResult = !!election?.show_result;
  const finished = election?.status === 'finished';
  const nominationsOpen = !!election?.nominations_open;

  const { displayedCount, totalPresent: countTotalPresent, hasSnapshot: hasCountSnapshot, isError: countError, loading: countLoading, retry: retryCount } = useBufferedVoteCount(
    id,
    election?.current_round || 1,
  );

  const fetchAll = useCallback(() => runRead(async () => {
    if (!id) throw new Error('Eleição indisponível');
    const [electionResult, candidatesResult] = await Promise.all([
      supabase.from('elections').select('*').eq('id', id).single(),
      supabase.from('election_candidates').select('*').eq('election_id', id).order('display_order'),
    ]);
    if (electionResult.error) throw electionResult.error;
    if (candidatesResult.error) throw candidatesResult.error;
    if (!electionResult.data) throw new Error('Eleição indisponível');
    return () => {
      setElection(electionResult.data);
      setCandidates((candidatesResult.data || []).map(candidate => ({
        ...candidate,
        photo_urls: Array.isArray(candidate.photo_urls) ? candidate.photo_urls.filter((url): url is string => typeof url === 'string') : [],
      })));
    };
  }), [id, runRead]);

  useEffect(() => {
    void fetchAll();
    const channel = supabase.channel(`presentation-election-${id}`)
      .on<Tables<'elections'>>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'elections', filter: `id=eq.${id}` }, payload => {
        // Apply an authoritative publication/status change immediately, including
        // hiding a result again, even when the following read cannot complete.
        if (payload.new.id === id) setElection(payload.new);
        void fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchAll]);

  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar a eleição para apresentação." onRetry={() => void fetchAll()} retrying={loading} hasPreviousData={hasSnapshot} /> : null;
  if (!hasSnapshot || !election) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center p-4">
        {readFailure || <div role="status" aria-label="Consultando eleição"><Loader2 className="h-12 w-12 animate-spin text-muted-foreground" /></div>}
      </main>
    );
  }

  const totalPresent = countTotalPresent ?? election.total_present;
  const remaining = Math.max(0, totalPresent - displayedCount);
  const excess = Math.max(0, displayedCount - totalPresent);
  const pct = totalPresent > 0 ? Math.min(100, (displayedCount / totalPresent) * 100) : 0;
  const percentage = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(pct);
  const participationComplete = totalPresent > 0 && displayedCount === totalPresent;

  return (
    <div className="flex min-h-dvh flex-col bg-muted/25">
      <header className="border-b border-border/70 bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:py-5">
          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1 sm:gap-5">
            <img src={logo} alt="Marca IPNC" className="h-10 w-auto shrink-0 object-contain sm:h-14" />
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary sm:text-sm">Acompanhamento da votação</p>
              <h1 className="text-[clamp(1.6rem,3vw,3rem)] font-bold leading-tight [overflow-wrap:anywhere]">{election.position}</h1>
              <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere] sm:text-base">{election.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{election.current_round || 1}º escrutínio</span>
            <StatusBadge status={election.status} nominationsOpen={nominationsOpen} />
          </div>
        </div>
      </header>

      {readFailure && <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-8">{readFailure}</div>}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-4 py-6 sm:px-8 lg:py-10">
        {showResult ? <ResultPanel electionId={election.id} totalPresent={election.total_present} candidates={candidates} election={election} presentation /> : (
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm" aria-label="Participação anônima">
            <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
              <div className="relative flex min-w-0 flex-col justify-center bg-sidebar px-5 py-8 text-sidebar-foreground sm:px-10 sm:py-10 lg:min-h-[480px] lg:py-14">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground/80 sm:text-base"><Vote className="h-5 w-5" /> Participação neste escrutínio</span>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-sidebar-foreground/80">{countError ? 'Última contagem confirmada' : 'Contagem exata'}</span>
                </div>
                {countError && <div className="mb-5 rounded-xl bg-background p-3 text-foreground"><QueryErrorState message="Não foi possível atualizar a participação." onRetry={retryCount} retrying={countLoading} hasPreviousData={hasCountSnapshot} /></div>}
                {!hasCountSnapshot ? <div className="flex min-h-52 flex-col items-center justify-center gap-4" role="status"><Loader2 className="h-8 w-8 animate-spin" /><p>{countError ? 'Contagem indisponível' : 'Consultando participação…'}</p></div> : <>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-label={`${displayedCount} de ${totalPresent} votos recebidos`}>
                    <p className="font-bold leading-none tracking-tighter tabular-nums [overflow-wrap:anywhere] text-[clamp(5.5rem,15vw,12rem)]">{displayedCount}</p>
                    <p className="text-2xl font-medium text-sidebar-foreground/60 tabular-nums sm:text-4xl">/ {totalPresent}</p>
                  </div>
                  <p className="mt-3 text-base text-sidebar-foreground/80 sm:text-xl">{displayedCount === 1 ? 'voto recebido' : 'votos recebidos'}</p>
                  <div className="mt-7 space-y-3 sm:mt-9">
                    <div className="h-3 overflow-hidden rounded-full bg-white/15 sm:h-4" role="progressbar" aria-label="Participação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${displayedCount} de ${totalPresent} votos recebidos`}>
                      <div className="h-full rounded-full bg-emerald-200 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-sidebar-foreground/80 sm:text-lg">
                      <span className="font-semibold tabular-nums">{percentage}% de participação</span>
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" />{totalPresent} presentes</span>
                    </div>
                  </div>
                </>}
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-6 p-5 sm:p-8 lg:gap-8 lg:p-10">
                {hasCountSnapshot && <div>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${participationComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>{participationComplete ? <CheckCircle2 className="h-6 w-6" /> : <Users className="h-6 w-6" />}</div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{totalPresent === 0 ? 'Chamada pendente' : nominationsOpen ? 'Indicações abertas' : excess ? 'Conferência necessária' : finished ? 'Votação encerrada' : participationComplete ? 'Participação completa' : 'Aguardando participação'}</p>
                  <p className="mt-2 text-[clamp(1.8rem,3vw,3.2rem)] font-bold leading-tight tabular-nums [overflow-wrap:anywhere]">{totalPresent === 0 ? 'Aguardando a chamada' : nominationsOpen ? 'Aguardando a mesa' : excess ? `${excess} ${excess === 1 ? 'voto excedente' : 'votos excedentes'}` : remaining === 0 ? 'Todos votaram' : `${remaining === 1 ? 'Falta' : 'Faltam'} ${remaining} ${remaining === 1 ? 'voto' : 'votos'}`}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{totalPresent === 0 ? 'A mesa precisa confirmar os presentes para acompanhar a participação.' : nominationsOpen ? 'A lista de indicados está sendo preparada. Os votos ainda estão fechados. Aguarde o mesário iniciar este escrutínio.' : finished ? 'Aguarde a liberação do resultado pela mesa.' : participationComplete ? 'A mesa pode conferir a contagem e conduzir a apuração.' : excess ? 'A mesa precisa conferir a chamada e as cédulas recebidas.' : 'A votação permanece aberta para quem ainda não participou.'}</p>
                </div>}
                <div className="flex items-start gap-3 border-t border-border pt-5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div><h2 className="text-sm font-semibold">O voto permanece sigiloso</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Esta tela mostra apenas a participação. Os resultados aparecem após a liberação autorizada.</p></div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status, nominationsOpen = false }: { status: string; nominationsOpen?: boolean }) {
  if (nominationsOpen) return <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"><Users className="h-4 w-4" />Indicações abertas</span>;
  if (status === 'open') {
    return (
      <span className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full bg-success/15 border border-success/40 text-success text-sm lg:text-base font-medium shrink-0">
        <Radio className="h-4 w-4 animate-pulse" />
        Votação aberta
      </span>
    );
  }
  if (status === 'finished') {
    return (
      <span className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full bg-muted border border-border/60 text-muted-foreground text-sm lg:text-base font-medium shrink-0">
        Encerrada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full bg-muted border border-border/60 text-muted-foreground text-sm lg:text-base font-medium shrink-0">
      Aguardando
    </span>
  );
}
