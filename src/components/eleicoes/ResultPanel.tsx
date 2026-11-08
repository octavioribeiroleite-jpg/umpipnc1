import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useState } from 'react';
import { readElectionCount, type ElectionCountSnapshot } from '@/lib/election-completion';
import { calculateElectionRounds, type ElectionRoundResult } from '@/lib/election-results';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, CheckCircle, Users, AlertTriangle, ChevronDown } from 'lucide-react';

interface ResultPanelProps {
  electionId: string;
  totalPresent: number;
  candidates: { id: string; name: string; photo_url: string | null; photo_urls?: string[] | null; birth_date?: string | null }[];
  election?: { seats_count?: number; current_round?: number; majority_rule?: string };
  presentation?: boolean;
}

function getCandidatePhoto(candidate: { photo_url: string | null; photo_urls?: string[] | null }): string | null {
  if (Array.isArray(candidate.photo_urls) && candidate.photo_urls.length > 0) return candidate.photo_urls[0];
  return candidate.photo_url || null;
}

export function ResultPanel({ electionId, totalPresent, candidates, election, presentation = false }: ResultPanelProps) {
  const [countSnapshot, setCountSnapshot] = useState<ElectionCountSnapshot | null>(null);
  const [roundResults, setRoundResults] = useState<ElectionRoundResult[]>([]);

  const { seats_count, current_round, majority_rule } = election || {};
  const scope = JSON.stringify([electionId, seats_count, current_round, majority_rule, candidates.map(candidate => [candidate.id, candidate.birth_date])]);
  const { loading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead(scope);
  const fetchResults = useCallback(() => runRead(async () => {
    const snapshot = await readElectionCount(supabase, electionId);
    const results = calculateElectionRounds(snapshot.votes, candidates, { seats_count, current_round, majority_rule });
    return () => { setRoundResults(results); setCountSnapshot(snapshot); };
  }), [electionId, candidates, seats_count, current_round, majority_rule, runRead]);

  useEffect(() => {
    void fetchResults();
    const channel = supabase.channel(`result-${electionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_votes', filter: `election_id=eq.${electionId}` }, fetchResults)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_attendance', filter: `election_id=eq.${electionId}` }, fetchResults)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'elections', filter: `id=eq.${electionId}` }, fetchResults)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [electionId, fetchResults]);

  const countVerified = !!countSnapshot?.exact && !readError && countSnapshot.election.current_round === (current_round || 1) && countSnapshot.election.total_present === totalPresent;
  const allElected = countVerified ? roundResults.flatMap((r) => r.electedIds) : [];
  const seatsCount = election?.seats_count || 1;
  const isValid = roundResults.length > 0 && allElected.length >= seatsCount;

  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar os votos para apuração." onRetry={() => void fetchResults()} retrying={loading} hasPreviousData={hasSnapshot} /> : null;
  if (!hasSnapshot) return readFailure || <p role="status" className="py-8 text-center text-muted-foreground">Consultando resultado…</p>;

  return (
    <section className={`min-w-0 ${presentation ? 'space-y-6 text-lg' : 'space-y-4'}`} aria-label="Resultado da eleição">
      {readFailure}
      {!countVerified && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{readError ? 'Contagem não conferida. O resultado aguarda uma leitura válida.' : countSnapshot?.issue || 'A votação mudou. Confira a sala antes de validar o resultado.'}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <h3 className={presentation ? 'text-2xl font-semibold' : 'text-lg font-semibold'}>Resultado da eleição</h3>
            <p className="text-sm text-muted-foreground">{allElected.length} de {seatsCount} {seatsCount === 1 ? 'vaga preenchida' : 'vagas preenchidas'}</p>
          </div>
        </div>
        <Badge variant="outline" className={isValid ? 'border-success/30 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-foreground'}>
          {isValid ? 'Vagas preenchidas' : countVerified ? 'Apuração com vagas pendentes' : 'Aguardando conferência'}
        </Badge>
      </div>

      {allElected.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
        {allElected.map(id => {
          const candidate = candidates.find(row => row.id === id);
          const photo = candidate ? getCandidatePhoto(candidate) : null;
          const electedRound = roundResults.find(round => round.electedIds.includes(id));
          const count = electedRound?.rows.find(row => row.candidate_id === id)?.count;
          return <div key={id} aria-label={`Eleito: ${candidate?.name || 'Desconhecido'}`} className="flex min-w-0 items-center gap-4 rounded-2xl border border-success/30 bg-success/5 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card ring-1 ring-success/20">
              {photo ? <img src={photo} alt={candidate?.name} className="h-full w-full object-contain" /> : <CheckCircle className="h-8 w-8 text-success" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-success">Eleito · {electedRound?.round}º escrutínio</p>
              <p className={`[overflow-wrap:anywhere] font-semibold ${presentation ? 'text-2xl' : 'text-lg'}`}>{candidate?.name || 'Desconhecido'}</p>
              {count !== undefined && <p className="text-sm text-muted-foreground">{count} votos{electedRound && electedRound.totalBallots > 0 ? ` · ${Math.round(count / electedRound.totalBallots * 100)}% das cédulas` : ''}</p>}
            </div>
          </div>;
        })}
      </div>}

      <div className="space-y-3">
        {[...roundResults].reverse().map(roundResult => {
          const needed = Math.floor(roundResult.totalBallots / 2) + 1;
          const isCurrentRound = roundResult.round === (current_round || 1);
          const belowMajority = countVerified && roundResult.round === 1 && majority_rule === 'absolute_50' && roundResult.rows.length > 0 && roundResult.rows[0].count < needed;
          return <details key={`${electionId}:${roundResult.round}`} open={isCurrentRound} className="group min-w-0 rounded-2xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden sm:p-5">
              <span className="flex flex-wrap items-center gap-2 font-semibold">{roundResult.round}º escrutínio {isCurrentRound && <Badge variant="secondary">Atual</Badge>}</span>
              <span className="flex items-center gap-3 text-sm text-muted-foreground"><Users className="h-4 w-4" />{roundResult.totalBallots} cédulas<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
            </summary>
            <div className="space-y-4 border-t border-border px-4 py-4 sm:px-5">
              <p className="text-sm text-muted-foreground">{roundResult.round === 1
                ? majority_rule === 'absolute_50' ? `Maioria absoluta: pelo menos ${needed} ${needed === 1 ? 'voto' : 'votos'}, mais de 50% das cédulas.` : 'Maioria simples: os mais votados preenchem as vagas.'
                : roundResult.round === 2 ? 'Maioria simples entre os candidatos classificados.' : 'Último escrutínio. Em caso de empate, aplica-se o critério de idade.'}</p>
              {belowMajority && <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p><strong>Líder sem maioria absoluta.</strong> Ninguém atingiu os {needed} votos necessários neste escrutínio. A liderança não significa eleição.</p></div>}
              <div className="space-y-4">
                {roundResult.rows.map((row, index) => {
                  const candidate = candidates.find(candidate => candidate.id === row.candidate_id);
                  const pct = roundResult.totalBallots > 0 ? Math.round(row.count / roundResult.totalBallots * 100) : 0;
                  const elected = countVerified && roundResult.electedIds.includes(row.candidate_id);
                  return <div key={row.candidate_id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${elected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{elected ? <CheckCircle className="h-4 w-4" /> : index + 1}</span>
                        <span className={`min-w-0 [overflow-wrap:anywhere] font-semibold ${presentation ? 'text-xl sm:text-2xl' : 'text-base'}`}>{candidate?.name || 'Desconhecido'}</span>
                        {elected ? <Badge variant="outline" className="border-success/30 text-success">Eleito</Badge> : index === 0 && <Badge variant="secondary">Líder</Badge>}
                      </div>
                      <span className="flex items-baseline gap-3 tabular-nums"><strong>{row.count} <span className="text-sm font-normal text-muted-foreground">votos</span></strong><span className="min-w-10 text-right text-sm text-muted-foreground">{pct}%</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${candidate?.name || 'Candidato'}: ${pct}% das cédulas`}><div className={`h-full rounded-full ${elected ? 'bg-success' : index === 0 ? 'bg-primary' : 'bg-primary/35'}`} style={{ width: `${pct}%` }} /></div>
                  </div>;
                })}
                {roundResult.rows.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">Nenhum voto em candidato neste escrutínio.</p>}
              </div>
              {roundResult.blankVotes > 0 && <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground"><span>Branco / Nulo</span><strong className="tabular-nums">{roundResult.blankVotes}</strong></div>}
              {roundResult.hasTie && <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p>{roundResult.round < 3 ? 'Empate na classificação. A definição depende do próximo escrutínio.' : 'Empate no último escrutínio. Aplicado o critério de idade (mais velho eleito).'}</p></div>}
            </div>
          </details>;
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
        <span>{totalPresent} presentes na chamada</span>
        <span className={isValid ? 'font-medium text-success' : 'font-medium text-foreground'}>{!countVerified ? 'Resultado aguardando conferência' : isValid ? 'Todas as vagas preenchidas' : `${seatsCount - allElected.length} ${seatsCount - allElected.length === 1 ? 'vaga em aberto' : 'vagas em aberto'}`}</span>
      </div>
    </section>
  );
}
