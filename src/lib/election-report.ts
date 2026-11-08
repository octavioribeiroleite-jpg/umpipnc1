export interface ElectionReportCandidate { id: string; name: string; nomination_round?: number | null }
export interface ElectionReportRound {
  round: number; totalBallots: number; blankVotes: number;
  rows: { candidate_id: string; count: number }[]; electedIds: string[]; hasTie: boolean;
}
export interface ElectionReportEntry {
  election: { id: string; name: string; position: string; status: string; current_round: number; total_present: number; seats_count: number; majority_rule: string };
  candidates: ElectionReportCandidate[]; rounds: ElectionReportRound[]; electedIds: string[];
  count: { ballots: number; present: number; confirmed: number; exact: boolean };
}
export interface ElectionReport {
  room_id: string; title: string; generated_at: string; completed: boolean; elections: ElectionReportEntry[];
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every(id => typeof id === 'string');

/** Export only independently confirmed, published cargo results. Raw ballots,
 * browser identifiers and capability secrets are never part of this model. */
export function parseElectionReport(raw: unknown): ElectionReport {
  if (!object(raw) || typeof raw.room_id !== 'string' || typeof raw.title !== 'string' || typeof raw.generated_at !== 'string'
    || !Number.isFinite(Date.parse(raw.generated_at)) || typeof raw.completed !== 'boolean' || !Array.isArray(raw.elections)) throw new Error('Relatório indisponível.');
  const elections: ElectionReportEntry[] = raw.elections.map(item => {
    if (!object(item) || !object(item.election) || !object(item.count) || !Array.isArray(item.candidates) || !Array.isArray(item.rounds) || !ids(item.electedIds)) throw new Error('Resultado não conferido.');
    const e = item.election, count = item.count;
    if (typeof e.id !== 'string' || typeof e.name !== 'string' || typeof e.position !== 'string' || e.status !== 'finished'
      || !integer(e.current_round) || e.current_round < 1 || !integer(e.seats_count) || e.seats_count < 1 || typeof e.majority_rule !== 'string'
      || !integer(e.total_present) || e.total_present < 1 || !integer(count.ballots) || !integer(count.present) || !integer(count.confirmed)
      || count.exact !== true || count.ballots !== count.present || count.present !== count.confirmed || count.present !== e.total_present) throw new Error('A contagem do resultado não está conferida.');
    const candidates: ElectionReportCandidate[] = item.candidates.map(c => {
      if (!object(c) || typeof c.id !== 'string' || typeof c.name !== 'string' || (c.nomination_round != null && (!integer(c.nomination_round) || c.nomination_round < 1))) throw new Error('Indicação indisponível no relatório.');
      return { id: c.id, name: c.name, nomination_round: c.nomination_round as number | null | undefined };
    });
    const known = new Set(candidates.map(c => c.id));
    if (known.size !== candidates.length) throw new Error('Indicações duplicadas no relatório.');
    const rounds: ElectionReportRound[] = item.rounds.map(r => {
      if (!object(r) || !integer(r.round) || r.round < 1 || !integer(r.totalBallots) || !integer(r.blankVotes) || !Array.isArray(r.rows)
        || !ids(r.electedIds) || typeof r.hasTie !== 'boolean') throw new Error('Escrutínio indisponível no relatório.');
      const totalBallots = r.totalBallots;
      const rows = r.rows.map(row => {
        if (!object(row) || typeof row.candidate_id !== 'string' || !known.has(row.candidate_id) || !integer(row.count) || row.count > totalBallots) throw new Error('Votos inconsistentes no relatório.');
        return { candidate_id: row.candidate_id, count: row.count };
      });
      if (new Set(rows.map(row => row.candidate_id)).size !== rows.length || r.electedIds.some(id => !known.has(id))) throw new Error('Resultado inconsistente no relatório.');
      return { round: r.round, totalBallots: r.totalBallots, blankVotes: r.blankVotes, rows, electedIds: [...r.electedIds], hasTie: r.hasTie };
    });
    if (rounds.length !== e.current_round || rounds.some((r, index) => r.round !== index + 1 || r.totalBallots !== e.total_present)
      || item.electedIds.length !== e.seats_count || new Set(item.electedIds).size !== item.electedIds.length
      || item.electedIds.some(id => !known.has(id)) || new Set(rounds.flatMap(r => r.electedIds)).size !== item.electedIds.length
      || item.electedIds.some(id => !rounds.some(r => r.electedIds.includes(id)))) throw new Error('O histórico do cargo não está completo.');
    return {
      election: { id: e.id, name: e.name, position: e.position, status: 'finished', current_round: e.current_round, total_present: e.total_present, seats_count: e.seats_count, majority_rule: e.majority_rule },
      candidates, rounds, electedIds: [...item.electedIds], count: { ballots: count.ballots, present: count.present, confirmed: count.confirmed, exact: true },
    };
  });
  if (new Set(elections.map(entry => entry.election.id)).size !== elections.length) throw new Error('Cargos duplicados no relatório.');
  return { room_id: raw.room_id, title: raw.title, generated_at: raw.generated_at, completed: raw.completed, elections };
}

export function reportRoundRows(entry: ElectionReportEntry, round: ElectionReportRound) {
  const voted = new Map(round.rows.map(row => [row.candidate_id, row.count]));
  return entry.candidates.filter(candidate => voted.has(candidate.id) || candidate.nomination_round === round.round)
    .map(candidate => ({ id: candidate.id, name: candidate.name, votes: voted.get(candidate.id) || 0, elected: round.electedIds.includes(candidate.id) }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'pt-BR'));
}
export const reportPercentage = (votes: number, ballots: number) => ballots > 0 ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(votes / ballots * 100) + '%' : '0%';
export const electionReportFilename = (title: string) => `resultado-${title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'votacao'}.pdf`;
