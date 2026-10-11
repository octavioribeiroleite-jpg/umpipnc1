import { buildDayRoster } from '@/lib/ebd-roster';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code: string; message: string } | null; status: number };
const params = new URLSearchParams(location.search);
const now = new Date();
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
const past = new Date(now); past.setDate(past.getDate() - 7);
const pastDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(past);
const classes = [{ id: 'fixture-class-a', name: 'Esperança — turma fictícia', active: true, order_index: 0 }, { id: 'fixture-class-b', name: 'Jovens — turma fictícia', active: true, order_index: 1 }];
const students = Array.from({ length: 9 }, (_, i) => ({ id: `fixture-student-${i}`, name: `Aluno Fictício ${i + 1}`, class_id: classes[i < 5 ? 0 : 1].id, active: i !== 8, created_at: '2026-01-01T12:00:00Z' }));
if (params.get('hiddenStudent') === '1') students[0].active = false;
const tables: Record<string, Row[]> = {
  ebd_classes: classes, ebd_students: students,
  ebd_attendance: students.filter(student => student.active).map((student, i) => ({ id: `fixture-old-attendance-${i}`, student_id: student.id, class_id: student.class_id, date: pastDate, present: i % 2 === 0, marked_by: '00000000-0000-0000-0000-000000000099' })),
  ebd_call_status: classes.map(c => ({ class_id: c.id, date: pastDate, status: 'finalizada', changed_by: 'Professor Fictício' })),
  ebd_day_closures: [], ebd_class_visitor_entries: [], ebd_class_visitors: [],
  ebd_class_logins: [{ id: 'fixture-login', class_id: classes[0].id, teacher_name: 'Professor Fictício', date, created_at: now.toISOString() }],
};
export const fixture = { role: params.get('role') === 'professor' ? 'professor' : 'admin', valid: true, authenticated: true, tables, writes: [] as Row[], onChange: () => {} };
if (params.get('hiddenStudent') === '1') {
  tables.ebd_attendance.push({ id: 'fixture-hidden-attendance', student_id: students[0].id, class_id: classes[0].id, date, present: true, marked_by: '00000000-0000-0000-0000-000000000099' });
  tables.ebd_call_status.push({ class_id: classes[0].id, date, status: 'aberta', changed_by: 'Professor Fictício' });
}
for (const storage of [localStorage, sessionStorage]) for (const key of ['ebd_session', 'ipnc-ebd-auth', 'ebd_navigation', 'ebd_navigation_v1']) storage.removeItem(key);
localStorage.setItem('ebd_session', JSON.stringify({ accessLevel: fixture.role, professorNome: fixture.role === 'professor' ? 'Professor Fictício' : undefined, professorClassId: fixture.role === 'professor' ? classes[0].id : undefined, birthdayAiToken: 'synthetic-birthday-token', birthdayAiExpiresAt: new Date(Date.now() + 3600000).toISOString() }));
const success = (data: unknown): Result => ({ data, error: null, status: 200 });
const denied = (message = 'Acesso fictício recusado'): Result => ({ data: null, error: { code: '42501', message }, status: 403 });
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const session = () => fixture.authenticated ? { access_token: 'synthetic-attendance-token', refresh_token: 'synthetic-refresh', user: { id: '00000000-0000-0000-0000-000000000099' } } : null;
function closure(day: string) {
  const attendance = tables.ebd_attendance.filter(row => row.date === day);
  const roster = buildDayRoster(students, attendance as never[], day);
  const summaries = classes.map(c => {
    const group = roster.filter(s => s.class_id === c.id);
    const present = attendance.filter(row => row.class_id === c.id && row.present).length;
    const visitors = tables.ebd_class_visitor_entries.filter(row => row.date === day && row.class_id === c.id).map(row => ({ name: row.name ?? null }));
    return { classId: c.id, className: c.name, total: group.length, present, percentage: group.length ? Math.round(present / group.length * 100) : 0, visitor_count: visitors.length, visitors };
  });
  return { id: crypto.randomUUID(), date: day, closed_at: now.toISOString(), closed_by: 'Administrador Fictício', present_students: summaries.reduce((sum, c) => sum + c.present, 0), total_students: roster.length, visitor_count: summaries.reduce((sum, c) => sum + c.visitor_count, 0), class_summary: summaries };
}
tables.ebd_day_closures.push(closure(pastDate));
export const supabase = {
  auth: { async getSession() { return { data: { session: session() }, error: null }; }, async refreshSession() { return success({ session: session() }); }, async setSession() { fixture.authenticated = fixture.valid = true; return success({ session: session() }); }, async signOut() { fixture.authenticated = fixture.valid = false; return { error: null }; }, onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
  functions: { async invoke(name: string, options: { body: Row }) { await pause(); if (name === 'manage-ebd-class-password') return success({ class_ids: classes.map(c => c.id), passwords: { 'fixture-class-a': '123456', 'fixture-class-b': '654321' } }); return success({ success: options.body.pin === '123456' || options.body.admin_pin === '123456', session: session(), birthday_ai_token: 'synthetic-birthday-token', birthday_ai_expires_at: new Date(Date.now() + 3600000).toISOString(), teacher: { name: 'Professor Fictício', class_id: classes[0].id } }); } },
  async rpc(name: string, args: Row = {}) {
    await pause(); if (name === 'ebd_session_valid') return success(fixture.valid);
    if (!fixture.valid || !fixture.authenticated) return denied();
    if (name === 'ebd_is_admin') return success(fixture.role === 'admin');
    if (name === 'list_birthdays') return success([{ id: 'fixture-birthday', nome: 'Pessoa Fictícia', dia: now.getDate(), mes: now.getMonth() + 1, ano_nascimento: 2000, departamento: 'EBD', observacao: null, ativo: true, pendente_revisao: false, created_at: now.toISOString(), updated_at: now.toISOString() }]);
    if (name === 'ebd_closure') { const row = tables.ebd_day_closures.find(row => row.date === args.p_date); return success(row ? fixture.role === 'professor' ? { id: row.id, date: row.date, visitor_count: 0 } : row : null); }
    if (['ebd_close_day', 'ebd_reopen_day'].includes(name)) {
      if (fixture.role !== 'admin') return denied();
      const day = String(args.p_date); fixture.writes.push({ operation: name, day });
      tables.ebd_day_closures = tables.ebd_day_closures.filter(row => row.date !== day);
      if (name === 'ebd_close_day') tables.ebd_day_closures.push(closure(day));
      fixture.onChange(); return success(true);
    }
    throw new Error(`Unsupported isolated RPC ${name}`);
  },
  from(table: string) {
    if (!(table in tables)) throw new Error(`Unsupported isolated table ${table}`);
    const predicates: Array<(row: Row) => boolean> = []; let operation = 'read'; let body: Row | Row[] = {}; let bounds: [number, number] | undefined; let single = false;
    const filtered = () => tables[table].filter(row => {
      if (fixture.role === 'professor') {
        if (table === 'ebd_day_closures') return false;
        if (table === 'ebd_classes' && row.id !== classes[0].id) return false;
        if (table !== 'ebd_classes' && row.class_id !== classes[0].id) return false;
        if (table === 'ebd_students' && !row.active) return false;
      }
      return predicates.every(match => match(row));
    });
    const execute = async (): Promise<Result> => {
      await pause(); if (!fixture.valid || !fixture.authenticated) return denied();
      if (operation === 'read') { let rows = filtered(); if (bounds) rows = rows.slice(bounds[0], bounds[1] + 1); return success(single ? rows[0] || null : rows); }
      const values = Array.isArray(body) ? body : [body];
      const changes = operation === 'delete' || operation === 'update' ? filtered() : values;
      for (const row of changes) {
        const day = String(row.date || date); const group = String(row.class_id || '');
        if (fixture.role === 'professor' && group !== classes[0].id) return denied('Sala não autorizada');
        if (tables.ebd_day_closures.some(c => c.date === day)) return denied('Dia fechado');
        if (table === 'ebd_attendance' && tables.ebd_call_status.some(c => c.date === day && c.class_id === group && c.status === 'finalizada')) return denied('Turma finalizada');
      }
      let result: Row[] = [];
      if (operation === 'delete') { result = filtered(); tables[table] = tables[table].filter(row => !result.includes(row)); }
      else if (operation === 'update') { result = filtered(); result.forEach(row => Object.assign(row, body)); }
      else for (const value of values) {
        const existing = operation === 'upsert' ? tables[table].find(row => table === 'ebd_attendance' ? row.student_id === value.student_id && row.date === value.date : row.class_id === value.class_id && row.date === value.date) : undefined;
        if (value.id && tables[table].some(row => row.id === value.id) && !existing) return { data: null, error: { code: '23505', message: 'Registro fictício já existente' }, status: 409 };
        if (existing) { Object.assign(existing, value); result.push(existing); } else { const row = { id: crypto.randomUUID(), ...value }; tables[table].push(row); result.push(row); }
      }
      fixture.writes.push({ operation, table, count: result.length }); fixture.onChange(); return success(single ? result[0] || null : result);
    };
    const chain = {
      select() { return chain; }, order() { return chain; }, abortSignal() { return chain; },
      eq(key: string, value: unknown) { predicates.push(row => row[key] === value); return chain; },
      gte(key: string, value: string) { predicates.push(row => String(row[key]) >= value); return chain; },
      lte(key: string, value: string) { predicates.push(row => String(row[key]) <= value); return chain; },
      in(key: string, values: unknown[]) { predicates.push(row => values.includes(row[key])); return chain; },
      range(from: number, to: number) { bounds = [from, to]; return chain; },
      insert(value: Row | Row[]) { operation = 'insert'; body = value; return chain; },
      upsert(value: Row | Row[]) { operation = 'upsert'; body = value; return chain; },
      update(value: Row) { operation = 'update'; body = value; return chain; },
      delete() { operation = 'delete'; return chain; },
      single() { single = true; return execute(); }, maybeSingle() { single = true; return execute(); },
      then(resolve: (value: Result) => unknown, reject?: (error: unknown) => unknown) { return execute().then(resolve, reject); },
    }; return chain;
  },
  channel() { const channel = { on() { return channel; }, subscribe(callback: (status: string) => void) { setTimeout(() => callback('SUBSCRIBED'), 0); return channel; }, unsubscribe() {} }; return channel; }, async removeChannel() { return 'ok'; },
};
