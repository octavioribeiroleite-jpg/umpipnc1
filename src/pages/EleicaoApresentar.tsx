import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2, Radio } from 'lucide-react';
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

  const { displayedCount, hasSnapshot: hasCountSnapshot, isError: countError, loading: countLoading, retry: retryCount } = useBufferedVoteCount(
    id,
    election?.total_present || 0,
    finished, // ao terminar, libera contador real
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

  const totalPresent = election.total_present;
  const pct = totalPresent > 0 ? Math.min(100, (displayedCount / totalPresent) * 100) : 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            <img src={logo} alt="Renovo IPNC" className="h-10 lg:h-14 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold min-w-0 whitespace-normal break-words">{election.name}</h1>
              <p className="text-sm lg:text-base text-muted-foreground min-w-0 whitespace-normal break-words">
                {election.position}
              </p>
            </div>
          </div>
          <StatusBadge status={election.status} />
        </div>
      </header>

      {readFailure && <div className="mx-auto w-full max-w-6xl px-4 pt-4">{readFailure}</div>}

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        {showResult ? (
          <div className="w-full max-w-5xl lg:[&_.text-xs]:text-base lg:[&_.text-sm]:text-lg lg:[&_.text-base]:text-xl lg:[&_h3]:text-2xl lg:[&_.h-24]:h-40 lg:[&_.w-24]:w-40">
            <ResultPanel
              electionId={election.id}
              totalPresent={election.total_present}
              candidates={candidates}
              election={election}
            />
          </div>
        ) : (
          /* PROGRESS VIEW (anonymous) */
          <div className="w-full max-w-5xl">
            <div className="rounded-2xl bg-card border border-border shadow-sm px-4 py-8 sm:px-12 sm:py-14 lg:px-20 lg:py-20 text-center space-y-8 sm:space-y-12 lg:space-y-16">
              {countError && <QueryErrorState message="Não foi possível atualizar a contagem de votos." onRetry={retryCount} retrying={countLoading} hasPreviousData={hasCountSnapshot} />}
              {!hasCountSnapshot ? <p role="status" className="text-lg text-muted-foreground">{countError ? 'Contagem indisponível' : 'Consultando contagem…'}</p> : <>
              {/* Status amigável */}
              <p className="text-base sm:text-xl lg:text-2xl font-medium text-muted-foreground tracking-wide uppercase">
                {finished
                  ? 'Votação encerrada'
                  : displayedCount === 0
                    ? 'Aguardando votos'
                    : 'Votação em andamento'}
              </p>

              {/* Contador gigante */}
              <div className="space-y-3">
                <p
                  key={displayedCount}
                  className="font-bold tracking-tight tabular-nums leading-none text-primary animate-fade-up"
                  style={{
                    fontSize: 'clamp(4rem, 16vw, 14rem)', overflowWrap: 'anywhere',

                  }}
                >
                  {displayedCount}
                </p>
                <p className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-muted-foreground/80 tabular-nums">
                  de {totalPresent}
                </p>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-4">
                <div className="w-full h-5 sm:h-7 lg:h-8 rounded-full bg-muted/60 overflow-hidden border border-border/60 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Infos amigáveis */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-base sm:text-lg lg:text-2xl">
                  <span className="font-semibold text-foreground tabular-nums">
                    {Math.round(pct)}% concluído
                  </span>
                  {!finished && totalPresent - displayedCount > 0 && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-muted-foreground tabular-nums">
                        {totalPresent - displayedCount}{' '}
                        {totalPresent - displayedCount === 1
                          ? 'voto restante'
                          : 'votos restantes'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              </>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
