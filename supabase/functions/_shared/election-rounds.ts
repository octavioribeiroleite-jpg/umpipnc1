type Candidate = { id: string; birth_date?: string | null };
const MAX_ROUNDS = 3;
export function computeElectedIds(
  votes: any[],
  seatsCount: number,
  currentRound: number,
  majorityRule = 'simple',
  candidates: Candidate[] = [],
) {
  const elected = new Set<string>();
  for (let round = 1; round < currentRound; round += 1) {
    const roundVotes = votes.filter((v) => (v.round_number || 1) === round);
    const totalBallots = new Set(roundVotes.map((v) => v.ballot_id || v.id)).size;
    const needed = Math.floor(totalBallots / 2) + 1;
    const counts = roundVotes.reduce((acc: Record<string, number>, v: any) => {
      if (!v.is_blank && v.candidate_id && !elected.has(v.candidate_id)) {
        acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
      }
      return acc;
    }, {});
    const rows = Object.entries(counts)
      .map(([candidate_id, count]) => ({ candidate_id, count: count as number }))
      .sort((a, b) => b.count - a.count);

    const vagas = Math.max(0, seatsCount - elected.size);
    if (vagas === 0) break;

    if (round === 1) {
      const aprovados = rows.filter((r) =>
        majorityRule === 'absolute_50' ? r.count >= needed : true,
      );
      const cutoffCount = aprovados[vagas - 1]?.count;
      const nextCount = aprovados[vagas]?.count;
      const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;
      if (!tieAtCutoff) {
        aprovados.slice(0, vagas).forEach((r) => elected.add(r.candidate_id));
      } else {
        aprovados
          .filter((r) => r.count > cutoffCount)
          .forEach((r) => elected.add(r.candidate_id));
      }
    } else if (round < MAX_ROUNDS) {
      // 2º escrutínio: maioria SIMPLES (top N), sem exigir 50%+1
      const cutoffCount = rows[vagas - 1]?.count;
      const nextCount = rows[vagas]?.count;
      const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;
      if (!tieAtCutoff) {
        rows.slice(0, vagas).forEach((r) => elected.add(r.candidate_id));
      }
    } else {
      const cutoffCount = rows[vagas - 1]?.count;
      const nextCount = rows[vagas]?.count;
      const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;
      if (!tieAtCutoff) {
        rows.slice(0, vagas).forEach((r) => elected.add(r.candidate_id));
      } else {
        const clearlyElected = rows.filter((r) => r.count > cutoffCount);
        clearlyElected.forEach((r) => elected.add(r.candidate_id));
        const vagasRestantes = vagas - clearlyElected.length;
        const tiedIds = rows.filter((r) => r.count === cutoffCount).map((r) => r.candidate_id);
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
        tiedByAge.forEach((id) => elected.add(id));
      }
    }
  }
  return Array.from(elected);
}
