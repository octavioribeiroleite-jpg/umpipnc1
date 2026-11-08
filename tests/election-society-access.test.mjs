import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('diretoria navigation exposes elections without granting the administrator menu', () => {
  const source = readFileSync(new URL('../src/components/layout/appNavigation.ts', import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: () => new Proxy({}, { get: () => () => null }),
  });
  const paths = (admin, management) => Array.from(exports.getAppNavigationItems(admin, management), item => item.path);
  assert.ok(paths(false, true).includes('/eleicoes'));
  assert.ok(!paths(false, true).includes('/usuarios'));
  assert.ok(!paths(false, false).includes('/eleicoes'));
  assert.equal(paths(true, true).filter(path => path === '/eleicoes').length, 1);
});

// Execute the real page handlers against an isolated query double.
function handler(name, context) {
  const file = 'src/pages/Eleicoes.tsx';
  const source = ts.createSourceFile(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(expression);
  const sandbox = { useCallback: fn => fn, runRead: async fn => (await fn())(), ...context };
  vm.runInNewContext(ts.transpileModule(`globalThis.handler = ${expression}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return sandbox.handler;
}

function reads(overrides = {}) {
  const calls = [];
  const context = {
    rolesLoaded: true, canAccess: true, churchWide: false, ownSocietyId: 'ump-fixture',
    setElections() {}, setSocieties() {},
    supabase: { from(table) {
      const call = { table, filters: [] }; calls.push(call);
      const query = {
        select() { return query; }, order() { return query; },
        eq(...args) { call.filters.push(args); return query; },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      };
      return query;
    } }, ...overrides,
  };
  return { calls, run: handler('fetchElections', context) };
}

test('diretoria reads elections and society options only for its own society', async () => {
  const fixture = reads(); await fixture.run();
  assert.deepEqual(fixture.calls, [
    { table: 'elections', filters: [['society_id', 'ump-fixture']] },
    { table: 'societies', filters: [['active', true], ['id', 'ump-fixture']] },
  ]);
});

test('missing society, unauthorized and unhydrated accounts issue no election queries', async () => {
  for (const overrides of [{ ownSocietyId: null }, { canAccess: false }, { rolesLoaded: false }]) {
    const fixture = reads(overrides); await fixture.run(); assert.equal(fixture.calls.length, 0);
  }
});

test('church leadership retains its cross-society election view', async () => {
  const fixture = reads({ churchWide: true }); await fixture.run();
  assert.deepEqual(fixture.calls[0].filters, []);
});

test('diretoria creation binds the election to its society even with a foreign selector value', async () => {
  let inserted;
  const noop = () => {};
  await handler('handleCreate', {
    canCreate: true, name: 'Eleição fictícia', position: 'Cargo fictício', electionType: 'cargo', seatsCount: 1, maxChoices: 1,
    churchWide: false, societyId: 'other-fixture', ownSocietyId: 'ump-fixture', user: { id: 'user-fixture' },
    setCreating: noop, setDialogOpen: noop, setName: noop, setPosition: noop, setSocietyId: noop,
    setElectionType: noop, setSeatsCount: noop, setMaxChoices: noop, fetchElections: noop, toast: noop,
    supabase: { from: () => ({ insert: async data => { inserted = data; return { error: null }; } }) },
  })();
  assert.equal(inserted.society_id, 'ump-fixture');
});
