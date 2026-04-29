import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, UserCheck, CheckCircle, Radio, Lock } from 'lucide-react';
import { useBufferedVoteCount } from '@/hooks/useBufferedVoteCount';
import logo from '@/assets/logo-ipnc.png';

interface Election {
  id: string;
  name: string;
  position: string;
  status: string;
  total_present: number;
  show_result: boolean;
}

interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  photo_urls?: string[] | null;
}

function getCandidatePhoto(candidate: { photo_url?: string | null; photo_urls?: string[] | null }): string | null {
  if (Array.isArray(candidate.photo_urls) && candidate.photo_urls.length > 0) return candidate.photo_urls[0];
  return candidate.photo_url || null;
}

export default function EleicaoApresentar() {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<{ candidate_id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const showResult = !!election?.show_result;
  const finished = election?.status === 'finished';

  const { displayedCount } = useBufferedVoteCount(
    id,
    election?.total_present || 0,
    finished, // ao terminar, libera contador real
  );

  // Fetch election + candidates + realtime
  useEffect(() => {
    if (!id) return;

    const fetchAll = async () => {
      const [elRes, caRes] = await Promise.all([
        supabase.from('elections' as any).select('*').eq('id', id).single(),
        supabase
          .from('election_candidates' as any)
          .select('*')
          .eq('election_id', id)
          .order('display_order' as any),
      ]);
      if (elRes.data) setElection(elRes.data as any);
      if (caRes.data) setCandidates(caRes.data as any);
      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel(`presentation-election-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'elections', filter: `id=eq.${id}` },
        (payload: any) => setElection(payload.new),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Fetch results when revealed
  useEffect(() => {
    if (!id || !showResult) return;
    const fetchResults = async () => {
      const { data } = await supabase
        .from('election_votes' as any)
        .select('candidate_id')
        .eq('election_id', id);
      if (data) {
        const counts = (data as any[]).reduce((acc: Record<string, number>, v: any) => {
          acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
          return acc;
        }, {});
        const sorted = Object.entries(counts)
          .map(([candidate_id, count]) => ({ candidate_id, count: count as number }))
          .sort((a, b) => b.count - a.count);
        setResults(sorted);
      }
    };
    fetchResults();
  }, [id, showResult]);

  if (loading || !election) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPresent = election.total_present;
  const pct = totalPresent > 0 ? Math.min(100, (displayedCount / totalPresent) * 100) : 0;
  const totalVotes = results.reduce((s, r) => s + r.count, 0);
  const isValid = totalVotes === totalPresent;
  const winner = results[0];
  const winnerCandidate = winner ? candidates.find((c) => c.id === winner.candidate_id) : null;
  const needed = totalVotes > 0 ? Math.floor(totalVotes / 2) + 1 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-4 lg:py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            <img src={logo} alt="Renovo IPNC" className="h-10 lg:h-14 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl lg:text-3xl font-bold truncate">{election.name}</h1>
              <p className="text-sm lg:text-base text-muted-foreground truncate">
                {election.position}
              </p>
            </div>
          </div>
          <StatusBadge status={election.status} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        {showResult ? (
          /* RESULT VIEW */
          <div className="w-full max-w-5xl space-y-8 lg:space-y-12">
            {winnerCandidate && (
              <div className="text-center space-y-4 lg:space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/15 border border-warning/40 text-warning text-sm lg:text-base font-medium">
                  <Trophy className="h-4 w-4 lg:h-5 lg:w-5" />
                  Vencedor
                </div>
                <div className="flex flex-col items-center gap-4 lg:gap-6">
                  <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-full overflow-hidden bg-muted border-4 border-warning shadow-2xl">
                    {winnerCandidate.photo_url ? (
                      <img
                        src={winnerCandidate.photo_url}
                        alt={winnerCandidate.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCheck className="h-16 w-16 lg:h-24 lg:w-24 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl lg:text-5xl font-bold">{winnerCandidate.name}</h2>
                  <p className="text-lg lg:text-2xl text-muted-foreground">
                    {winner.count} {winner.count === 1 ? 'voto' : 'votos'} •{' '}
                    {totalVotes > 0 ? Math.round((winner.count / totalVotes) * 100) : 0}%
                  </p>
                </div>
              </div>
            )}

            {/* Ranking */}
            <div className="space-y-3">
              <h3 className="text-xl lg:text-2xl font-semibold text-center">Ranking completo</h3>
              <div className={`grid gap-4 ${
                results.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
                results.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
                results.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}>
                {results.map((r, i) => {
                  const c = candidates.find((x) => x.id === r.candidate_id);
                  const photo = c ? getCandidatePhoto(c) : null;
                  const candidatePct = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
                  const elected = needed > 0 && r.count >= needed;
                  const posEmoji = ['🥇', '🥈', '🥉'][i] || `${i + 1}º`;
                  const posLabel = ['1º', '2º', '3º'][i] || `${i + 1}º`;
                  return (
                    <div
                      key={r.candidate_id}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 shadow-md transition-all ${
                        elected
                          ? 'border-warning bg-warning/10 ring-2 ring-warning/30'
                          : i === 0
                          ? 'border-primary/60 bg-primary/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <span className="text-2xl">{posEmoji}</span>
                      <div className={`h-20 w-20 lg:h-24 lg:w-24 overflow-hidden rounded-full border-4 shadow-lg ${
                        elected ? 'border-warning' : i === 0 ? 'border-primary' : 'border-border'
                      }`}>
                        {photo ? (
                          <img src={photo} alt={c?.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-bold text-muted-foreground">
                            {c?.name?.charAt(0).toUpperCase() || <UserCheck className="h-8 w-8" />}
                          </div>
                        )}
                      </div>
                      <p className="text-center text-sm lg:text-base font-extrabold text-foreground leading-tight">
                        {c?.name || 'Desconhecido'}
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold">{posLabel} lugar</p>
                      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                        <span className="text-sm font-bold text-foreground">{r.count}</span>
                        <span className="text-xs text-muted-foreground">votos</span>
                        <span className="text-xs font-semibold text-primary">({candidatePct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full transition-all ${elected ? 'bg-warning' : i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                          style={{ width: `${candidatePct}%` }}
                        />
                      </div>
                      {elected && (
                        <span className="absolute -top-2 -right-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-extrabold text-warning-foreground shadow">
                          ✓ ELEITO
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation */}
            <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 pt-4 border-t border-border/40">
              <span className="text-sm lg:text-base">
                Total votos: <strong>{totalVotes}</strong>
              </span>
              <span className="text-sm lg:text-base">
                Total presentes: <strong>{totalPresent}</strong>
              </span>
              {isValid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 border border-success/40 text-success text-sm font-medium">
                  <CheckCircle className="h-4 w-4" /> Válido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 border border-destructive/40 text-destructive text-sm font-medium">
                  Diferença: {totalVotes - totalPresent}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* PROGRESS VIEW (anonymous) */
          <div className="w-full max-w-5xl">
            <div className="rounded-3xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl px-6 py-10 sm:px-12 sm:py-14 lg:px-20 lg:py-20 text-center space-y-8 sm:space-y-12 lg:space-y-16">
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
                    fontSize: 'clamp(5rem, 22vw, 14rem)',
                    textShadow:
                      '0 0 40px hsl(var(--primary) / 0.3), 0 4px 12px hsl(var(--primary) / 0.2)',
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
