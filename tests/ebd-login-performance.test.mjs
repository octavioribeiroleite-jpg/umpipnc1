import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createRefreshQueue } from '../src/lib/refresh-queue.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
const pageText = readFileSync(new URL('../src/pages/Secretaria.tsx', import.meta.url), 'utf8');
const page = ts.createSourceFile('Secretaria.tsx', pageText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function actualFunction(name, scope) {
  let initializer;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(page) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(page);
  assert.ok(initializer, 'Actual Secretaria function must exist: ' + name);
  if (name === 'readData') initializer = initializer.arguments[0];
  const js = ts.transpileModule('return (' + initializer.getText(page) + ');', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(scope), js)(...Object.values(scope));
}

function entryFixture({ profile = 'admin', accessLevel = null } = {}) {
  const state = { loading: false, accessLevel, loginStep: 'pin', pendingPin: '123456', pinError: false, saved: null, professorNome: 'Pessoa fictícia', professorClassId: 'fixture-class', aiReauthOpen: true };
  const requests = [], accepting = [], messages = [];
  const ref = { current: false };
  let edgeFailure = null, authFailure = null;
  const response = {
    success: true, session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' },
    teacher: { name: 'Pessoa fictícia', class_id: 'fixture-class' },
    birthday_ai_token: 'synthetic-birthday', birthday_ai_expires_at: '2026-10-06T23:59:59Z',
  };
  const scope = {
    entryRequestRef: ref, selectedProfile: profile, accessLevel,
    nameInput: ' Pessoa fictícia ', pendingPin: state.pendingPin,
    professorNome: state.professorNome, professorClassId: state.professorClassId,
    toast: { error: message => messages.push(message), success: message => messages.push(message) },
    setTimeout: () => 1,
    saveStoredEbdSession: value => { state.saved = value; },
    supabase: {
      functions: { async invoke(name, options) {
        requests.push({ kind: 'edge', name, options });
        if (edgeFailure) throw edgeFailure;
        return { data: response, error: null };
      } },
      auth: { setSession(session) {
        requests.push({ kind: 'auth', session });
        return new Promise(resolve => accepting.push(() => resolve({ error: authFailure })));
      } },
    },
  };
  for (const name of ['Loading', 'AccessLevel', 'LoginStep', 'PendingPin', 'PinError', 'AdminPin', 'ProfessorNome', 'ProfessorClassId', 'BirthdayAiToken', 'BirthdayAiExpiresAt', 'NameInput', 'AiReauthOpen']) {
    scope['set' + name] = value => { state[name[0].toLowerCase() + name.slice(1)] = value; };
  }
  return {
    state, requests, messages, ref, response,
    handler: name => actualFunction(name, scope),
    accept() { assert.ok(accepting.length); accepting.shift()(); },
    failEdge(error) { edgeFailure = error; },
    failAuth(error) { authFailure = error; },
  };
}

for (const [handler, profile, accessLevel] of [
  ['handlePinComplete', 'admin', null],
  ['handleNameSubmit', 'professor', null],
  ['refreshBirthdaySession', 'admin', 'admin'],
  ['refreshBirthdaySession', 'professor', 'professor'],
]) test(handler + ' / ' + profile + ' serializes entry and stays busy until the SDK accepts the session', async () => {
  const fixture = entryFixture({ profile, accessLevel });
  const submit = fixture.handler(handler);
  const pending = submit('123456');
  await tick();
  assert.equal(fixture.state.loading, true);
  assert.equal(fixture.ref.current, true);
  assert.equal(fixture.state.accessLevel, accessLevel, 'An unaccepted session must not grant new access');
  assert.equal(fixture.state.saved, null);
  await submit('123456');
  assert.equal(fixture.requests.filter(request => request.kind === 'edge').length, 1);
  assert.equal(fixture.requests.filter(request => request.kind === 'auth').length, 1);
  assert.deepEqual(fixture.requests.at(-1).session, fixture.response.session, 'Install the server session with the SDK');
  fixture.accept(); await pending;
  assert.equal(fixture.state.loading, false);
  assert.equal(fixture.ref.current, false);
  assert.equal(fixture.state.saved.accessLevel, profile);
  assert.equal(fixture.state.accessLevel, profile);
});

test('professor PIN advances to name immediately without an unnecessary validation request', async () => {
  const fixture = entryFixture({ profile: 'professor' });
  await fixture.handler('handlePinComplete')('123456');
  assert.equal(fixture.state.loginStep, 'name');
  assert.equal(fixture.state.pendingPin, '123456');
  assert.equal(fixture.state.loading, false);
  assert.equal(fixture.ref.current, false);
  assert.deepEqual(fixture.requests, []);
});

for (const handler of ['handlePinComplete', 'handleNameSubmit', 'refreshBirthdaySession']) {
  test(handler + ' releases a failed request for retry without granting access', async () => {
    const originalAccess = handler === 'refreshBirthdaySession' ? 'admin' : null;
    const fixture = entryFixture({ profile: handler === 'handleNameSubmit' ? 'professor' : 'admin', accessLevel: originalAccess });
    fixture.failEdge(new Error('Synthetic transport error'));
    await fixture.handler(handler)('123456');
    assert.equal(fixture.state.loading, false);
    assert.equal(fixture.ref.current, false);
    assert.equal(fixture.state.accessLevel, originalAccess);
    assert.equal(fixture.state.saved, null);
    assert.equal(fixture.requests.filter(request => request.kind === 'auth').length, 0);
    fixture.failEdge(null);
    const retry = fixture.handler(handler)('123456'); await tick();
    fixture.accept(); await retry;
    assert.ok(fixture.state.saved);
  });
}

test('SDK rejection leaves the name entry available for retry and stores no new access', async () => {
  const fixture = entryFixture({ profile: 'professor' });
  fixture.failAuth(new Error('Synthetic auth error'));
  const pending = fixture.handler('handleNameSubmit')(); await tick();
  fixture.accept(); await pending;
  assert.equal(fixture.state.loading, false);
  assert.equal(fixture.ref.current, false);
  assert.equal(fixture.state.accessLevel, null);
  assert.equal(fixture.state.saved, null);
  assert.ok(fixture.messages.includes('Não foi possível entrar.'));
});

test('a wrong admin PIN keeps the existing error flow and never installs or saves a session', async () => {
  const fixture = entryFixture();
  fixture.response.success = false;
  await fixture.handler('handlePinComplete')('000000');
  assert.equal(fixture.state.pinError, true);
  assert.equal(fixture.state.loading, false);
  assert.equal(fixture.state.accessLevel, null);
  assert.equal(fixture.state.saved, null);
  assert.equal(fixture.requests.length, 1);
  assert.ok(fixture.messages.includes('PIN incorreto'));
});

test('one authorized student read supplies both the full and active snapshots', async () => {
  const students = [
    { id: 'a', name: 'Aluno ativo', active: true, class_id: 'fixture-class' },
    { id: 'b', name: 'Aluno inativo', active: false, class_id: 'fixture-class' },
  ];
  const requests = [], state = {}, dispatches = [];
  const scope = {
    sundayDate: '2026-10-06', dataScopeRef: { current: 'synthetic-access' },
    attendanceQueue: { readVersion: () => 1, reconcile: rows => rows },
    captureEbdSnapshot: () => 1, assertEbdSnapshotCurrent() {},
    supabase: {
      rpc: async name => { requests.push(name); return { data: name === 'ebd_session_valid' ? true : null, error: null }; },
      from(table) {
        dispatches.push(table);
        const chain = {
          select() { return chain; }, eq() { return chain; }, order() { return chain; },
          then(resolve) { requests.push(table); return Promise.resolve({ data: table === 'ebd_students' ? students : [], error: null }).then(resolve); },
        };
        return chain;
      },
    },
  };
  for (const name of ['CallStatuses', 'Classes', 'ActiveStudents', 'AllStudents', 'Attendance', 'ClassVisitors', 'DayIsClosed', 'ClosureId', 'VisitorCount', 'AiReauthOpen']) {
    scope['set' + name] = value => { state[name] = value; };
  }
  const read = actualFunction('readData', scope);
  let snapshotStarts = 0;
  const snapshot = await read(() => {
    snapshotStarts++;
    assert.deepEqual(requests, ['ebd_session_valid']);
    assert.deepEqual(dispatches, [], 'The phase signal must precede every data query');
  });
  assert.equal(snapshotStarts, 1);
  assert.equal(requests[0], 'ebd_session_valid');
  assert.equal(requests.filter(name => name === 'ebd_students').length, 1);
  assert.equal(requests.length, 7);
  assert.deepEqual(state.AllStudents, students);
  assert.deepEqual(state.ActiveStudents, [students[0]]);
  assert.deepEqual(snapshot.activeStudents, [students[0]]);
  requests.length = 0;
  scope.supabase.rpc = async name => { requests.push(name); return { data: false, error: null }; };
  await assert.rejects(read(() => { snapshotStarts++; }), /Confirme o PIN/);
  assert.deepEqual(requests, ['ebd_session_valid'], 'An invalid session must not begin data queries');
  assert.equal(snapshotStarts, 1, 'Rejected authorization must not report a snapshot start');
});

test('birthday loading remains enabled by default, while EBD can suppress pre-login reads', async () => {
  const queries = [], requests = [];
  const backend = { rpc: async name => { requests.push(name); return { data: [], error: null }; } };
  const scope = {
    mainSupabase: backend, useQueryClient: () => ({ invalidateQueries() {} }), useMutation: () => ({}),
    useQuery(options) {
      queries.push(options);
      if (options.enabled !== false) void options.queryFn();
      return { data: [], isLoading: false };
    },
  };
  const source = readFileSync(new URL('../src/hooks/useBirthdays.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const js = ts.transpileModule(source + '\nreturn useBirthdays;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const hook = new Function(...Object.keys(scope), js)(...Object.values(scope));
  hook(); hook(backend, 'ebd-null', { enabled: false }); hook(backend, 'ebd-admin', { enabled: true });
  await tick();
  assert.deepEqual(queries.map(query => query.enabled), [true, false, true]);
  assert.deepEqual(requests, ['list_birthdays', 'list_birthdays']);
});

function syncFixture({ coalesceBeforeSnapshot = true, reportSnapshotStart = true, enabled = true, subscribeImmediately = false, defaultOptions = false } = {}) {
  let now = 0, timerId = 0, subscribed, active = 0, maximum = 0, invalidations = 0;
  const timeouts = new Map(), intervals = new Map(), windowEvents = new Map(), documentEvents = new Map();
  const reads = [], snapshots = [], validations = [], releases = [], changes = [], cleanups = [];
  const fakeTimeout = (callback, ms) => { const id = ++timerId; timeouts.set(id, { callback, at: now + ms }); return id; };
  const channel = {
    on(_event, _filter, callback) { changes.push(callback); return channel; },
    subscribe(callback) { subscribed = callback; if (subscribeImmediately) callback('SUBSCRIBED'); return channel; },
  };
  const document = { visibilityState: 'visible', addEventListener: (name, callback) => documentEvents.set(name, callback), removeEventListener: name => documentEvents.delete(name) };
  const scope = {
    useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
    useMemo: factory => factory(), useRef: current => ({ current }), useState: value => [value, () => {}],
    createRefreshQueue, markEbdDataChanged: () => { invalidations++; },
    supabase: { channel: () => channel, removeChannel: async () => {} },
    crypto: { randomUUID: () => 'fixture' }, document,
    setTimeout: fakeTimeout, clearTimeout: id => timeouts.delete(id),
    window: {
      setInterval: callback => { const id = ++timerId; intervals.set(id, callback); return id; },
      clearInterval: id => intervals.delete(id),
      addEventListener: (name, callback) => windowEvents.set(name, callback),
      removeEventListener: name => windowEvents.delete(name),
    },
  };
  const source = readFileSync(new URL('../src/hooks/useEbdSync.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export function', 'function');
  const js = ts.transpileModule(source + '\nreturn useEbdSync;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const hook = new Function(...Object.keys(scope), js)(...Object.values(scope));
  const result = hook(enabled, 'synthetic-scope', async onSnapshotStart => {
    reads.push(now); maximum = Math.max(maximum, ++active);
    try {
      await new Promise((resolve, reject) => validations.push({ resolve, reject }));
      if (reportSnapshotStart) onSnapshotStart?.();
      snapshots.push(now);
      await new Promise(resolve => releases.push(resolve));
    } finally { active--; }
  }, defaultOptions ? undefined : { coalesceBeforeSnapshot });
  return {
    reads, snapshots, timeouts, intervals, document, documentEvents, windowEvents,
    status: status => subscribed(status),
    change: () => changes[0](),
    refresh: result.refresh,
    maximum: () => maximum, invalidations: () => invalidations,
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of [...timeouts]) if (timer.at <= now) { timeouts.delete(id); timer.callback(); }
    },
    async validate({ subscribeBeforeContinuation = false } = {}) {
      assert.ok(validations.length);
      validations.shift().resolve();
      if (subscribeBeforeContinuation) subscribed('SUBSCRIBED');
      await tick();
    },
    async failValidation() {
      assert.ok(validations.length);
      validations.shift().reject(new Error('Synthetic authorization transport failure'));
      await tick();
    },
    async finish() { assert.ok(releases.length); releases.shift()(); await tick(); },
    stop() { cleanups.forEach(cleanup => cleanup()); },
  };
}

test('data validation starts immediately without waiting for Realtime, and no subscription still produces a snapshot', async () => {
  const fixture = syncFixture();
  assert.deepEqual(fixture.reads, [0]);
  assert.equal(fixture.timeouts.size, 0, 'Initial loading must have no artificial delay');
  await fixture.validate();
  assert.deepEqual(fixture.snapshots, [0]);
  await fixture.finish();
  assert.equal(fixture.reads.length, 1);
  fixture.stop();
});

for (const timing of ['during validation', 'after validation resolves but before data dispatch', 'synchronous subscribe callback']) {
  test('first SUBSCRIBED ' + timing + ' is covered by the upcoming initial snapshot', async () => {
    const fixture = syncFixture({ subscribeImmediately: timing === 'synchronous subscribe callback' });
    if (timing === 'during validation') fixture.status('SUBSCRIBED');
    await fixture.validate({ subscribeBeforeContinuation: timing === 'after validation resolves but before data dispatch' });
    await fixture.finish();
    assert.deepEqual(fixture.reads, [0]);
    assert.deepEqual(fixture.snapshots, [0]);
    assert.equal(fixture.maximum(), 1);
    fixture.stop();
  });
}

test('SUBSCRIBED after data dispatch queues a second snapshot without delaying the first', async () => {
  const fixture = syncFixture();
  await fixture.validate(); assert.deepEqual(fixture.snapshots, [0]);
  fixture.advance(100); fixture.status('SUBSCRIBED');
  assert.equal(fixture.reads.length, 1, 'Reads stay serialized');
  await fixture.finish(); assert.deepEqual(fixture.reads, [0, 100]);
  await fixture.validate();
  await fixture.finish(); assert.equal(fixture.maximum(), 1);
  fixture.stop();
});

test('late first SUBSCRIBED after the snapshot has settled reads current data again', async () => {
  const fixture = syncFixture();
  await fixture.validate(); await fixture.finish();
  fixture.advance(200); fixture.status('SUBSCRIBED');
  assert.deepEqual(fixture.reads, [0, 200]);
  await fixture.validate(); await fixture.finish();
  fixture.stop();
});

test('legacy reads without explicit phase opt-in retain their subscription follow-up', async () => {
  const fixture = syncFixture({ defaultOptions: true, reportSnapshotStart: false });
  fixture.status('SUBSCRIBED');
  await fixture.validate(); await fixture.finish();
  assert.equal(fixture.reads.length, 2, 'HistoricalChamada cannot assume a validation phase');
  await fixture.validate(); await fixture.finish();
  fixture.stop();
});

test('a coalesced initial subscription retries validation failure once, without an endless loop', async () => {
  const fixture = syncFixture();
  fixture.status('SUBSCRIBED');
  await fixture.failValidation();
  assert.equal(fixture.reads.length, 2, 'Failed validation must preserve the subscription follow-up');
  await fixture.failValidation();
  assert.equal(fixture.reads.length, 2, 'A persistent error waits for the normal lifecycle or poll retry');
  assert.equal(fixture.maximum(), 1);
  void fixture.refresh();
  await fixture.validate(); await fixture.finish();
  assert.equal(fixture.reads.length, 3);
  fixture.stop();
});

test('reconnection and changes during a read retain authoritative follow-up snapshots', async () => {
  const fixture = syncFixture();
  fixture.status('SUBSCRIBED'); await fixture.validate(); await fixture.finish();
  fixture.status('CHANNEL_ERROR'); fixture.status('SUBSCRIBED');
  assert.equal(fixture.reads.length, 2, 'Reconnection must fetch again');
  fixture.change(); fixture.change();
  assert.equal(fixture.invalidations(), 2, 'Invalidate snapshots before the debounced read');
  fixture.advance(150); assert.equal(fixture.reads.length, 2);
  await fixture.validate();
  await fixture.finish(); assert.equal(fixture.reads.length, 3);
  await fixture.validate();
  await fixture.finish(); assert.equal(fixture.maximum(), 1);
  fixture.stop();
});

test('changes before an initial snapshot invalidate it immediately and retain a queued authoritative read', async () => {
  const fixture = syncFixture();
  fixture.status('SUBSCRIBED'); fixture.change(); fixture.advance(150);
  assert.equal(fixture.invalidations(), 1);
  await fixture.validate(); await fixture.finish();
  assert.equal(fixture.reads.length, 2);
  await fixture.validate(); await fixture.finish();
  fixture.stop();
});

test('poll and foreground lifecycle events serialize a follow-up, while hidden pages defer reads', async () => {
  const fixture = syncFixture();
  fixture.documentEvents.get('visibilitychange')();
  fixture.windowEvents.get('online')(); fixture.windowEvents.get('focus')();
  await fixture.validate(); await fixture.finish();
  assert.equal(fixture.reads.length, 2);
  await fixture.validate(); await fixture.finish();
  fixture.document.visibilityState = 'hidden';
  fixture.windowEvents.get('focus')(); fixture.documentEvents.get('visibilitychange')();
  [...fixture.intervals.values()][0]();
  assert.equal(fixture.reads.length, 2, 'Hidden lifecycle signals must not start a read');
  fixture.document.visibilityState = 'visible';
  [...fixture.intervals.values()][0]();
  assert.equal(fixture.reads.length, 3);
  await fixture.validate(); await fixture.finish();
  fixture.stop();
});

test('cleanup removes polling and lifecycle listeners and suppresses queued reads from an old scope', async () => {
  const fixture = syncFixture();
  fixture.status('SUBSCRIBED'); fixture.change(); fixture.advance(150);
  fixture.stop(); await fixture.failValidation(); fixture.advance(1000);
  assert.equal(fixture.reads.length, 1, 'Disposed initial failure must not start its queued retry');
  assert.equal(fixture.timeouts.size, 0);
  assert.equal(fixture.intervals.size, 0);
  assert.equal(fixture.windowEvents.size, 0);
  assert.equal(fixture.documentEvents.size, 0);
  const renewed = syncFixture();
  renewed.status('SUBSCRIBED'); await renewed.validate(); await renewed.finish();
  assert.equal(renewed.reads.length, 1, 'Renewed scopes have their own initial subscription phase');
  renewed.stop();
});

test('disabled synchronization makes no request or subscription before access is accepted', () => {
  const fixture = syncFixture({ enabled: false });
  assert.equal(fixture.reads.length, 0);
  assert.equal(fixture.timeouts.size, 0);
  assert.equal(fixture.intervals.size, 0);
  assert.equal(fixture.windowEvents.size, 0);
  assert.equal(fixture.documentEvents.size, 0);
});
