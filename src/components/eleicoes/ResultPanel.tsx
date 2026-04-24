import { useEffect, useState } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, CheckCircle, UserCheck } from 'lucide-react';

interface ResultPanelProps {
  electionId: string;
  totalPresent: number;
  candidates: { id: string; name: string; photo_url: string | null }[];
  election?: { seats_count?: number; current_round?: number; majority_rule?: string };
}

export function ResultPanel({ electionId, totalPresent, candidates, election }: ResultPanelProps) {
  const [roundResults, setRoundResults] = useState<{ round: number; totalBallots: number; blankVotes: number; electedIds: string[]; rows: { candidate_id: string; count: number }[] }[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from('election_votes' as any)
        .select('*')
        .eq('election_id', electionId);

      if (data) {
        const votes = (data as any[]);
        const maxRound = Math.max(election?.current_round || 1, ...votes.map((v) => v.round_number || 1));
        const alreadyElected = new Set<string>();
        const seatsCount = election?.seats_count || 1;
        const parsed = Array.from({ length: maxRound }, (_, index) => {
          const round = index + 1;
          const roundVotes = votes.filter((v) => (v.round_number || 1) === round);
          const totalBallots = new Set(roundVotes.map((v) => v.ballot_id || v.id)).size;
          // Cada marcação em branco/nulo conta individualmente, não por cédula.
          const blankVotes = roundVotes.filter((v) => v.is_blank).length;
          const counts = roundVotes.reduce((acc: Record<string, number>, v: any) => {
            if (!v.is_blank && v.candidate_id && !alreadyElected.has(v.candidate_id)) acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
            return acc;
          }, {});
          const rows = Object.entries(counts)
            .map(([candidate_id, count]) => ({ candidate_id, count: count as number }))
            .sort((a, b) => b.count - a.count);
          const needed = Math.floor(totalBallots / 2) + 1;
          const electedIds = rows
            .filter((r) => election?.majority_rule === 'absolute_50' ? r.count >= needed : true)
            .slice(0, Math.max(0, seatsCount - alreadyElected.size))
            .map((r) => r.candidate_id);
          electedIds.forEach((candidateId) => alreadyElected.add(candidateId));
          return { round, totalBallots, blankVotes, electedIds, rows };
        });
        setRoundResults(parsed);
      }
    };
    fetchResults();
  }, [electionId, election?.current_round, election?.majority_rule, election?.seats_count]);

  const currentRound = roundResults[roundResults.length - 1];
  const isValid = (currentRound?.totalBallots || 0) === totalPresent;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-warning" />
        <h3 className="font-semibold text-foreground">Resultado</h3>
        {isValid ? (
          <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Válido</Badge>
        ) : (
          <Badge variant="destructive">Inválido</Badge>
        )}
      </div>

      <div className="space-y-2">
        {roundResults.map((roundResult) => (
          <div key={roundResult.round} className="space-y-2 rounded-xl border border-border/60 bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <strong>{roundResult.round}º escrutínio</strong>
              <span className="text-muted-foreground">Cédulas: {roundResult.totalBallots} • Maioria: {Math.floor(roundResult.totalBallots / 2) + 1}</span>
            </div>
            {roundResult.rows.map((r, i) => {
          const candidate = candidates.find((c) => c.id === r.candidate_id);
          const pct = roundResult.totalBallots > 0 ? Math.round((r.count / roundResult.totalBallots) * 100) : 0;
          const elected = roundResult.electedIds.includes(r.candidate_id);
          return (
            <AppCard key={r.candidate_id} noPadding>
              <div className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {candidate?.photo_url ? (
                    <img src={candidate.photo_url} alt={candidate?.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {(i === 0 || elected) && <Trophy className="h-4 w-4 text-warning" />}
                    <span className="font-medium text-foreground">{candidate?.name || 'Desconhecido'}</span>
                    {elected && <Badge className="bg-success text-success-foreground">Eleito</Badge>}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1.5">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">{r.count}</p>
                  <p className="text-xs text-muted-foreground">{pct}%</p>
                </div>
              </div>
            </AppCard>
          );
            })}
            {roundResult.blankVotes > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <span className="font-medium text-foreground">Brancos / Nulos</span>
                <strong>{roundResult.blankVotes}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-2 border-t border-border/50 text-sm text-foreground">
        <span>Cédulas do escrutínio atual: <strong>{currentRound?.totalBallots || 0}</strong></span>
        <span>Total presentes: <strong>{totalPresent}</strong></span>
      </div>
    </div>
  );
}
