import { supabase } from '@/integrations/supabase/ebd-client';
import { ensureEbdSession, notifyEbdChange } from '@/lib/ebd-mutations';
import { buildDayRoster, buildDayClasses, type DayAttendance } from '@/lib/ebd-roster';

export interface DayVisitor { id: string; class_id: string; name: string | null }
export interface DayCallStatus { class_id: string; status: 'aberta' | 'finalizada' }

export async function readEbdDay(date: string) {
  await ensureEbdSession();
  const results = await Promise.all([
    supabase.from('ebd_classes').select('*').order('order_index'),
    supabase.from('ebd_students').select('*').order('name'),
    supabase.from('ebd_attendance').select('*').eq('date', date),
    supabase.from('ebd_day_closures').select('*').eq('date', date).maybeSingle(),
    supabase.from('ebd_call_status' as never).select('class_id,status').eq('date', date),
    supabase.from('ebd_class_visitor_entries' as never).select('id,class_id,name').eq('date', date),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [classes, students, attendance, closure, statuses, visitors] = results;
  const rows = (attendance.data || []) as DayAttendance[];
  const roster = buildDayRoster(students.data || [], rows, date);
  const calls = (statuses.data || []) as DayCallStatus[];
  const entries = (visitors.data || []) as DayVisitor[];
  return {
    date, attendance: rows, students: roster,
    classes: buildDayClasses(classes.data || [], roster, [...calls, ...entries].map(row => row.class_id)),
    closure: closure.data,
    callStatuses: Object.fromEntries(calls.map(row => [row.class_id, row.status])),
    classVisitors: entries.reduce<Record<string, DayVisitor[]>>((map, row) => { (map[row.class_id] ||= []).push(row); return map; }, {}),
  };
}

export async function saveEbdAttendance(student: { id: string; class_id: string }, date: string, present: boolean, existing?: DayAttendance) {
  await ensureEbdSession();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const markedBy = sessionData.session?.user.id;
  if (sessionError || !markedBy || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(markedBy)) {
    throw new Error("Confirme novamente o PIN antes de registrar a presença.");
  }
  const mutation = existing
    ? supabase.from('ebd_attendance').update({ present, marked_by: markedBy }).eq('id', existing.id).eq('date', date).eq('class_id', student.class_id).eq('student_id', student.id)
    : supabase.from('ebd_attendance').upsert({ student_id: student.id, class_id: student.class_id, date, present, marked_by: markedBy }, { onConflict: 'student_id,date' });
  const { data, error } = await mutation.select().single();
  if (error || !data) throw error || new Error('Presença não foi salva.');
  notifyEbdChange();
  return data;
}

export async function setEbdCallStatus(date: string, classId: string, status: 'aberta' | 'finalizada', changedBy = 'Administrador') {
  await ensureEbdSession();
  const { error } = await supabase.from('ebd_call_status' as never)
    .upsert({ class_id: classId, date, status, changed_by: changedBy } as never, { onConflict: 'class_id,date' }).select().single();
  if (error) throw error;
  notifyEbdChange();
}

export async function closeEbdDay(date: string) {
  await ensureEbdSession();
  const { data, error } = await supabase.rpc('ebd_close_day', { p_date: date });
  if (error || !data) throw error || new Error('O fechamento não foi confirmado.');
  notifyEbdChange();
}

export async function reopenEbdDay(date: string, closureId: string) {
  await ensureEbdSession();
  const { error } = await supabase.rpc('ebd_reopen_day', { p_date: date, p_closure_id: closureId });
  if (error) throw error;
  notifyEbdChange();
}
