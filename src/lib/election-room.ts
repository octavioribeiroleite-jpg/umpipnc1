export interface RoomCandidate {
  id: string; name: string; photo_url: string | null; photo_urls: string[]; display_order?: number; nomination_round?: number;
}
export interface RoomElection {
  id: string; name: string; position: string; status: string; current_round: number;
  total_present: number; seats_count: number; max_choices_per_ballot: number;
  majority_rule: string; voting_mode: string; round2_candidate_ids?: string[] | null; show_result: boolean;
  type?: string;
  nominations_open?: boolean;
}
export interface RoomPublishedResult {
  rounds: { round: number; totalBallots: number; blankVotes: number; rows: { candidate_id: string; count: number }[]; electedIds: string[]; hasTie: boolean }[];
  candidates: RoomCandidate[];
}
export interface ElectionRoomSnapshot {
  kind: 'real' | 'demo'; room_id: string; title: string; revision: string;
  phase: 'waiting' | 'nominations' | 'voting' | 'voted' | 'result' | 'finished';
  activeElection: RoomElection | null; candidates: RoomCandidate[]; already_voted: boolean;
  eligible_candidate_ids: string[]; elected_ids: string[]; max_choices: number;
  count: { ballots: number; present: number; confirmed: number; exact: boolean };
  published_result: RoomPublishedResult | null;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

/** A public room response never needs attendance, device tokens or raw ballots. */
export function parseElectionRoomSnapshot(value: unknown): ElectionRoomSnapshot {
  if (!record(value) || !['real', 'demo'].includes(String(value.kind)) || typeof value.room_id !== 'string' || typeof value.title !== 'string'
    || !['waiting', 'nominations', 'voting', 'voted', 'result', 'finished'].includes(String(value.phase))
    || !['string', 'number'].includes(typeof value.revision) || typeof value.already_voted !== 'boolean'
    || !Array.isArray(value.candidates) || !strings(value.eligible_candidate_ids) || !strings(value.elected_ids)
    || !integer(value.max_choices) || !record(value.count) || !['ballots', 'present', 'confirmed'].every(key => integer(value.count && (value.count as Record<string, unknown>)[key])) || typeof value.count.exact !== 'boolean') throw new Error('Resposta da sala indisponível.');
  if (value.activeElection !== null && (!record(value.activeElection) || typeof value.activeElection.id !== 'string'
    || typeof value.activeElection.name !== 'string' || typeof value.activeElection.position !== 'string'
    || !['draft', 'open', 'finished'].includes(String(value.activeElection.status)) || !integer(value.activeElection.current_round))) throw new Error('Votação da sala indisponível.');
  if (value.candidates.some(candidate => !record(candidate) || typeof candidate.id !== 'string' || typeof candidate.name !== 'string')) throw new Error('Candidatos da sala indisponíveis.');
  if (value.published_result !== null && (!record(value.published_result) || !Array.isArray(value.published_result.rounds) || !Array.isArray(value.published_result.candidates)
    || value.published_result.candidates.some(candidate => !record(candidate) || typeof candidate.id !== 'string' || typeof candidate.name !== 'string')
    || value.published_result.rounds.some(round => !record(round) || !integer(round.round) || !integer(round.totalBallots) || !integer(round.blankVotes) || !strings(round.electedIds) || typeof round.hasTie !== 'boolean' || !Array.isArray(round.rows) || round.rows.some(row => !record(row) || typeof row.candidate_id !== 'string' || !integer(row.count))))) throw new Error('Resultado da sala indisponível.');
  if (value.phase === 'result' && (!value.published_result || !value.count.exact || !(value.activeElection as RoomElection | null)?.show_result)) throw new Error('O resultado ainda não foi liberado.');
  return { kind: value.kind, room_id: value.room_id, title: value.title, revision: String(value.revision), phase: value.phase,
    activeElection: value.activeElection, candidates: value.candidates, already_voted: value.already_voted,
    eligible_candidate_ids: value.eligible_candidate_ids, elected_ids: value.elected_ids, max_choices: value.max_choices,
    count: value.count, published_result: value.published_result } as unknown as ElectionRoomSnapshot;
}
