export interface DayClass { id: string; name: string; order_index: number; active?: boolean }
export interface DayStudent { id: string; class_id: string; name: string; active?: boolean; created_at?: string }
export interface DayAttendance { id: string; student_id: string; class_id: string; date: string; present: boolean; marked_by?: string | null }

// A saved attendance owns the historical class assignment, even after a transfer.
// There is no enrollment history for unmarked pupils: use the eligible current roster.
export function buildDayRoster(students: DayStudent[], attendance: Pick<DayAttendance, 'student_id' | 'class_id'>[], date: string): DayStudent[] {
  const records = new Map(attendance.map(row => [row.student_id, row]));
  const result = students.filter(student => records.has(student.id) || (student.active !== false && (!student.created_at || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(student.created_at)) <= date)))
    .map(student => ({ ...student, class_id: records.get(student.id)?.class_id ?? student.class_id }));
  return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function buildDayClasses(classes: DayClass[], students: DayStudent[], extraClassIds: string[] = []) {
  const used = new Set([...students.map(s => s.class_id), ...extraClassIds]);
  return classes.filter(c => c.active !== false || used.has(c.id)).sort((a, b) => a.order_index - b.order_index);
}
