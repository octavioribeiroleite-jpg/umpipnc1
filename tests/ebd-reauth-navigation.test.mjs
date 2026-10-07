import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createEbdNavigation, EBD_NAVIGATION_KEY } from '../src/lib/ebd-navigation.ts';
import { APP_HOME_PATH } from '../src/lib/app-home.ts';

// Exercise the actual renewal integration. Browser tests separately cover
// capture/bubble ordering with React Router and the mounted page.
const source = ts.createSourceFile('Secretaria.tsx', readFileSync(new URL('../src/pages/Secretaria.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let intercept, cancel, reauthBack, reauthHome, initialGate;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useSecretariaNavigation') intercept = node.arguments[2].getText(source);
  if (ts.isVariableDeclaration(node)) {
    if (node.name.getText(source) === 'handleCancelReauth') cancel = node.initializer.getText(source);
    if (node.name.getText(source) === '[aiReauthOpen, setAiReauthOpen]') initialGate = node.initializer.arguments[0].getText(source);
    if (node.name.getText(source) === 'reauthDialog') {
      function callbacks(child) {
        if (ts.isJsxSelfClosingElement(child) && child.tagName.getText(source) === 'PinPad') {
          for (const prop of child.attributes.properties) if (ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
            if (prop.name.getText(source) === 'onBack') reauthBack = prop.initializer.expression.getText(source);
            if (prop.name.getText(source) === 'onHome') reauthHome = prop.initializer.expression.getText(source);
          }
        }
        ts.forEachChild(child, callbacks);
      }
      callbacks(node.initializer);
    }
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(intercept && cancel && reauthBack && reauthHome && initialGate);
const compiled = ts.transpileModule(`const handleCancelReauth = ${cancel}; return { intercept: ${intercept}, back: ${reauthBack}, home: ${reauthHome} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const integration = new Function('showExitConfirm', 'signingOut', 'aiReauthOpen', 'loading', 'setShowExitConfirm', 'setAiReauthOpen', 'navigate', 'APP_HOME_PATH', 'navigation', 'clearStoredEbdSession', 'setAccessLevel', 'handleBack', 'entryRequestRef', compiled);

function fixture(owner = 'admin:') {
  let index = 0, screen, exits = 0, clears = 0;
  const entries = [{ state: { idx: 0 }, url: '/secretaria' }], listeners = new Set(), stored = new Map();
  const state = { showExitConfirm: false, signingOut: false, aiReauthOpen: true, loading: false, accessLevel: owner, entryRequestRef: { current: false } };
  const routes = [];
  const callbacks = () => integration(state.showExitConfirm, state.signingOut, state.aiReauthOpen, state.loading,
    value => { state.showExitConfirm = value; }, value => { state.aiReauthOpen = value; },
    (...args) => routes.push(args), APP_HOME_PATH, navigation, () => { clears++; }, value => { state.accessLevel = value; }, () => {}, state.entryRequestRef);
  const host = {
    location: { pathname: '/secretaria' },
    history: {
      get state() { return entries[index].state; },
      pushState(value, unused, url) { entries.splice(index + 1); entries.push({ state: structuredClone(value), url }); index++; },
      replaceState(value, unused, url) { entries[index] = { state: structuredClone(value), url }; },
      go(delta) { const next = index + delta; if (next < 0 || next >= entries.length) return; index = next; for (const listener of listeners) listener({ state: entries[index].state }); },
    },
    addEventListener(type, listener) { listeners.add(listener); },
    removeEventListener(type, listener) { listeners.delete(listener); },
  };
  const store = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  const navigation = createEbdNavigation(host, [store], owner, {
    change: value => { screen = value; }, exit: () => { exits++; }, intercept: () => callbacks().intercept(),
  });
  navigation.start();
  return { state, host, navigation, callbacks, routes, stored, entries, get screen() { return screen; }, get exits() { return exits; }, get clears() { return clears; } };
}

for (const owner of ['admin:', 'professor:synthetic-class']) {
  test(`${owner}: cancelling renewal goes Home, abandons local access and never publishes a private screen afterward`, () => {
    const f = fixture(owner);
    f.navigation.open({ view: 'chamada', classId: 'synthetic-class' });
    const length = f.entries.length;
    f.host.history.go(-1);
    assert.equal(f.state.accessLevel, null);
    assert.equal(f.clears, 1);
    assert.equal(f.stored.get(EBD_NAVIGATION_KEY), undefined);
    assert.deepEqual(f.routes, [[APP_HOME_PATH, { replace: true, state: { skipSplash: true } }]]);
    assert.equal(f.entries.length, length, 'stopped navigation must not push Secretaria after Home');
    assert.equal(f.exits, 0);
    f.host.history.go(-1);
    assert.equal(f.clears, 1, 'no second cancellation from an abandoned trail');
  });
}

test('visible Back, Home and native Back abandon the same expired gate', () => {
  const visible = fixture(), home = fixture(), native = fixture();
  visible.callbacks().back(); home.callbacks().home(); native.host.history.go(-1);
  for (const f of [visible, home, native]) {
    assert.equal(f.state.accessLevel, null);
    assert.equal(f.state.aiReauthOpen, false);
    assert.equal(f.clears, 1);
    assert.deepEqual(f.routes, [[APP_HOME_PATH, { replace: true, state: { skipSplash: true } }]]);
  }
});

test('pending renewal cannot be cancelled by native or visible Back, even before loading renders', () => {
  for (const busy of ['loading', 'entryRequestRef']) {
    const f = fixture();
    if (busy === 'loading') f.state.loading = true; else f.state.entryRequestRef.current = true;
    f.callbacks().back(); f.callbacks().home(); f.host.history.go(-1); f.host.history.go(-1);
    assert.equal(f.state.aiReauthOpen, true);
    assert.equal(f.state.accessLevel, 'admin:');
    assert.equal(f.clears, 0);
    assert.deepEqual(f.routes, []);
    f.navigation.stop();
  }
});

test('normal workspace and exit-confirmation Back retain their existing semantics', () => {
  const f = fixture();
  f.state.aiReauthOpen = false;
  f.navigation.open({ view: 'turmas' }); f.host.history.go(-1);
  assert.deepEqual(f.screen, { view: 'home' });
  f.state.showExitConfirm = true; f.state.signingOut = true; f.host.history.go(-1);
  assert.equal(f.state.showExitConfirm, true);
  f.state.signingOut = false; f.host.history.go(-1);
  assert.equal(f.state.showExitConfirm, false);
  assert.deepEqual(f.routes, []);
  assert.equal(f.clears, 0);
  f.navigation.stop();
});

test('expired or missing local expiry starts covered before the first workspace paint', () => {
  const initial = new Function('storedSession', `return (${initialGate})();`);
  for (const birthdayAiExpiresAt of [undefined, 'invalid', new Date(Date.now() - 1000).toISOString()]) assert.equal(initial({ birthdayAiExpiresAt }), true);
  assert.equal(initial(null), false);
  assert.equal(initial({ birthdayAiExpiresAt: new Date(Date.now() + 60_000).toISOString() }), false);
});
