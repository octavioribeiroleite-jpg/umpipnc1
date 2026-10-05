export interface ElectionVote {
  id: string;
  ballot_id?: string | null;
  round_number?: number | null;
  candidate_id?: string | null;
  is_blank?: boolean | null;
}

export interface ElectionResultRules {
  seats_count?: number;
  current_round?: number;
  majority_rule?: string;
}

export interface ElectionRoundResult {
  round: number;
  totalBallots: number;
  blankVotes: number;
  electedIds: string[];
  rows: { candidate_id: string; count: number }[];
  hasTie: boolean;
}

// Extracted unchanged from ResultPanel: the detail and presentation must follow
// the same existing rules for ballots, seats, rounds, majority and tie-breaking.
export function calculateElectionRounds(
  votes: ElectionVote[],
  candidates: { id: string; birth_date?: string | null }[],
  election?: ElectionResultRules,
): ElectionRoundResult[] {
  const maxRound = Math.max(election?.current_round || 1, ...votes.map((v) => v.round_number || 1));
  const alreadyElected = new Set<string>();
  const seatsCount = election?.seats_count || 1;
  const MAX_ROUNDS = 3;

  return Array.from({ length: maxRound }, (_, index) => {
    const round = index + 1;
    const roundVotes = votes.filter((v) => (v.round_number || 1) === round);
    const totalBallots = new Set(roundVotes.map((v) => v.ballot_id || v.id)).size;

    const blankVotes = roundVotes.filter((v) => v.is_blank === true).length;

    const counts = roundVotes.reduce((acc: Record<string, number>, v: ElectionVote) => {
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
}
