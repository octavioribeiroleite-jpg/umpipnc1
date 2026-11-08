import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { planNextElection, saveNextElection } from '../src/lib/next-election.ts';
import { createUmpSequence, findElectionSequence, reserveSequenceAttendance, UMP_POSITIONS } from '../src/lib/election-sequence.ts';
import { withBrowserBallotLock } from '../src/lib/browser-ballot-lock.ts';
import { readElectionCount, requireElectionCount, reconcileElectionCount } from '../src/lib/election-completion.ts';
import { isBallotConfirmed } from '../src/components/eleicoes/ballot-response.ts';

function handler(file, name, context) {
  const source = ts.createSourceFile(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) declaration = node; ts.forEachChild(node, visit); };
  visit(source); assert.ok(declaration?.initializer, name);
  const sandbox = { roomSession: undefined, electionRoomRpc: async (name, args) => ({ data: name === 'election_room_ensure' ? { room_token: 'fixture-room' } : { success: true }, error: null }), ...context };
  vm.runInNewContext(ts.transpileModule(`globalThis.handler = ${declaration.initializer.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return sandbox.handler;
}

function memoryStorage() {
  const entries = new Map();
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}
function localDatabase(source = []) {
  const tables = { elections: structuredClone(source), election_attendance: [], election_votes: [{ id: 'old-vote', election_id: 'source' }], election_candidates: [{ id: 'old-candidate', election_id: 'source' }], election_devices: [] };
  const calls = []; let failure;
  return { tables, calls, fail: (table, operation, after = false) => { failure = { table, operation, after }; }, from(table) {
    let operation = 'select', payload, single = false, offset = 0, limit = Infinity; const filters = [];
    const query = { order() { return query; }, range(from, to) { offset = from; limit = to-from+1; return query; }, select() { return query; }, eq(key, value) { filters.push(row => row[key] === value); return query; }, maybeSingle() { single = true; return query; }, single() { single = true; return query; },
      insert(value) { operation = 'insert'; payload = value; return query; }, upsert(value) { operation = 'upsert'; payload = value; return query; }, update(value) { operation = 'update'; payload = value; return query; },
      async then(resolve, reject) {
        calls.push({ table, operation });
        const fail = failure?.table === table && failure.operation === operation ? failure : null;
        if (fail) failure = null;
        if (fail && !fail.after) return Promise.resolve({ data: null, error: new Error('isolated failure') }).then(resolve, reject);
        let rows = tables[table].filter(row => filters.every(filter => filter(row))).slice(offset, offset + limit);
        if (operation === 'insert' || operation === 'upsert') {
          rows = (Array.isArray(payload) ? payload : [payload]).map(row => structuredClone(row));
          for (const row of rows) { const old = tables[table].find(item => item.id === row.id); if (old && operation === 'upsert') Object.assign(old, row); else if (old) return resolve({ error: new Error('duplicate ID') }); else tables[table].push(row); }
        }
        if (operation === 'update') rows.forEach(row => Object.assign(row, payload));
        return Promise.resolve({ data: fail ? null : single ? rows[0] || null : rows, error: fail ? new Error('lost response') : null }).then(resolve, reject);
      } };
    return query;
  } };
}
const original = { id: 'source', current_round: 1, society_id: 'society', status: 'finished', type: 'cargo', voting_mode: 'both', created_by: 'organizer', total_present: 2 };
const people = [{ id: 'a', name: 'Pessoa fictícia A', present: true }, { id: 'b', name: 'Pessoa fictícia B', present: false }, { id: 'c', name: 'Pessoa fictícia C', present: true }];
const input = { userId: 'organizer', name: 'Diretoria fictícia', position: 'Vice-presidente', seats: 1 };

test('next election copies only names/presences and starts an independent draft in round one', async () => {
  const plan = planNextElection(original, people, input);
  assert.notEqual(plan.election.id, original.id); assert.equal(plan.election.total_present, 0);
  assert.equal(plan.election.current_round, 1); assert.equal(plan.election.show_result, false);
  const db = localDatabase([original]); const before = structuredClone(db.tables);
  assert.equal(await saveNextElection(db, plan), plan.election.id);
  assert.deepEqual(db.tables.elections[0], before.elections[0]);
  assert.deepEqual(db.tables.election_votes, before.election_votes); assert.deepEqual(db.tables.election_candidates, before.election_candidates);
  assert.equal(db.tables.elections[1].total_present, 2);
  assert.deepEqual(db.tables.election_attendance.map(({ name, present }) => ({ name, present })), people.map(({ name, present }) => ({ name, present })));
  assert.equal(db.calls.some(call => !['elections', 'election_attendance'].includes(call.table)), false);
});

test('lost creation, attendance and confirmation responses retry the same IDs without duplicating or touching the source', async () => {
  for (const [table, operation] of [['elections', 'insert'], ['election_attendance', 'upsert'], ['elections', 'update']]) {
    for (const after of [false, true]) {
      const db = localDatabase([original]); const plan = planNextElection(original, people, input);
      db.fail(table, operation, after);
      await assert.rejects(saveNextElection(db, plan));
      assert.equal(db.tables.elections[0].status, 'finished');
      await saveNextElection(db, plan); await saveNextElection(db, plan);
      assert.equal(db.tables.elections.length, 2); assert.equal(db.tables.election_attendance.length, 3);
      assert.equal(db.tables.elections[1].total_present, 2);
      assert.deepEqual(db.tables.elections[0], original);
    }
  }
});

test('retry never rewrites an opened target or a draft that already confirmed its attendance', async () => {
  for (const status of ['draft', 'open', 'finished']) {
    const db = localDatabase([original]); const plan = planNextElection(original, people, input);
    await saveNextElection(db, plan);
    const target = db.tables.elections[1]; target.status = status; target.total_present = 10;
    db.tables.election_attendance[0].name = 'Nome corrigido no destino';
    await saveNextElection(db, plan);
    assert.equal(target.total_present, 10); assert.equal(db.tables.election_attendance[0].name, 'Nome corrigido no destino');
  }
});

test('invalid sources/input and a draft belonging to another organizer cannot be reused', async () => {
  assert.throws(() => planNextElection({ ...original, status: 'open' }, people, input));
  for (const seats of [0, -1, 1.5, NaN]) assert.throws(() => planNextElection(original, people, { ...input, seats }));
  const plan = planNextElection(original, people, input); const db = localDatabase([{ ...plan.election, created_by: 'someone-else' }]);
  await assert.rejects(saveNextElection(db, plan)); assert.equal(db.tables.election_attendance.length, 0);
});

test('optional UMP sequence survives reload, isolates organizing accounts and reserves attendance IDs for retries', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'); const storage = memoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    const sequence = createUmpSequence('organizer', 'Diretoria UMP fictícia', 'society');
    assert.deepEqual([...UMP_POSITIONS], ['Presidente', 'Vice-presidente', '1º secretário', '2º secretário', 'Tesoureiro']);
    assert.equal(new Set(sequence.electionIds).size, 5);
    for (let index = 0; index < 5; index++) assert.equal(findElectionSequence('organizer', sequence.electionIds[index]).index, index);
    assert.equal(findElectionSequence('another-account', sequence.electionIds[0]), null);
    const ids = reserveSequenceAttendance(sequence, sequence.electionIds[1], people.map(person => person.id));
    const reloaded = findElectionSequence('organizer', sequence.electionIds[0]).sequence;
    assert.deepEqual(reserveSequenceAttendance(reloaded, sequence.electionIds[1], ['c', 'a', 'b']), ids);
    const stored = [...storage.entries.values()].join();
    for (const person of people) assert.equal(stored.includes(person.name), false);
    assert.equal(stored.includes('present'), false); assert.equal(stored.includes('candidate'), false);
    assert.equal(findElectionSequence('organizer', 'an-unrelated-single-election'), null);
  } finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
});

function votingContext(overrides = {}) {
  const context = { readError: '', loading: false, election: { voting_mode: 'both' }, electionId: 'fixture', currentRound: 1,
    loadedRoundRef: { current: 'fixture:1' }, confirmBlank: false, isMultiSeat: false, maxChoices: 1, autoBlankSlots: 0,
    confirmCandidate: { id: 'candidate' }, selectedCandidates: [], voteInFlightRef: { current: false }, ballotRequestRef: { current: null },
    crypto, ensureAudioContext: async () => null, playUrnaSound: async () => true, isIndividual: true, isUrnaMode: false, urnaToken: '', isSharedBehavior: false,
    resetTimeoutRef: { current: null }, window: { setTimeout() {} }, getDeviceId: () => 'browser-id', withBrowserBallotLock,
    checkPreviousVote: async () => ({ count: 0, error: null }), localStorage: memoryStorage(),
    setVoting() {}, setVoteError() {}, setConfirmCandidate() {}, setSelectedCandidates() {}, setConfirmBlank() {}, setConfirmSelection() {},
    setShowNullWarning() {}, setVoteSuccess() {}, setAlreadyVoted() {}, isBallotConfirmed,
    supabase: { functions: { invoke: async () => ({ data: { success: true }, error: null }) } }, ...overrides };
  return context;
}

test('individual submit serializes tabs, rereads server receipt, and never casts twice in a round', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator'); const pending = new Map();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(name, options, work) {
    assert.equal(options.mode, 'exclusive'); const result = (pending.get(name) || Promise.resolve()).then(work); pending.set(name, result.catch(() => {})); return result;
  } } } });
  try {
    let recorded = false, casts = 0, prevented = 0; const locks = [];
    const context = () => votingContext({
      withBrowserBallotLock: (name, work) => { locks.push(name); return withBrowserBallotLock(name, work); },
      checkPreviousVote: async () => ({ count: recorded ? 1 : 0, error: null }), setAlreadyVoted: value => { if (value) prevented++; },
      supabase: { functions: { invoke: async () => { await Promise.resolve(); casts++; recorded = true; return { data: { success: true }, error: null }; } } },
    });
    await Promise.all([handler('src/pages/VotePublic.tsx', 'handleVote', context())(), handler('src/pages/VotePublic.tsx', 'handleVote', context())()]);
    assert.equal(casts, 1); assert.equal(prevented, 1); assert.deepEqual(locks, ['ipnc-ballot:fixture:1', 'ipnc-ballot:fixture:1']);
  } finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator; }
});

test('shared plain link fails closed while a validated token urn still accepts subsequent voters', async () => {
  let casts = 0;
  const shared = votingContext({ election: { voting_mode: 'shared' }, supabase: { functions: { invoke: async () => { casts++; return { data: { success: true }, error: null }; } } } });
  await handler('src/pages/VotePublic.tsx', 'handleVote', shared)(); assert.equal(casts, 0);
  shared.isIndividual = false; shared.isUrnaMode = true; shared.isSharedBehavior = true; shared.urnaToken = 'valid-fixture-token';
  const submit = handler('src/pages/VotePublic.tsx', 'handleVote', shared); await submit(); await submit(); assert.equal(casts, 2);
});

test('a vote acknowledged after the next round loads cannot replace that new round with old success', async () => {
  let success = false;
  const context = votingContext({ loadedRoundRef: { current: 'fixture:2' }, setVoteSuccess: value => { success = value; } });
  await handler('src/pages/VotePublic.tsx', 'handleVote', context)(); assert.equal(success, false);
});

test('enabling personal voting keeps the old mode and reports failures until the backend acknowledges both', async () => {
  for (const failed of [true, false]) {
    let selected = 'shared', refreshed = false, reported = false;
    const db = localDatabase([{ id: 'fixture', status: 'open', voting_mode: 'shared', total_present: 12 }]);
    if (failed) db.fail('elections', 'update');
    const change = handler('src/components/eleicoes/VotingPanel.tsx', 'handleModeChange', {
      modeChangeRef: { current: false }, electionId: 'fixture', status: 'open', setLoading() {}, setSelectedMode: value => { selected = value; },
      onRefresh: () => { refreshed = true; }, toast: () => { reported = true; }, supabase: db,
    });
    assert.equal(await change('both'), !failed); assert.equal(selected, failed ? 'shared' : 'both');
    assert.equal(refreshed, !failed); assert.equal(reported, failed); assert.equal(db.tables.elections[0].total_present, 12);
  }
});

test('five UMP cargos advance with the real handler, persist across reload/retry and keep all previous results', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  try {
    const sequence = createUmpSequence('organizer', 'Diretoria fictícia', 'society');
    const db = localDatabase([{ ...original, id: sequence.electionIds[0], name: sequence.name, position: UMP_POSITIONS[0] }]);
    let attendance = structuredClone(people);
    for (let index = 0; index < 4; index++) {
      const source = db.tables.elections[index]; source.status = 'finished';
      if (index === 0) db.tables.election_attendance = people.map(person => ({ ...person, election_id: source.id }));
      db.tables.election_votes.push(...[1,2].map(n => ({id: `${source.id}-vote-${n}`, ballot_id: `${source.id}-ballot-${n}`, election_id: source.id, round_number: 1, is_blank: true, candidate_id: null})));
      const sourceBefore = structuredClone(source); const step = findElectionSequence('organizer', source.id);
      let destination, failure;
      const context = { readElectionCount, requireElectionCount, readRevision: { current: 0 }, setChecking() {}, sourceIds: { current: [] }, setCount() {}, setCountError() {}, inFlight: { current: false }, user: { id: 'organizer' }, setBusy() {}, setError: value => { failure = value; },
        plan: { current: null }, planNextElection, election: source, attendance, name: sequence.name, position: UMP_POSITIONS[index + 1], seats: '1',
        withBrowserBallotLock, step, nextPosition: UMP_POSITIONS[index + 1], reserveSequenceAttendance, saveNextElection, supabase: db,
        navigate: value => { destination = value; },
      };
      db.fail('election_attendance', 'upsert', true);
      await handler('src/components/eleicoes/NextElectionDialog.tsx', 'create', context)();
      assert.ok(failure); assert.equal(destination, undefined);
      // A fresh ref simulates reloading the page after a response was lost.
      context.plan = { current: null }; context.sourceIds = { current: [] };
      await handler('src/components/eleicoes/NextElectionDialog.tsx', 'create', context)();
      assert.equal(destination, `/eleicoes/${sequence.electionIds[index + 1]}`);
      await handler('src/components/eleicoes/NextElectionDialog.tsx', 'create', { ...context, plan: { current: null } })();
      assert.equal(db.tables.elections.length, index + 2);
      assert.deepEqual(source, sourceBefore);
      attendance = db.tables.election_attendance.filter(person => person.election_id === sequence.electionIds[index + 1]);
      assert.equal(attendance.length, people.length); assert.equal(db.tables.elections[index + 1].total_present, 2);
    }
    assert.deepEqual(db.tables.elections.map(election => election.position), [...UMP_POSITIONS]);
    assert.equal(UMP_POSITIONS[findElectionSequence('organizer', sequence.electionIds[4]).index + 1], undefined);
  } finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
});

test('start/finish report failures truthfully and never refresh the next step before acknowledgement', async () => {
  for (const name of ['handleStartVoting', 'handleFinish']) for (const failed of [true, false]) {
    const status = name === 'handleStartVoting' ? 'draft' : 'open';
    const db = localDatabase([{ id: 'fixture', status, current_round: 1, total_present: 2 }]);
    if (failed) db.fail('elections', 'update');
    let refreshed = false; const messages = [];
    await handler('src/components/eleicoes/VotingPanel.tsx', name, {
      checkCurrentCount: async () => ({ election: { total_present: 2 } }), actionRef: { current: false }, modeChangeRef: { current: false }, canStart: true, nominationsOpen: false, selectedMode: 'both', electionId: 'fixture', currentRound: 1,
      setLoading() {}, setConfirmAction() {}, supabase: db, onRefresh: () => { refreshed = true; }, toast: message => messages.push(message),
    })();
    assert.equal(refreshed, !failed); assert.equal(messages[0].variant === 'destructive', failed);
    assert.equal(db.tables.elections[0].status, failed ? status : name === 'handleStartVoting' ? 'open' : 'finished');
  }
});

function publicEffect(includes, context) {
  const file = 'src/pages/VotePublic.tsx';
  const source = ts.createSourceFile(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  const visit = node => { if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' && node.arguments[0].getText(source).includes(includes)) effect = node.arguments[0]; ts.forEachChild(node, visit); };
  visit(source); assert.ok(effect);
  const sandbox = { roomSession: undefined, electionRoomRpc: async (name, args) => ({ data: name === 'election_room_ensure' ? { room_token: 'fixture-room' } : { success: true }, error: null }), ...context };
  vm.runInNewContext(ts.transpileModule(`globalThis.effect = ${effect.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return sandbox.effect;
}

test('foreground/pageshow refresh a suspended public ballot and cross-tab receipt applies only to the matching round', () => {
  const document = Object.assign(new EventTarget(), { visibilityState: 'hidden' }); const window = new EventTarget();
  let revision = 0, blocked = false;
  const clean = publicEffect('const otherTabVoted', { document, window, electionId: 'fixture', currentRound: 2, isIndividual: true,
    setReadRevision: update => { revision = update(revision); }, setAlreadyVoted: value => { blocked = value; },
  })();
  document.dispatchEvent(new Event('visibilitychange')); assert.equal(revision, 0);
  document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); assert.equal(revision, 2);
  const receipt = round => window.dispatchEvent(Object.assign(new Event('storage'), { key: `voted_fixture_${round}`, newValue: 'true' }));
  receipt(1); assert.equal(blocked, false); receipt(2); assert.equal(blocked, true);
  clean(); window.dispatchEvent(new Event('pageshow')); assert.equal(revision, 2);
});

test('live election events invalidate the same checked snapshot without trusting incomplete old rows', () => {
  let callback, revision = 0, removed = false;
  const channel = { on(event, filter, fn) { callback = fn; return channel; }, subscribe() { return channel; } };
  const clean = publicEffect('vote-public-election-', {
    electionId: 'fixture', setReadRevision: update => { revision = update(revision); },
    supabase: { channel: () => channel, removeChannel: () => { removed = true; } },
  })();
  callback({ new: { id: 'fixture', current_round: 2 }, old: { id: 'fixture' } }); assert.equal(revision, 1);
  clean(); assert.equal(removed, true);
});

test('foreground snapshot retains same-round selection and resets a new round while still checking its receipt', async () => {
  for (const [previousRound, currentRound, hasPrevious] of [[1, 1, false], [1, 2, false], [1, 2, true]]) {
    const values = {}; const loadedRoundRef = { current: `fixture:${previousRound}` }; const ballotRequestRef = { current: 'pending-old-ballot' };
    let finish; const done = new Promise(resolve => { finish = resolve; });
    const setters = Object.fromEntries(['ReadError', 'InvalidToken', 'DeviceLabel', 'UrnaAuthenticated', 'VoteSuccess', 'ReadyToVote', 'SelectedCandidates', 'ConfirmCandidate', 'ConfirmBlank', 'ConfirmSelection', 'ShowNullWarning', 'VoteError', 'Election', 'Candidates', 'AllVotes', 'ElectedIds', 'AlreadyVoted'].map(name => [`set${name}`, value => { values[name] = value; }]));
    const clean = publicEffect('const fetchData', {
      ...setters, setLoading: loading => { if (!loading) finish(); }, electionId: 'fixture', isUrnaMode: false, urnaToken: '', loadedRoundRef, ballotRequestRef,
      resetTimeoutRef: { current: null }, window: { clearTimeout() {} }, getDeviceId: () => 'fixture-browser',
      readVotes: async () => ({ data: [], error: null }), checkPreviousVote: async () => ({ count: hasPrevious ? 1 : 0, error: null }), computeElectedIds: () => [],
      supabase: { from: table => { const query = { select() { return query; }, eq() { return query; }, order() { return query; }, single() { return query; }, then(resolve) {
        return Promise.resolve({ data: table === 'elections' ? { id: 'fixture', status: 'open', voting_mode: 'both', current_round: currentRound } : [], error: null }).then(resolve);
      } }; return query; } },
    })();
    await done; clean();
    assert.equal(values.AlreadyVoted, hasPrevious); assert.equal(loadedRoundRef.current, `fixture:${currentRound}`);
    if (currentRound === previousRound) { assert.equal(values.VoteSuccess, undefined); assert.equal(ballotRequestRef.current, 'pending-old-ballot'); }
    else { assert.equal(values.VoteSuccess, false); assert.equal(values.ReadyToVote, false); assert.equal(ballotRequestRef.current, null); }
  }
});

test('a one-seat runoff opens empty nominations without deleting prior ballots and fails closed on read/write errors', async () => {
  for (const failedOperation of [null, 'read', 'write']) {
    const db = localDatabase([{ id: 'fixture', status: 'open', current_round: 1, total_present: 3 }]);
    db.tables.election_attendance = ['a','b','c'].map(id => ({ id, name: id, election_id: 'fixture', present: true }));
    db.tables.election_votes = ['a', 'b', 'c'].map(candidate_id => ({ id: candidate_id, election_id: 'fixture', candidate_id, ballot_id: `ballot-${candidate_id}`, round_number: 1, is_blank: false }));
    const originalVotes = structuredClone(db.tables.election_votes); let refreshed = false; const messages = [];
    if (failedOperation) db.fail(failedOperation === 'read' ? 'election_votes' : 'elections', failedOperation === 'read' ? 'select' : 'update');
    await handler('src/components/eleicoes/VotingPanel.tsx', 'handleNextRound', {
      checkCurrentCount: async () => requireElectionCount(await readElectionCount(db, 'fixture'), { status: 'open', round: 1 }), actionRef: { current: false }, loading: false, nominationsOpen: false, status: 'open', currentRound: 1, electionId: 'fixture', seatsCount: 1, majorityRule: 'absolute_50',
      candidates: ['a', 'b', 'c'].map(id => ({ id })), setLoading() {}, supabase: db, onRefresh: () => { refreshed = true; }, toast: message => messages.push(message),
    })();
    assert.equal(refreshed, !failedOperation); assert.equal(db.tables.elections[0].current_round, failedOperation ? 1 : 2);
    assert.deepEqual(db.tables.election_votes, originalVotes); assert.equal(db.tables.elections[0].total_present, 3);
    if (!failedOperation) { assert.deepEqual(Array.from(db.tables.elections[0].round2_candidate_ids), []); assert.equal(db.tables.elections[0].nominations_open, true); assert.equal(db.tables.elections[0].show_result, false); }
    else assert.equal(messages[0].variant, 'destructive');
  }
});


test('resetting the current scrutiny preserves historical ballots and confirms only the current round is empty',async()=>{
 const election={id:'fixture',status:'open',current_round:2,total_present:2,society_id:'society'};
 const attendance=[1,2].map(id=>({id:`p${id}`,name:`Pessoa fictícia ${id}`,present:true}));
 const historical=[1,2].map(id=>({id:`old${id}`,ballot_id:`oldb${id}`,round_number:1,candidate_id:'old-candidate',is_blank:false}));
 let votes=[...historical,{id:'new',ballot_id:'newb',round_number:2,candidate_id:'new-candidate',is_blank:false}];
 const filters=[];const messages=[];let phase='resultado',refreshed=0;
 const query={delete(){return query;},eq(key,value){filters.push([key,value]);return query;},then(resolve){assert.deepEqual(filters,[['election_id','fixture'],['round_number',2]]);votes=votes.filter(vote=>vote.round_number!==2);return Promise.resolve({error:null}).then(resolve);}};
 await handler('src/components/eleicoes/VotingPanel.tsx','handleReset',{
  actionRef:{current:false},loading:false,status:'open',nominationsOpen:false,currentRound:2,electionId:'fixture',
  setLoading(){},setConfirmAction(){},setPhase(value){phase=value;},toast:message=>messages.push(message),
  readElectionCount:async()=>reconcileElectionCount(election,attendance,votes),supabase:{from:table=>{assert.equal(table,'election_votes');return query;}},fetchVoteCount(){refreshed++;},
 })();
 assert.deepEqual(votes,historical);assert.equal(phase,'voting');assert.equal(refreshed,1);
 assert.equal(messages[0].variant,undefined);assert.match(messages[0].title,/deste escrutínio/);
});
