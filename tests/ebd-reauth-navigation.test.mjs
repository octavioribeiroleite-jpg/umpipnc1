import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createEbdNavigation } from '../src/lib/ebd-navigation.ts';
import { APP_HOME_PATH } from '../src/lib/app-home.ts';

// Execute Secretaria's actual integration callbacks with the production
// navigation controller. This is not a DOM/lifecycle or real Auth test.
const source = ts.createSourceFile('Secretaria.tsx', readFileSync(new URL('../src/pages/Secretaria.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let intercept, reauthBack, reauthHome;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useSecretariaNavigation') intercept = node.arguments[2].getText(source);
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'reauthDialog') {
    function pinCallbacks(child) {
      if (ts.isJsxSelfClosingElement(child) && child.tagName.getText(source) === 'PinPad') {
        for (const prop of child.attributes.properties) if (ts.isJsxAttribute(prop) && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
          if (prop.name.getText(source) === 'onBack') reauthBack = prop.initializer.expression.getText(source);
          if (prop.name.getText(source) === 'onHome') reauthHome = prop.initializer.expression.getText(source);
        }
      }
      ts.forEachChild(child, pinCallbacks);
    }
    pinCallbacks(node.initializer);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(intercept && reauthBack && reauthHome, 'Use the current renewal integration, not a replacement callback');
const compiled = ts.transpileModule(`return { intercept: ${intercept}, back: ${reauthBack}, home: ${reauthHome} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const integration = new Function('showExitConfirm', 'signingOut', 'aiReauthOpen', 'loading', 'setShowExitConfirm', 'setAiReauthOpen', 'navigate', 'APP_HOME_PATH', compiled);

function fixture(owner = 'admin:') {
  let index = 0, screen, exits = 0;
  const entries = [{ state: { idx: 0 }, url: '/secretaria' }], listeners = new Set(), stored = new Map();
  const state = { showExitConfirm: false, signingOut: false, aiReauthOpen: true, loading: false };
  const closed = [], routes = [];
  const callbacks = () => integration(state.showExitConfirm, state.signingOut, state.aiReauthOpen, state.loading,
    value => { state.showExitConfirm = value; }, value => { closed.push(value); state.aiReauthOpen = value; },
    (...args) => routes.push(args), APP_HOME_PATH);
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
  return { state, host, navigation, callbacks, closed, routes, stored, get screen() { return screen; }, get exits() { return exits; } };
}

for (const owner of ['admin:', 'professor:synthetic-class']) {
  test(`${owner}: native Back closes renewal once and preserves the exact underlying screen and saved trail`, () => {
    const f = fixture(owner);
    const editing = { view: 'chamada', classId: 'synthetic-class' };
    f.navigation.open(editing);
    const before = [...f.stored.entries()];
    f.host.history.go(-1);
    assert.equal(f.state.aiReauthOpen, false);
    assert.deepEqual(f.closed, [false]);
    assert.deepEqual(f.screen, editing);
    assert.deepEqual([...f.stored.entries()], before);
    assert.equal(f.exits, 0);
    assert.deepEqual(f.routes, []);
    f.navigation.stop();
  });
}

test('native Back during a pending renewal stays on that screen without closing or logging out', () => {
  const f = fixture();
  f.navigation.open({ view: 'historico', day: '2026-09-20', editing: true, classId: 'synthetic-class' });
  const screen = structuredClone(f.screen);
  f.state.loading = true;
  f.host.history.go(-1); f.host.history.go(-1);
  assert.equal(f.state.aiReauthOpen, true);
  assert.deepEqual(f.closed, []);
  assert.deepEqual(f.screen, screen);
  assert.equal(f.exits, 0);
  f.state.loading = false;
  f.host.history.go(-1);
  assert.equal(f.state.aiReauthOpen, false);
  assert.deepEqual(f.closed, [false]);
  assert.deepEqual(f.screen, screen);
  f.navigation.stop();
});

test('visible Back and native Back have the same idle renewal effect; Home uses the public destination once', () => {
  const visible = fixture(), native = fixture();
  visible.callbacks().back(); native.host.history.go(-1);
  assert.deepEqual(visible.closed, native.closed);
  assert.deepEqual(visible.screen, native.screen);
  assert.equal(visible.state.aiReauthOpen, false);
  visible.callbacks().home();
  assert.deepEqual(visible.routes, [[APP_HOME_PATH, { replace: true, state: { skipSplash: true } }]]);
  assert.equal(visible.exits, 0);
  visible.navigation.stop(); native.navigation.stop();
});

test('renewal interception does not replace the existing exit confirmation or normal workspace Back', () => {
  const f = fixture();
  f.state.aiReauthOpen = false;
  f.navigation.open({ view: 'turmas' });
  f.host.history.go(-1);
  assert.deepEqual(f.screen, { view: 'home' });
  assert.deepEqual(f.closed, []);
  f.state.showExitConfirm = true;
  f.state.signingOut = true;
  f.host.history.go(-1);
  assert.equal(f.state.showExitConfirm, true);
  assert.equal(f.exits, 0);
  f.state.signingOut = false;
  f.host.history.go(-1);
  assert.equal(f.state.showExitConfirm, false);
  assert.equal(f.exits, 0);
  f.navigation.stop();
});
