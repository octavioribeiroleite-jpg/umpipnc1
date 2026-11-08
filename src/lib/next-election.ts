import type { supabase } from '@/integrations/supabase/client';

interface SourceElection {
  id: string;
  society_id: string | null;
  status: string;
  type?: string;
  voting_mode?: string;
}
export interface NextElectionPlan {
  election: {
    id: string; name: string; position: string; created_by: string; society_id: string | null;
    type: string; voting_mode: string; status: string; current_round: number;
    seats_count: number; max_choices_per_ballot: number; majority_rule: string;
    total_present: number; show_result: boolean;
  };
  attendance: { id: string; election_id: string; name: string; present: boolean }[];
}

export function planNextElection(source: SourceElection, attendance: { name: string; present: boolean }[],
  input: { userId: string; name: string; position: string; seats: number }): NextElectionPlan {
  if (source.status !== 'finished') throw new Error('Conclua a votação atual antes de iniciar outra.');
  if (!input.userId || !input.name.trim() || !input.position.trim() || !Number.isSafeInteger(input.seats) || input.seats < 1) {
    throw new Error('Preencha nome, cargo/descrição e uma quantidade inteira de vagas.');
  }
  const id = crypto.randomUUID();
  const seats = source.type === 'camisa' ? 1 : input.seats;
  return {
    election: { id, name: input.name.trim(), position: input.position.trim(), created_by: input.userId,
      society_id: source.society_id, type: source.type || 'cargo', voting_mode: source.voting_mode || 'both',
      status: 'draft', current_round: 1, seats_count: seats, max_choices_per_ballot: seats,
      majority_rule: source.type === 'camisa' ? 'simple' : 'absolute_50', total_present: 0, show_result: false },
    attendance: attendance.map(person => ({ id: crypto.randomUUID(), election_id: id, name: person.name, present: person.present })),
  };
}

/** Reuse this plan on retry: stable IDs prevent duplicate drafts or attendance
 * after a lost response. A partial copy remains a draft with no confirmed quorum.
 * All writes use the signed-in account and the existing society RLS policies.
 */
export async function saveNextElection(client: Pick<typeof supabase, 'from'>, plan: NextElectionPlan): Promise<string> {
  const existing = await client.from('elections').select('id,status,created_by,society_id,total_present').eq('id', plan.election.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.created_by !== plan.election.created_by || existing.data.society_id !== plan.election.society_id) {
      throw new Error('Este rascunho não pertence a esta criação. Abra a lista de eleições para conferi-lo.');
    }
    // A completed copy or a voting session already started must never be overwritten on retry.
    if (existing.data.status !== 'draft' || existing.data.total_present > 0) return existing.data.id;
  } else {
    const created = await client.from('elections').insert(plan.election);
    if (created.error) throw created.error;
  }
  if (plan.attendance.length) {
    const copied = await client.from('election_attendance').upsert(plan.attendance, { onConflict: 'id' });
    if (copied.error) throw copied.error;
  }
  const confirmed = await client.from('elections').update({ total_present: plan.attendance.filter(person => person.present).length })
    .eq('id', plan.election.id).eq('status', 'draft').select('id').single();
  if (confirmed.error || !confirmed.data) throw confirmed.error || new Error('Não foi possível confirmar a chamada.');
  return confirmed.data.id;
}
