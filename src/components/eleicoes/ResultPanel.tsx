import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, CheckCircle, Medal, Users, FileX, AlertTriangle } from 'lucide-react';

interface ResultPanelProps {
  electionId: string;
  totalPresent: number;
  candidates: { id: string; name: string; photo_url: string | null; birth_date?: string | null }[];
  election?: { seats_count?: number; current_round?: number; majority_rule?: string };
}

export function ResultPanel({ electionId, totalPresent, candidates, election }: ResultPanelProps) {
  const [roundResults, setRoundResults] = useState<{
    round: number;
    totalBallots: number;
    blankVotes: number;
    electedIds: string[];
    rows: { candidate_id: string; count: number }[];
    hasTie: boolean;
  }[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from('election_votes' as any)
        .select('*')
        .eq('election_id', electionId);

      if (data) {
        const votes = data as any[];
        const maxRound = Math.max(election?.current_round || 1, ...votes.map((v) => v.round_number || 1));
        const alreadyElected = new Set<string>();
        const seatsCount = election?.seats_count || 1;
        const MAX_ROUNDS = 3;

        const parsed = Array.from({ length: maxRound }, (_, index) => {
          const round = index + 1;
          const roundVotes = votes.filter((v) => (v.round_number || 1) === round);
          const totalBallots = new Set(roundVotes.map((v) => v.ballot_id || v.id)).size;

          const blankVotes = roundVotes.filter((v) => v.is_blank === true).length;

          const counts = roundVotes.reduce((acc: Record<string, number>, v: any) => {
            if (!v.is_blank && v.candidate_id && !alreadyElected.has(v.candidate_id))
              acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
            return acc;
          }, {});

          const rows = Object.entries(counts)
            .map(([candidate_id, count]) => ({ candidate_id, count: count as number }))
            .sort((a, b) => b.count - a.count);

          const needed = Math.floor(totalBallots / 2) + 1;
          const vagas = Math.max(0, seatsCount - alreadyElected.size);
          let electedIds: string[] = [];
          let hasTie = false;

          if (round === 1) {
            const aprovados = rows.filter((r) =>
              election?.majority_rule === 'absolute_50' ? r.count >= needed : true
            );
            const cutoffCount = aprovados[vagas - 1]?.count;
            const nextCount = aprovados[vagas]?.count;
            const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;

            if (!tieAtCutoff) {
              electedIds = aprovados.slice(0, vagas).map((r) => r.candidate_id);
            } else {
              electedIds = aprovados
                .filter((r) => r.count > cutoffCount)
                .map((r) => r.candidate_id);
              hasTie = true;
            }
          } else if (round < MAX_ROUNDS) {
            // 2º escrutínio: MAIORIA SIMPLES — top N com mais votos
            const cutoffCount = rows[vagas - 1]?.count;
            const nextCount = rows[vagas]?.count;
            const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;

            if (!tieAtCutoff) {
              electedIds = rows.slice(0, vagas).map((r) => r.candidate_id);
            } else {
              hasTie = true;
            }
          } else {
            const cutoffCount = rows[vagas - 1]?.count;
            const nextCount = rows[vagas]?.count;
            const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;

            if (!tieAtCutoff) {
              electedIds = rows.slice(0, vagas).map((r) => r.candidate_id);
            } else {
              const clearlyElected = rows
                .filter((r) => r.count > cutoffCount)
                .map((r) => r.candidate_id);

              const vagasRestantes = vagas - clearlyElected.length;

              const tiedIds = rows
                .filter((r) => r.count === cutoffCount)
                .map((r) => r.candidate_id);

              const tiedByAge = tiedIds
                .map((id) => candidates.find((c) => c.id === id))
                .filter(Boolean)
                .sort((a, b) => {
                  if (!a?.birth_date) return 1;
                  if (!b?.birth_date) return -1;
                  return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
                })
                .slice(0, vagasRestantes)
                .map((c) => c!.id);

              electedIds = [...clearlyElected, ...tiedByAge];
              hasTie = tiedIds.length > vagasRestantes;
            }
          }

          electedIds.forEach((id) => alreadyElected.add(id));
          return { round, totalBallots, blankVotes, electedIds, rows, hasTie };
        });
        setRoundResults(parsed);
      }
    };
    fetchResults();

    const channel = supabase
      .channel(`result-${electionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'election_votes',
        filter: `election_id=eq.${electionId}`,
      }, fetchResults)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [electionId, election?.current_round, election?.majority_rule, election?.seats_count]);

  const allElected = roundResults.flatMap((r) => r.electedIds);
  const seatsCount = election?.seats_count || 1;
  const isValid = roundResults.length > 0 && allElected.length >= seatsCount;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-foreground">Resultado da Eleição</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {allElected.length}/{seatsCount} vaga(s) preenchida(s)
          </span>
          {isValid ? (
            <Badge className="bg-success text-success-foreground gap-1">
              <CheckCircle className="h-3 w-3" /> Válido
            </Badge>
          ) : (
            <Badge variant="destructive">Inválido</Badge>
          )}
        </div>
      </div>

      {/* Eleitos em destaque */}
      {allElected.length > 0 && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">
              {allElected.length === 1 ? 'Eleito' : 'Eleitos'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allElected.map((id) => {
              const c = candidates.find((x) => x.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg bg-background border border-success/30 px-3 py-2 shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {c?.name || 'Desconhecido'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Escrutínios */}
      <div className="space-y-3">
        {roundResults.map((roundResult) => {
          const needed = Math.floor(roundResult.totalBallots / 2) + 1;
          const isCurrentRound = roundResult.round === (election?.current_round || 1);
          return (
            <div
              key={roundResult.round}
              className="space-y-3 rounded-xl border border-border/60 bg-background p-4"
            >
              {/* Header do escrutínio */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {roundResult.round}º Escrutínio
                  </span>
                  {isCurrentRound && (
                    <Badge variant="secondary" className="text-[10px]">
                      Atual
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {roundResult.totalBallots} cédulas
                  </span>
                  <span>
                    {roundResult.round === 1
                      ? `Maioria necessária: ${needed} votos (50%+1)`
                      : roundResult.round === 2
                      ? `2º escrutínio — maioria simples entre os top candidatos do 1º`
                      : `3º escrutínio final — empate desfeito pelo mais velho`}
                  </span>
                </div>
              </div>

              {/* Candidatos */}
              <div className="space-y-2">
                {roundResult.rows.map((r, i) => {
                  const candidate = candidates.find((c) => c.id === r.candidate_id);
                  const pct = roundResult.totalBallots > 0
                    ? Math.round((r.count / roundResult.totalBallots) * 100)
                    : 0;
                  const elected = roundResult.electedIds.includes(r.candidate_id);
                  const isLeading = i === 0;
                  return (
                    <div key={r.candidate_id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {elected ? (
                            <CheckCircle className="h-4 w-4 text-success shrink-0" />
                          ) : isLeading ? (
                            <Medal className="h-4 w-4 text-warning shrink-0" />
                          ) : (
                            <span className="w-4 text-center text-xs text-muted-foreground shrink-0">
                              {i + 1}
                            </span>
                          )}
                          <span
                            className={`text-sm truncate ${
                              elected || isLeading ? 'font-semibold text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {candidate?.name || 'Desconhecido'}
                          </span>
                          {elected && (
                            <span className="text-[10px] font-medium text-success bg-success/15 px-1.5 py-0.5 rounded-full shrink-0">
                              ✓ Eleito
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span className="font-semibold text-foreground tabular-nums">
                            {r.count} votos
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      {/* Barra de progresso */}
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            elected
                              ? 'bg-success'
                              : isLeading
                              ? 'bg-primary'
                              : 'bg-muted-foreground/40'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Votos em branco */}
              {roundResult.blankVotes > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2 mt-2">
                  <span>Votos em branco</span>
                  <span className="font-medium">{roundResult.blankVotes}</span>
                </div>
              )}

              {/* Empate */}
              {roundResult.hasTie && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 p-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span className="text-foreground font-medium">
                    {roundResult.round < 3
                      ? 'Empate — será resolvido no próximo escrutínio'
                      : 'Empate no 3º escrutínio — desempate aplicado pelo critério de idade (mais velho eleito)'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50 text-xs">
        <span className="text-foreground">
          Total presentes: <strong>{totalPresent}</strong>
        </span>
        {roundResults.reduce((sum, r) => sum + r.blankVotes, 0) > 0 && (
          <span className="text-muted-foreground text-sm">
            Total de votos em branco: <strong>{roundResults.reduce((sum, r) => sum + r.blankVotes, 0)}</strong>
          </span>
        )}
        <span className={allElected.length >= seatsCount ? 'text-success font-medium' : 'text-warning font-medium'}>
          {allElected.length >= seatsCount
            ? '✅ Todas as vagas preenchidas'
            : `⚠️ ${seatsCount - allElected.length} vaga(s) em aberto`}
        </span>
      </div>
    </div>
  );
}
