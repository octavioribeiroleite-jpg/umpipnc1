import type { supabase } from '@/integrations/supabase/client';

type Client = Pick<typeof supabase, 'from'>;
export interface ElectionCountSnapshot {
  election: { id: string; status: string; current_round: number; total_present: number; society_id: string | null; type?: string; voting_mode?: string };
  attendance: { id: string; name: string; present: boolean }[];
  votes: { id: string; ballot_id: string; round_number: number; candidate_id: string | null; is_blank: boolean }[];
  present: number;
  ballots: number;
  difference: number;
  attendanceConfirmed: boolean;
  exact: boolean;
  issue: string;
}

/** Counts ballot UUIDs, never candidate/blank rows. Missing identifiers are a
 * read-integrity failure, not a reason to guess how many people voted. */
export function reconcileElectionCount(election: ElectionCountSnapshot['election'], attendance: ElectionCountSnapshot['attendance'], votes: ElectionCountSnapshot['votes']): ElectionCountSnapshot {
  const present = attendance.filter(person => person.present === true).length;
  const roundVotes = votes.filter(vote => vote.round_number === election.current_round);
  const invalid = votes.some(vote => !vote.id || !vote.ballot_id || !Number.isSafeInteger(vote.round_number) || vote.round_number < 1);
  const ballots = new Set(roundVotes.map(vote => vote.ballot_id)).size;
  const difference = present - ballots;
  const attendanceConfirmed = Number.isSafeInteger(election.total_present) && election.total_present > 0 && election.total_present === present;
  let issue = '';
  if (invalid || !Number.isSafeInteger(election.current_round) || election.current_round < 1) issue = 'Não foi possível identificar todas as cédulas deste escrutínio. Confira a votação antes de continuar.';
  else if (!attendanceConfirmed) issue = `Chamada divergente: ${present} presente(s) na lista e ${election.total_present} confirmado(s). Confira e confirme a chamada antes de continuar.`;
  else if (difference > 0) issue = `Faltam ${difference} voto(s): ${ballots} cédula(s) para ${present} presente(s). Não é possível continuar.`;
  else if (difference < 0) issue = `Há ${-difference} voto(s) excedente(s): ${ballots} cédula(s) para ${present} presente(s). Não é possível continuar.`;
  return { election, attendance, votes, present, ballots, difference, attendanceConfirmed, exact: !issue, issue };
}

/** Paginate so more than 1,000 candidate rows cannot masquerade as fewer ballots.
 * This is a fresh client preflight; only the DB transition trigger can close the
 * race between these reads and the subsequent update. */
export async function readElectionCount(client: Client, electionId: string): Promise<ElectionCountSnapshot> {
  const initial = await client.from('elections').select('*').eq('id', electionId).single();
  if (initial.error || !initial.data) throw initial.error || new Error('Eleição indisponível.');
  const pages = async (table: 'election_attendance' | 'election_votes', columns: string) => {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await client.from(table).select(columns).eq('election_id', electionId).order('id').range(offset, offset + 999);
      if (result.error || !Array.isArray(result.data)) throw result.error || new Error('Contagem indisponível.');
      rows.push(...result.data);
      if (result.data.length < 1000) return rows;
    }
  };
  const [attendance, votes] = await Promise.all([
    pages('election_attendance', 'id,name,present'),
    pages('election_votes', 'id,ballot_id,round_number,candidate_id,is_blank'),
  ]);
  const final = await client.from('elections').select('*').eq('id', electionId).single();
  if (final.error || !final.data) throw final.error || new Error('Eleição indisponível.');
  if (['status', 'current_round', 'total_present'].some(key => initial.data[key] !== final.data[key])) {
    throw new Error('A votação mudou durante a conferência. Confira novamente.');
  }
  return reconcileElectionCount(final.data, attendance, votes);
}

export function requireElectionCount(snapshot: ElectionCountSnapshot, expected: { status: string; round: number; action?: 'start' | 'complete' }) {
  if (snapshot.election.status !== expected.status || snapshot.election.current_round !== expected.round) throw new Error('A votação mudou. Atualize a sala antes de continuar.');
  if (expected.action === 'start') {
    if (!snapshot.attendanceConfirmed) throw new Error(snapshot.issue);
    if (snapshot.votes.length) throw new Error('Este rascunho já tem votos. Confira a votação antes de iniciar.');
  } else if (!snapshot.exact) throw new Error(snapshot.issue);
  return snapshot;
}
