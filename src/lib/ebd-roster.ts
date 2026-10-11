export interface DayClass { id: string; name: string; order_index: number; active?: boolean }
export interface DayStudent { id: string; class_id: string; name: string; active?: boolean; created_at?: string; nameUnavailable?: boolean; attendanceReadOnly?: boolean }
export interface DayAttendance { id: string; student_id: string; class_id: string; date: string; present: boolean; marked_by?: string | null }
export interface DayClosureClassSummary {
  classId: string; className: string; total: number; present: number; percentage: number;
  visitor_count?: number; visitors?: { name: string | null }[];
}
export interface DayClosureSummary {
  total_students: number; present_students: number; class_summary: DayClosureClassSummary[]; visitor_count?: number;
  id?: string; date?: string; closed_by?: string | null;
}

export function normalizeDayClosure(value: unknown): DayClosureSummary | null {
  if (!value) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('O resumo salvo da chamada não foi confirmado.');
  const source = value as Record<string, unknown>;
  // The teacher RPC deliberately returns only id/date/visitor_count. The closed
  // flag still applies; no totals or other classes may be invented from it.
  if (!('class_summary' in source) && !('total_students' in source) && !('present_students' in source)) return null;
  const count = (number: unknown) => typeof number === 'number' && Number.isSafeInteger(number) && number >= 0;
  if (!count(source.total_students) || !count(source.present_students) || source.present_students > source.total_students || !Array.isArray(source.class_summary)) {
    throw new Error('O resumo salvo da chamada está incompleto. Atualize o encontro.');
  }
  const summaries: DayClosureClassSummary[] = source.class_summary.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('O resumo salvo de uma turma está incompleto.');
    const group = value as Record<string, unknown>;
    if (typeof group.classId !== 'string' || typeof group.className !== 'string' || !count(group.total) || !count(group.present) || group.present > group.total ||
      typeof group.percentage !== 'number' || !Number.isFinite(group.percentage) || group.percentage < 0 || group.percentage > 100) {
      throw new Error('O resumo salvo de uma turma está incompleto.');
    }
    return {
      classId: group.classId, className: group.className, total: group.total as number, present: group.present as number, percentage: group.percentage,
      ...(count(group.visitor_count) ? { visitor_count: group.visitor_count as number } : {}),
      ...(Array.isArray(group.visitors) ? { visitors: group.visitors.map(visitor => ({ name: typeof visitor?.name === 'string' ? visitor.name : null })) } : {}),
    };
  });
  return {
    total_students: source.total_students as number, present_students: source.present_students as number, class_summary: summaries,
    ...(count(source.visitor_count) ? { visitor_count: source.visitor_count as number } : {}),
    ...(typeof source.id === 'string' ? { id: source.id } : {}),
    ...(typeof source.date === 'string' ? { date: source.date } : {}),
    ...(typeof source.closed_by === 'string' || source.closed_by === null ? { closed_by: source.closed_by as string | null } : {}),
  };
}

// A saved attendance owns the historical class assignment, even after a transfer.
// There is no enrollment history for unmarked pupils: use the eligible current roster.
export function buildDayRoster(students: DayStudent[], attendance: Pick<DayAttendance, 'student_id' | 'class_id'>[], date: string): DayStudent[] {
  const records = new Map(attendance.map(row => [row.student_id, row]));
  const result: DayStudent[] = students.filter(student => records.has(student.id) || (student.active !== false && (!student.created_at || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(student.created_at)) <= date)))
    .map(student => ({ ...student, class_id: records.get(student.id)?.class_id ?? student.class_id }));
  const known = new Set(result.map(student => student.id));
  // A teacher may still read their authorized mark after the pupil transfers or
  // becomes inactive, while RLS hides the pupil's current enrollment and name.
  // Keep that authorized identity in the totals without inventing a name or
  // granting edit access to a pupil whose current enrollment is unavailable.
  for (const record of records.values()) if (!known.has(record.student_id)) {
    result.push({ id: record.student_id, class_id: record.class_id, name: 'Aluno com registro de presença', nameUnavailable: true, attendanceReadOnly: true });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function buildDayClasses(classes: DayClass[], students: DayStudent[], extraClassIds: string[] = []) {
  const used = new Set([...students.map(s => s.class_id), ...extraClassIds]);
  return classes.filter(c => c.active !== false || used.has(c.id)).sort((a, b) => a.order_index - b.order_index);
}
