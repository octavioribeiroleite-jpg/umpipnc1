type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code: string; message: string } | null; status: number };
type RequestMetric = { id: number; endpoint: string; started: number; ended?: number; elapsedMs?: number; configuredDelayMs: number; authenticated: boolean; filters?: Row; syntheticJsonBytes?: number; rowCount?: number };
const params = new URLSearchParams(location.search);
const delayValue = (name: string, fallback: number) => Math.max(0, Math.min(5000, Number(params.get(name) ?? fallback) || 0));
const mode = params.get('mode') || 'login';
const storedRole = mode.includes('professor') ? 'professor' : 'admin';
const exp = () => new Date(Date.now() + 3600000).toISOString();
export const fixture = {
  sourceRevision: document.body.dataset.benchmarkRevision,
  sourceHash: document.body.dataset.benchmarkSourceHash,
  sourceStatus: document.body.dataset.benchmarkSourceStatus,
  mode, edgeMs: delayValue('edge', 150), authMs: delayValue('auth', 200), readMs: delayValue('read', 200), realtimeMs: delayValue('realtime', 200),
  authenticated: mode.startsWith('stored'), valid: mode !== 'stored-expired',
  authFailuresRemaining: delayValue('authfail', 0),
  requests: [] as RequestMetric[], onChange: () => {},
  operations: [] as Array<{ type: string; started: number; requestStart: number; homeMs?: number; dataMs?: number }>,
};
export function operation(type: string) { fixture.operations.push({ type, started: performance.now(), requestStart: fixture.requests.length }); fixture.onChange(); }
for (const storage of [localStorage, sessionStorage]) {
  for (const key of ['ebd_session', 'ipnc-ebd-auth', 'ebd_navigation']) storage.removeItem(key);
}
if (mode.startsWith('stored')) localStorage.setItem('ebd_session', JSON.stringify({ accessLevel: storedRole, professorNome: storedRole === 'professor' ? 'Professor Fictício' : undefined, professorClassId: storedRole === 'professor' ? 'fixture-class-a' : undefined, birthdayAiToken: 'synthetic-birthday-token', birthdayAiExpiresAt: exp() }));
if (mode.startsWith('stored')) operation('stored-session');
const classes = [
  { id: 'fixture-class-a', name: 'Turma Esperança fictícia', active: true, order_index: 0 },
  { id: 'fixture-class-b', name: 'Turma Jovens fictícia', active: true, order_index: 1 },
];
const students = Array.from({ length: 9 }, (_, i) => ({ id: `fixture-student-${i}`, name: `Aluno Fictício ${i + 1}`, class_id: i < 5 ? classes[0].id : classes[1].id, active: i !== 8, created_at: '2026-01-01T12:00:00Z' }));
const now = new Date();
const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
// Optional read-only visual seeds. They never change the backend under test.
const populatedVisual = params.get('visual') === 'populated';
const visualAttendance = populatedVisual ? students.filter(student => student.active).map((student, index) => ({
  id: `fixture-attendance-${index}`, student_id: student.id, class_id: student.class_id,
  date: localDate, present: index % 2 === 0, marked_by: 'Professor Fictício',
})) : [];
const visualLogins = populatedVisual ? classes.map((classroom, index) => ({
  id: `fixture-login-${index}`, class_id: classroom.id, teacher_name: `Professor Fictício ${index + 1}`,
  date: localDate, created_at: now.toISOString(),
})) : [];
// Optional read-only seed exposes the real visitor draft without initiating a
// class or allowing a fixture write. Match Secretaria's local accounting date.
const callStatuses = params.get('callStarted') === '1' ? [{
  class_id: classes[0].id,
  date: localDate,
  status: 'aberta',
}] : [];
const birthdays = [{ id: 'fixture-birthday', nome: 'Pessoa Fictícia', dia: now.getDate(), mes: now.getMonth() + 1, ano_nascimento: 2000, departamento: 'EBD', observacao: null, ativo: true, pendente_revisao: false, created_at: now.toISOString(), updated_at: now.toISOString() }];
const success = (data: unknown): Result => ({ data, error: null, status: 200 });
const denied = (): Result => ({ data: null, error: { code: '42501', message: 'Synthetic fixture access required' }, status: 403 });
async function request(endpoint: string, ms: number, read: () => Result, filters?: Row) {
  const metric: RequestMetric = { id: fixture.requests.length + 1, endpoint, started: performance.now(), configuredDelayMs: ms, authenticated: fixture.authenticated, filters };
  fixture.requests.push(metric); fixture.onChange();
  await new Promise(resolve => setTimeout(resolve, ms));
  const result = read();
  metric.syntheticJsonBytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
  if (Array.isArray(result.data)) metric.rowCount = result.data.length;
  metric.ended = performance.now(); metric.elapsedMs = metric.ended - metric.started; fixture.onChange(); return result;
}
const session = () => fixture.authenticated ? { access_token: 'synthetic-ebd-token', refresh_token: 'synthetic-refresh', user: { id: '00000000-0000-0000-0000-000000000099' } } : null;
export const supabase = {
  auth: {
    // Supabase getSession normally reads local storage; it is not a network hop.
    async getSession() { return { data: { session: session() }, error: null }; },
    async refreshSession() { return request('auth.refreshSession', fixture.authMs, () => success({ session: session() })); },
    async setSession(_tokens: unknown) {
      // Installed SDK setSession verifies an unexpired token via GET /auth/v1/user.
      return request('auth.setSession/getUser', fixture.authMs, () => {
        if (fixture.authFailuresRemaining > 0) { fixture.authFailuresRemaining -= 1; return { data: { session: null, user: null }, error: { code: 'FIXTURE_AUTH', message: 'Synthetic session confirmation failed' }, status: 503 }; }
        fixture.authenticated = true; fixture.valid = true; return success({ session: session(), user: session()?.user });
      });
    },
    async signOut() { fixture.authenticated = false; fixture.valid = false; return { error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
  },
  functions: { async invoke(name: string, options: { body: Row }) {
    if (name === 'manage-ebd-class-password' && options.body.action === 'list') {
      return request('edge.manage-ebd-class-password/list', fixture.edgeMs, () => {
        if (!fixture.authenticated || !fixture.valid) return denied();
        return success({ class_ids: classes.map(classroom => classroom.id), passwords: {
          'fixture-class-a': '123456', 'fixture-class-b': '654321',
        } });
      });
    }
    if (name === 'manage-ebd-class-password' && ['set', 'clear'].includes(String(options.body.action))) {
      throw new Error('Benchmark disallows credential writes');
    }
    operation(fixture.authenticated ? 'pin-renewal' : name === 'ebd-class-login' ? 'professor-login' : 'admin-login');
    return request(`edge.${name}`, fixture.edgeMs, () => {
      if ((options.body.admin_pin || options.body.pin) !== '123456') return success({ success: false, error: 'PIN fictício incorreto' });
      return success({ success: true, session: { access_token: 'synthetic-ebd-token', refresh_token: 'synthetic-refresh' }, birthday_ai_token: 'synthetic-birthday-token', birthday_ai_expires_at: exp(), teacher: { name: options.body.name || 'Professor Fictício', class_id: classes[0].id } });
    });
  } },
  async rpc(name: string) {
    return request(`rpc.${name}`, fixture.readMs, () => {
      if (name === 'ebd_session_valid') return success(fixture.authenticated && fixture.valid);
      if (!fixture.authenticated || !fixture.valid) return denied();
      if (name === 'list_birthdays') return success(birthdays);
      if (name === 'ebd_closure') return success(null);
      if (name === 'ebd_is_admin') return success(storedRole === 'admin');
      throw new Error(`Unsupported synthetic RPC ${name}`);
    });
  },
  from(table: string) {
    const filters: Row = {};
    const chain = {
      select() { return chain; }, eq(key: string, value: unknown) { filters[key] = value; return chain; },
      order() { return chain; }, gte() { return chain; }, range() { return chain; }, abortSignal() { return chain; },
      insert() { throw new Error('Benchmark disallows data writes'); }, update() { throw new Error('Benchmark disallows data writes'); }, delete() { throw new Error('Benchmark disallows data writes'); }, upsert() { throw new Error('Benchmark disallows data writes'); },
      then(resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) {
        return request(`read.${table}`, fixture.readMs, () => {
          if (!fixture.authenticated || !fixture.valid) return denied();
          const rows = table === 'ebd_classes' ? classes : table === 'ebd_students' ? students : table === 'ebd_call_status' ? callStatuses : table === 'ebd_attendance' ? visualAttendance : table === 'ebd_class_logins' ? visualLogins : [];
          return success(rows.filter(row => Object.entries(filters).every(([key, value]) => (row as Row)[key] === value)));
        }, { ...filters }).then(resolve, reject);
      },
    }; return chain;
  },
  channel(_name: string) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = { on() { return channel; }, subscribe(callback: (status: string) => void) { timer = setTimeout(() => callback('SUBSCRIBED'), fixture.realtimeMs); return channel; }, unsubscribe() { clearTimeout(timer); } };
    return channel;
  },
  async removeChannel(channel: { unsubscribe(): void }) { channel.unsubscribe(); return 'ok'; },
};
