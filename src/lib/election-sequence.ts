/** The server stores each election and its result. This browser stores only the
 * optional order and reserved IDs, scoped to the organizing account. */
export const UMP_POSITIONS = ['Presidente', 'Vice-presidente', '1º secretário', '2º secretário', 'Tesoureiro'] as const;
export interface ElectionSequence {
  version: 1;
  id: string;
  userId: string;
  name: string;
  societyId: string | null;
  electionIds: string[];
  attendanceIds: Record<string, Record<string, string>>;
}
const storageKey = (userId: string) => `ipnc:election-sequences:v1:${userId}`;

export function readElectionSequences(userId: string): ElectionSequence[] {
  try {
    const records = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(records) ? records.filter(record => record?.version === 1 && record.userId === userId &&
      typeof record.name === 'string' && Array.isArray(record.electionIds) && record.electionIds.length === UMP_POSITIONS.length &&
      record.electionIds.every((id: unknown) => typeof id === 'string') && record.attendanceIds && typeof record.attendanceIds === 'object') : [];
  } catch { return []; }
}

function persistSequence(sequence: ElectionSequence): ElectionSequence {
  const sequences = readElectionSequences(sequence.userId).filter(record => record.id !== sequence.id);
  try { localStorage.setItem(storageKey(sequence.userId), JSON.stringify([...sequences, sequence])); }
  catch { throw new Error('Permita o armazenamento deste navegador para guardar o roteiro, ou use uma votação avulsa.'); }
  return sequence;
}

export function createUmpSequence(userId: string, name: string, societyId: string | null): ElectionSequence {
  if (!userId || !name.trim()) throw new Error('Informe o nome da eleição.');
  return persistSequence({ version: 1, id: crypto.randomUUID(), userId, name: name.trim(), societyId,
    electionIds: UMP_POSITIONS.map(() => crypto.randomUUID()), attendanceIds: {} });
}

export function findElectionSequence(userId: string, electionId: string) {
  const sequence = readElectionSequences(userId).find(record => record.electionIds.includes(electionId));
  return sequence ? { sequence, index: sequence.electionIds.indexOf(electionId) } : null;
}

/** Reserve only anonymous row IDs before any remote write. A reload can retry
 * exactly the same target election and attendance rows after a lost response. */
export function reserveSequenceAttendance(sequence: ElectionSequence, targetId: string, sourceIds: string[]) {
  if (!sequence.electionIds.includes(targetId)) throw new Error('Cargo fora deste roteiro.');
  const latest = readElectionSequences(sequence.userId).find(record => record.id === sequence.id) || sequence;
  const mapping = { ...latest.attendanceIds[targetId] };
  for (const id of sourceIds) mapping[id] ??= crypto.randomUUID();
  persistSequence({ ...latest, attendanceIds: { ...latest.attendanceIds, [targetId]: mapping } });
  return mapping;
}
