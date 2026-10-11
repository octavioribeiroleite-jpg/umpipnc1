import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { buildDayRoster, buildDayClasses, normalizeDayClosure } from '../src/lib/ebd-roster.ts';
import { captureEbdSnapshot, assertEbdSnapshotCurrent } from '../src/lib/ebd-attendance-queue.ts';

// Execute the shipped page's handlers/calculations. These are synthetic backend
// tests, not React rendering, a real PIN login or production attendance writes.
const pageText = readFileSync(new URL('../src/pages/Secretaria.tsx', import.meta.url), 'utf8');
const page = ts.createSourceFile('Secretaria.tsx', pageText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function actual(name, scope, callback = false) {
  let initializer;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(page) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(page);
  assert.ok(initializer, `Actual ${name} must exist`);
  if (callback) initializer = initializer.arguments[0];
  const compiled = ts.transpileModule('return (' + initializer.getText(page) + ');', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(scope), compiled)(...Object.values(scope));
}
const date = '2026-10-11';
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

function harness() {
  const state = { visitors: {}, visitorCount: 0, statuses: {}, notifications: 0, reports: [], successes: [], refreshes: 0 };
  const backend = {
    rows: new Map(), writes: [], reads: [], hold: null, loseNext: false, readError: false, rejectWrite: null,
    from() {
      let action, payload;
      const filters = [];
      const chain = {
        insert(value) { action = 'insert'; payload = value; return chain; },
        delete() { action = 'delete'; return chain; },
        select() { return chain; },
        eq(key, value) { filters.push([key, value]); return chain; },
        async single() {
          backend.writes.push({ action, payload, filters });
          if (backend.hold) await backend.hold.promise;
          if (backend.rejectWrite) return { data: null, error: backend.rejectWrite };
          let row;
          if (action === 'insert') {
            if (backend.rows.has(payload.id)) return { data: null, error: { code: '23505', message: 'Synthetic duplicate ID' } };
            row = { ...payload }; backend.rows.set(payload.id, row);
          } else {
            row = [...backend.rows.values()].find(value => filters.every(([key, expected]) => value[key] === expected));
            if (!row) return { data: null, error: { code: 'PGRST116', message: 'No authorized row' } };
            backend.rows.delete(row.id);
          }
          if (backend.loseNext) { backend.loseNext = false; return { data: null, error: { message: 'Synthetic response lost' } }; }
          return { data: row, error: null };
        },
        async maybeSingle() {
          backend.reads.push(filters);
          if (backend.readError) return { data: null, error: { message: 'Synthetic read unavailable' } };
          const row = [...backend.rows.values()].find(value => filters.every(([key, expected]) => value[key] === expected));
          return { data: row ?? null, error: null };
        },
      };
      return chain;
    },
  };
  const scope = {
    supabase: backend, sundayDate: date, professorNome: 'Professor sintético',
    dataScopeRef: { current: 'synthetic-access' }, visitorMutationRef: { current: false }, dayMutationRef: { current: false },
    visitorAttemptRef: { current: null }, crypto: { randomUUID },
    ensureEbdSession: async () => {},
    reportEbdWriteError: async error => { state.reports.push(error); },
    notifyEbdChange: () => { state.notifications++; },
    setClassVisitors: action => { state.visitors = typeof action === 'function' ? action(state.visitors) : action; },
    setVisitorCount: value => { state.visitorCount = value; },
    setCallStatuses: action => { state.statuses = action(state.statuses); },
    setEbdCallStatus: async () => {}, closeEbdDay: async () => {}, reopenEbdDay: async () => {}, closureId: 'synthetic-closure',
    fetchData: async () => { state.refreshes++; }, toast: { success: message => { state.successes.push(message); } },
  };
  return { state, backend, scope, handler: name => actual(name, scope, name.includes('ClassVisitor')) };
}

test('actual current-day roster retains inactive and transferred marked pupils without changing active enrollment', () => {
  const allStudents = [
    { id: 'active', name: 'Ativo', class_id: 'a', active: true, created_at: '2026-01-01T12:00:00Z' },
    { id: 'inactive', name: 'Inativo', class_id: 'a', active: false, created_at: '2026-01-01T12:00:00Z' },
    { id: 'transfer', name: 'Transferido', class_id: 'b', active: true, created_at: '2026-01-01T12:00:00Z' },
  ];
  const attendance = allStudents.map(student => ({ student_id: student.id, class_id: 'a', date, present: true }));
  const activeStudents = allStudents.filter(student => student.active);
  const classes = [{ id: 'a', name: 'Sala anterior', order_index: 0, active: false }, { id: 'b', name: 'Sala atual', order_index: 1, active: true }];
  const common = { allStudents, attendance, sundayDate: date, classes, callStatuses: {}, classVisitors: {}, closureSummary: null, buildDayRoster, buildDayClasses };
  const dayRoster = actual('dayRoster', common);
  const dayClasses = actual('dayClasses', { ...common, dayRoster });
  const roster = actual('visibleAttendanceStudents', { isAdmin: true, dayRoster, professorClassId: null });
  assert.equal(roster.length, 3);
  assert.equal(attendance.filter(row => row.present).length / roster.length, 1, 'Three confirmed presences must be 3/3, not 3/2');
  assert.deepEqual(roster.map(student => student.class_id), ['a', 'a', 'a']);
  assert.deepEqual(dayClasses.map(group => group.id), ['a', 'b']);
  assert.equal(actual('visibleActiveStudents', { isAdmin: true, activeStudents, professorClassId: null }).length, 2);
  assert.deepEqual(actual('visibleAttendanceStudents', { isAdmin: false, dayRoster, professorClassId: 'b' }), []);
  assert.equal(allStudents.find(student => student.id === 'transfer').class_id, 'b');
});

test('teacher totals retain authorized marks whose pupil names and enrollment are hidden by RLS, with read-only anonymous rows', () => {
  const allStudents = [{ id: 'visible', name: 'Aluno permitido', class_id: 'own-class', active: true }];
  const attendance = [
    { student_id: 'visible', class_id: 'own-class', date, present: true },
    { student_id: 'hidden-inactive', class_id: 'own-class', date, present: true },
    { student_id: 'hidden-transfer', class_id: 'own-class', date, present: false },
  ];
  const original = structuredClone(allStudents);
  const dayRoster = actual('dayRoster', { allStudents, attendance, sundayDate: date, buildDayRoster });
  const roster = actual('visibleAttendanceStudents', { isAdmin: false, dayRoster, professorClassId: 'own-class' });
  assert.equal(roster.length, 3); assert.equal(Math.round(attendance.filter(row => row.present).length / roster.length * 100), 67);
  const hidden = roster.filter(student => student.nameUnavailable);
  assert.deepEqual(hidden.map(student => student.id).sort(), ['hidden-inactive', 'hidden-transfer']);
  assert.ok(hidden.every(student => student.name === 'Aluno com registro de presença' && student.attendanceReadOnly === true && student.class_id === 'own-class'));
  assert.equal(roster.find(student => student.id === 'visible').attendanceReadOnly, undefined);
  assert.deepEqual(allStudents, original, 'A permitted historical record must not create or mutate a student registration');
  assert.deepEqual(buildDayRoster(allStudents, [], date), original, 'No anonymous row may be created without an authorized attendance identity');
  const repeated = buildDayRoster(allStudents, [...attendance, attendance[1]], date);
  assert.equal(repeated.length, 3, 'The same attendance identity must not be counted twice');
});

test('lost visitor insert response is confirmed by scoped ID read, without another row', async () => {
  const h = harness(); h.backend.loseNext = true;
  await h.handler('handleAddClassVisitor')('class-a', '  Visitante sintético  ');
  assert.equal(h.backend.rows.size, 1); assert.equal(h.state.visitorCount, 1); assert.equal(h.state.reports.length, 0);
  const inserted = h.backend.writes[0].payload;
  assert.match(inserted.id, /^[0-9a-f-]{36}$/i); assert.equal(inserted.name, 'Visitante sintético');
  assert.deepEqual(h.backend.reads[0], [['id', inserted.id], ['class_id', 'class-a'], ['date', date]]);
  assert.equal(h.scope.visitorAttemptRef.current, null);
});

test('retry after lost response and failed confirmation reuses the same UUID across PIN renewal', async () => {
  const h = harness(); h.backend.loseNext = true; h.backend.readError = true;
  await assert.rejects(h.handler('handleAddClassVisitor')('class-a', 'Visitante sintético'), error => /response lost/.test(error.message));
  assert.deepEqual(h.state.visitors, {}); assert.equal(h.backend.rows.size, 1);
  const firstId = h.backend.writes[0].payload.id;
  h.scope.dataScopeRef.current = 'synthetic-renewed-access'; h.backend.readError = false;
  await h.handler('handleAddClassVisitor')('class-a', 'Visitante sintético');
  assert.equal(h.backend.writes[1].payload.id, firstId); assert.equal(h.backend.rows.size, 1);
  assert.deepEqual(h.state.visitors['class-a'], [{ id: firstId, name: 'Visitante sintético' }]);
  assert.equal(h.state.visitorCount, 1); assert.equal(h.state.notifications, 1);
});

test('late visitor insert cannot update a changed scope, but its retry can confirm the same saved ID', async () => {
  const h = harness(); h.backend.hold = deferred();
  const pending = h.handler('handleAddClassVisitor')('class-a', 'Visitante sintético'); await tick();
  h.scope.dataScopeRef.current = 'synthetic-other-access'; h.backend.hold.resolve();
  await assert.rejects(pending, /Acesso alterado/);
  assert.deepEqual(h.state.visitors, {}); assert.equal(h.state.notifications, 0); assert.equal(h.state.reports.length, 0);
  const id = h.backend.writes[0].payload.id;
  h.backend.hold = null;
  await h.handler('handleAddClassVisitor')('class-a', 'Visitante sintético');
  assert.equal(h.backend.rows.size, 1); assert.equal(h.state.visitors['class-a'][0].id, id);
});

test('synchronous visitor guard blocks double submit and finalization/closure while insertion is pending', async () => {
  const h = harness(); h.backend.hold = deferred();
  const pending = h.handler('handleAddClassVisitor')('class-a', null); await tick();
  await assert.rejects(h.handler('handleAddClassVisitor')('class-a', null), /Aguarde/);
  await assert.rejects(h.handler('handleCloseDay')(), /Aguarde/);
  await assert.rejects(h.handler('handleCallStatusChange')('class-a', 'finalizada'), /Aguarde/);
  await h.handler('handleRemoveClassVisitor')('class-a', 'another-id');
  assert.equal(h.backend.writes.length, 1); assert.equal(h.backend.writes[0].payload.name, null);
  h.backend.hold.resolve(); await pending; assert.equal(h.scope.visitorMutationRef.current, false);
});

test('visitor rejection retains the confirmed list and changed input starts another unique attempt', async () => {
  const h = harness(); h.backend.rejectWrite = { code: '42501', message: 'Synthetic closed class' };
  await assert.rejects(h.handler('handleAddClassVisitor')('class-a', 'Primeiro nome'), error => error.code === '42501');
  assert.deepEqual(h.state.visitors, {}); assert.equal(h.state.notifications, 0); assert.equal(h.scope.visitorMutationRef.current, false);
  const firstId = h.backend.writes[0].payload.id;
  h.backend.rejectWrite = null;
  await h.handler('handleAddClassVisitor')('class-a', 'Outro nome');
  assert.notEqual(h.backend.writes[1].payload.id, firstId); assert.equal(h.state.visitorCount, 1);
  h.scope.ensureEbdSession = async () => { throw new Error('Synthetic expired PIN'); };
  await assert.rejects(h.handler('handleAddClassVisitor')('class-a', 'Sem acesso'), /expired PIN/);
  assert.equal(h.backend.writes.length, 2); assert.equal(h.scope.visitorMutationRef.current, false);
});

test('visitor deletion is bounded by ID/class/date and never removes UI data on failure or old-scope response', async () => {
  const h = harness(); const row = { id: 'visitor', class_id: 'class-a', date, name: 'Nome sintético' };
  h.backend.rows.set(row.id, row); h.state.visitors = { 'class-a': [{ id: row.id, name: row.name }] }; h.state.visitorCount = 1;
  h.backend.rejectWrite = { code: '42501', message: 'Synthetic rejection' };
  await h.handler('handleRemoveClassVisitor')('class-a', row.id);
  assert.equal(h.state.visitorCount, 1); assert.equal(h.backend.rows.size, 1);
  assert.deepEqual(h.backend.writes[0].filters, [['id', row.id], ['class_id', 'class-a'], ['date', date]]);
  h.backend.rejectWrite = null; h.backend.hold = deferred();
  const pending = h.handler('handleRemoveClassVisitor')('class-a', row.id); await tick();
  h.scope.dataScopeRef.current = 'synthetic-renewed'; h.backend.hold.resolve(); await pending;
  assert.equal(h.state.visitorCount, 1); assert.equal(h.state.notifications, 0);
  assert.equal(h.backend.rows.size, 0, 'An old authorized deletion may finish, but cannot mutate the renewed screen');
});

test('status/close/reopen handlers serialize and discard completion UI after an access change', async () => {
  for (const name of ['handleCallStatusChange', 'handleCloseDay', 'handleReopenDay']) {
    const h = harness(); const hold = deferred();
    if (name === 'handleCallStatusChange') h.scope.setEbdCallStatus = () => hold.promise;
    else if (name === 'handleCloseDay') h.scope.closeEbdDay = () => hold.promise;
    else h.scope.reopenEbdDay = () => hold.promise;
    const action = () => h.handler(name)('class-a', 'finalizada');
    const pending = action();
    assert.equal(h.scope.dayMutationRef.current, true);
    await assert.rejects(action(), /Aguarde/);
    await assert.rejects(h.handler('handleAddClassVisitor')('class-a', 'Aguardar'), /Aguarde/);
    h.scope.dataScopeRef.current = 'synthetic-other-scope'; hold.resolve(); await pending;
    assert.deepEqual(h.state.statuses, {}); assert.deepEqual(h.state.successes, []); assert.equal(h.state.refreshes, 0);
    assert.equal(h.scope.dayMutationRef.current, false);
  }
});

test('teacher minimal closed-day RPC blocks editing without inventing a full closure summary', async () => {
  const state = { dayIsClosed: false, closureId: null, closureSummary: 'unset' };
  const tables = { ebd_classes: [{ id: 'own-class', active: true }], ebd_students: [], ebd_attendance: [], ebd_class_visitor_entries: [], ebd_call_status: [] };
  const supabase = {
    rpc: async name => ({ data: name === 'ebd_session_valid' ? true : { id: 'closed-day-id', date, visitor_count: 0 }, error: null }),
    from(table) { const chain = { select() { return chain; }, order() { return chain; }, eq() { return chain; },
      then(resolve, reject) { return Promise.resolve({ data: tables[table], error: null }).then(resolve, reject); } }; return chain; },
  };
  const scope = {
    supabase, sundayDate: date, dataScopeRef: { current: 'synthetic-teacher' }, captureEbdSnapshot, assertEbdSnapshotCurrent, normalizeDayClosure,
    attendanceQueue: { readVersion: () => ({}), reconcile: rows => rows },
    setCallStatuses() {}, setClasses() {}, setActiveStudents() {}, setAllStudents() {}, setAttendance() {}, setClassVisitors() {}, setVisitorCount() {}, setAiReauthOpen() {},
    setDayIsClosed: value => { state.dayIsClosed = value; }, setClosureId: value => { state.closureId = value; }, setClosureSummary: value => { state.closureSummary = value; },
  };
  await actual('readData', scope, true)();
  assert.equal(state.dayIsClosed, true); assert.equal(state.closureId, 'closed-day-id'); assert.equal(state.closureSummary, null);
  assert.equal(normalizeDayClosure({ id: 'closed-day-id', date, visitor_count: 0 }), null);
});
