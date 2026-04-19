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
              <div className="space-y-2 lg:space-y-3">
                {results.map((r, i) => {
                  const c = candidates.find((c) => c.id === r.candidate_id);
                  const candidatePct =
                    totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
                  return (
                    <div
                      key={r.candidate_id}
                      className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl bg-card border border-border/60 shadow-sm"
                    >
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm lg:text-base shrink-0">
                        {i + 1}
                      </div>
                      <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                        {c?.photo_url ? (
                          <img
                            src={c.photo_url}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserCheck className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base lg:text-lg truncate">
                          {c?.name || 'Desconhecido'}
                        </p>
                        <div className="w-full bg-muted rounded-full h-2 lg:h-2.5 mt-1.5">
                          <div
                            className="bg-primary rounded-full h-full transition-all"
                            style={{ width: `${candidatePct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl lg:text-2xl font-bold">{r.count}</p>
                        <p className="text-xs lg:text-sm text-muted-foreground">
                          {candidatePct}%
                        </p>
                      </div>
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
          <div className="w-full max-w-3xl text-center space-y-8 lg:space-y-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-sm">
              <Lock className="h-4 w-4" />
              Acompanhamento anônimo • atualiza a cada 5 votos
            </div>

            <div className="space-y-3 lg:space-y-4">
              <p className="text-lg lg:text-2xl text-muted-foreground">Votos confirmados</p>
              <p className="text-7xl lg:text-9xl font-bold tracking-tight tabular-nums">
                {displayedCount}
                <span className="text-muted-foreground/60 text-5xl lg:text-7xl">
                  {' '}
                  / {totalPresent}
                </span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-6 lg:h-8 rounded-full bg-muted overflow-hidden border border-border/60">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-base lg:text-lg text-muted-foreground">
                {Math.round(pct)}% concluído
              </p>
            </div>

            <p className="text-base lg:text-xl text-muted-foreground italic">
              {finished
                ? 'Votação encerrada — aguardando divulgação do resultado.'
                : election.status === 'open'
                  ? 'Aguardando votos…'
                  : 'Votação ainda não foi iniciada.'}
            </p>
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
