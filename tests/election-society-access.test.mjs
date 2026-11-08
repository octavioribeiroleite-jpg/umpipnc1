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
    template: 'single', creatingRef: { current: false }, canCreate: true, name: 'Eleição fictícia', position: 'Cargo fictício', electionType: 'cargo', seatsCount: 1, maxChoices: 1,
    churchWide: false, societyId: 'other-fixture', ownSocietyId: 'ump-fixture', user: { id: 'user-fixture' },
    setCreating: noop, setDialogOpen: noop, setName: noop, setPosition: noop, setSocietyId: noop,
    setElectionType: noop, setSeatsCount: noop, setMaxChoices: noop, fetchElections: noop, toast: noop,
    supabase: { from: () => ({ insert: async data => { inserted = data; return { error: null }; } }) },
  })();
  assert.equal(inserted.society_id, 'ump-fixture');
});

test('the real seats input allows clearing 1 before typing 2', () => {
  const source = ts.createSourceFile('Eleicoes.tsx', readFileSync(new URL('../src/pages/Eleicoes.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let change;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'Input') {
      const attributes = node.attributes.properties;
      if (attributes.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'id' && attr.initializer?.getText(source).includes('-seats'))) {
        change = attributes.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'onChange').initializer.expression.getText(source);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(change);
  let value = '1';
  const context = { setSeatsCount(next) { value = next; } };
  vm.runInNewContext(ts.transpileModule(`globalThis.change = ${change}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  context.change({ target: { value: '' } });
  assert.equal(value, '');
  context.change({ target: { value: '2' } });
  assert.equal(value, '2');
});

test('creation rejects blank/invalid seats and persists a typed 2 as two numeric seats and choices', async () => {
  for (const seatsCount of ['', '0', '-1', '1.5', '2']) {
    let inserted, notified = false;
    const noop = () => {};
    await handler('handleCreate', {
      template: 'single', creatingRef: { current: false }, canCreate: true, name: 'Eleição fictícia', position: 'Cargo fictício', electionType: 'cargo', seatsCount, maxChoices: '1',
      churchWide: false, ownSocietyId: 'ump-fixture', user: { id: 'user-fixture' },
      setCreating: noop, setDialogOpen: noop, setName: noop, setPosition: noop, setSocietyId: noop,
      setElectionType: noop, setSeatsCount: noop, setMaxChoices: noop, fetchElections: noop, toast: () => { notified = true; },
      supabase: { from: () => ({ insert: async data => { inserted = data; return { error: null }; } }) },
    })();
    if (seatsCount === '2') {
      assert.equal(inserted.seats_count, 2);
      assert.equal(inserted.max_choices_per_ballot, 2);
    } else {
      assert.equal(inserted, undefined);
      assert.equal(notified, true);
    }
  }
});
