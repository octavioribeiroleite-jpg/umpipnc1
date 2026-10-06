import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Executes the real bootstrap's transport wrappers without a browser or network.
// Dependency modules and browser transports are stubs, not production services.
test('fixture blocks foreign/API transports before mounting the application', async () => {
  const calls = [];
  class FakeXHR { open(...args) { calls.push(['xhr', ...args]); } }
  class FakeSocket { constructor(...args) { calls.push(['socket', ...args]); } }
  class FakeEvents { constructor(...args) { calls.push(['events', ...args]); } }
  const window = {
    fetch: async (...args) => { calls.push(['fetch', ...args]); return { ok: true }; },
    WebSocket: FakeSocket, EventSource: FakeEvents,
  };
  const navigator = { sendBeacon: () => { calls.push(['beacon']); return true; } };
  const source = readFileSync(new URL('./fixtures/diretoria/bootstrap.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  let mounted = false;
  await vm.runInNewContext(`(async () => { ${compiled} })()`, {
    exports: {}, window, navigator, XMLHttpRequest: FakeXHR, URL, Request,
    location: { origin: 'http://127.0.0.1:8083', href: 'http://127.0.0.1:8083/__diretoria/' },
    require(name) {
      if (name === './options') return { fixtureParams: new URLSearchParams() };
      if (name === './main') { mounted = true; assert.equal(navigator.sendBeacon(), false); return {}; }
      throw new Error('Unexpected fixture import');
    },
  });
  assert.equal(mounted, true);
  assert.throws(() => window.fetch('https://backend.example.test/rest/v1/data'), /conexão real bloqueada/);
  assert.throws(() => window.fetch('/rest/v1/data'), /conexão real bloqueada/);
  await assert.rejects(window.fetch('/fixture', { method: 'POST' }), /escrita de rede bloqueada/);
  assert.throws(() => new FakeXHR().open('GET', 'https://backend.example.test/data'), /conexão real bloqueada/);
  assert.throws(() => new FakeXHR().open('POST', '/fixture'), /XHR de escrita bloqueado/);
  assert.throws(() => new window.WebSocket('wss://backend.example.test/realtime/v1'), /conexão real bloqueada/);
  assert.throws(() => new window.EventSource('https://backend.example.test/events'), /conexão real bloqueada/);
  assert.equal(calls.length, 0, 'Rejected requests must not reach a native transport');
  await window.fetch('/tests/fixtures/diretoria/portrait.svg');
  new FakeXHR().open('GET', '/assets/example.js');
  new window.WebSocket('ws://127.0.0.1:8083/');
  assert.deepEqual(calls.map(item => item[0]), ['fetch', 'xhr', 'socket']);
});

function loadFixtureBackend(params = '') {
  const source = readFileSync(new URL('./fixtures/diretoria/backend.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, URLSearchParams, crypto, location: { pathname: '/__diretoria/financas' },
    require(name) {
      assert.equal(name, './options');
      return { fixtureParams: new URLSearchParams(params), fixtureRole: 'admin', fixtureState: 'normal', fixturePause: async () => {} };
    },
  });
  return exports;
}

function loadFixtureIdentity(state, delay = 700) {
  const source = readFileSync(new URL('./fixtures/diretoria/auth.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const states = [];
  const effects = [];
  const cleanups = [];
  const timers = new Map();
  let cursor = 0;
  let mounted = false;
  let timerId = 0;
  vm.runInNewContext(compiled, { exports,
    window: {
      setTimeout(callback, milliseconds) { const id = ++timerId; timers.set(id, { callback, milliseconds }); return id; },
      clearTimeout(id) { timers.delete(id); },
      addEventListener() {}, removeEventListener() {},
    },
    require(name) {
      if (name === './options') return { fixtureRole:'anonymous', fixtureState:state, fixtureDelay:delay, fixturePause:async () => {} };
      if (name === 'react/jsx-runtime') return { jsx:(_type, props) => props };
      if (name === 'react') return {
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = value; }];
        },
        useEffect(effect) { if (!mounted) effects.push(effect); },
        createContext:() => ({ Provider:'fixture-provider' }),
        useContext:() => null,
      };
      throw new Error('Unexpected fixture identity import');
    },
  });
  return {
    timers,
    render() {
      cursor = 0;
      const { value } = exports.AuthProvider({ children:null });
      if (!mounted) {
        mounted = true;
        for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
      }
      return value;
    },
    completeOpening() {
      const pending = [...timers.values()]; timers.clear();
      for (const { callback } of pending) callback();
    },
    unmount() { for (const cleanup of cleanups) cleanup(); },
  };
}

test('isolated opening becomes ready after its configured delay without issuing an identity', () => {
  const fixture = loadFixtureIdentity('opening', 700);
  const initial = fixture.render();
  assert.equal(initial.loading, true);
  assert.equal(initial.rolesLoaded, false);
  assert.equal(initial.user, null);
  assert.equal(fixture.timers.size, 1);
  assert.equal([...fixture.timers.values()][0].milliseconds, 700);
  fixture.completeOpening();
  const ready = fixture.render();
  assert.equal(ready.loading, false);
  assert.equal(ready.rolesLoaded, true);
  assert.equal(ready.user, null);
  assert.deepEqual([...ready.roles], []);
  fixture.unmount();
});

test('opening cleanup cancels its timer and existing loading remains permanent', () => {
  const opening = loadFixtureIdentity('opening');
  opening.render(); opening.unmount();
  assert.equal(opening.timers.size, 0);
  const permanent = loadFixtureIdentity('loading');
  assert.equal(permanent.render().loading, true);
  assert.equal(permanent.timers.size, 0);
  permanent.completeOpening();
  assert.equal(permanent.render().loading, true);
  assert.equal(permanent.render().rolesLoaded, false);
  permanent.unmount();
  const fast = loadFixtureIdentity('opening', 0);
  fast.render();
  assert.equal(fast.timers.size, 0);
  assert.equal(fast.render().loading, false);
  fast.unmount();
});

test('fixture read-failure toggle preserves seeded data and emits only subscribed local realtime callbacks', async () => {
  const { supabase, setFixtureReadFailure, emitFixtureRealtime } = loadFixtureBackend();
  const before = await supabase.from('transactions').select('*');
  assert.ok(before.data.length > 0);
  let emissions = 0;
  const channel = supabase.channel('test').on('postgres_changes', { table: 'transactions' }, payload => { assert.equal(payload.fixture, true); emissions++; }).subscribe();
  setFixtureReadFailure(true);
  const failed = await supabase.from('transactions').select('*');
  assert.equal(failed.data, null);
  assert.ok(failed.error);
  assert.equal(await emitFixtureRealtime(), 1);
  assert.equal(emissions, 1);
  setFixtureReadFailure(false);
  const recovered = await supabase.from('transactions').select('*');
  assert.deepEqual(recovered.data, before.data);
  await supabase.removeChannel(channel);
  assert.equal(await emitFixtureRealtime(), 0);
});

test('fixture file search honors case-insensitive ilike and simple OR without a real backend', async () => {
  const { supabase } = loadFixtureBackend();
  const missing = await supabase.from('files').select('*').or('name.ilike.%sem-resultado-ficticio%,description.ilike.%sem-resultado-ficticio%');
  assert.equal(missing.data.length, 0);
  const named = await supabase.from('files').select('*').ilike('name', '%RELATÓRIO%');
  assert.equal(named.data.length, 1);
});

test('isolated vote failures preserve one ballot on retries and never report the first rejection as success', async () => {
  for (const scenario of ['returned', 'network', 'throw']) {
    const { supabase } = loadFixtureBackend(`vote_error=${scenario}`);
    const body = { action: 'cast', election_id: 'election', ballot_id: 'ballot-test-only', round_number: 1, choices: ['candidate-1'], blanks: 0 };
    if (scenario === 'throw') await assert.rejects(supabase.functions.invoke('election-vote', { body }), /FICTÍCIA/);
    else {
      const first = await supabase.functions.invoke('election-vote', { body });
      assert.notEqual(first.data?.success, true);
      if (scenario === 'network') assert.ok(first.error);
    }
    const retried = await supabase.functions.invoke('election-vote', { body });
    assert.equal(retried.data.success, true);
    await supabase.functions.invoke('election-vote', { body });
    const history = await supabase.functions.invoke('election-vote', { body: { action: 'history' } });
    assert.equal(history.data.votes.length, 1, 'A same-UUID retry only creates one in-memory ballot');
  }
});

test('isolated history, previous-vote and device read errors remain explicit and can recover', async () => {
  for (const action of ['history', 'already', 'device']) {
    const { supabase } = loadFixtureBackend(`read_error=${action}`);
    const body = { action, election_id: 'election', token: 'fixture-urna', device_id: 'device-test-only' };
    const first = await supabase.functions.invoke('election-vote', { body });
    assert.ok(first.error);
    assert.equal(first.data, null);
    const recovered = await supabase.functions.invoke('election-vote', { body });
    assert.equal(recovered.error, null);
    assert.ok(recovered.data);
  }
});

test('isolated rejected candidate writes keep the seeded candidates intact', async () => {
  const { supabase } = loadFixtureBackend('candidate_error=1');
  const before = await supabase.from('election_candidates').select('*');
  const rejected = await supabase.from('election_candidates').insert({ election_id: 'election', name: 'Nome fictício mantido' });
  assert.ok(rejected.error);
  const after = await supabase.from('election_candidates').select('*');
  assert.deepEqual(after.data, before.data);
});
