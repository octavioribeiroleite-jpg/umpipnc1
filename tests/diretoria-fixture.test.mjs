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

function loadFixtureBackend() {
  const source = readFileSync(new URL('./fixtures/diretoria/backend.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, URLSearchParams, crypto, location: { pathname: '/__diretoria/financas' },
    require(name) {
      assert.equal(name, './options');
      return { fixtureParams: new URLSearchParams(), fixtureRole: 'admin', fixtureState: 'normal', fixturePause: async () => {} };
    },
  });
  return exports;
}

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
