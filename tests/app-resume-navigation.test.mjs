import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function setup({ installed = false, mode = 'standalone', ios = false, path = '/tesouraria?sociedade=fixture', age = 0, record = true } = {}) {
  let now = Date.parse('2026-10-05T12:00:00Z');
  const cache = new Map();
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { exports: module.exports, require: id => load(id.replace('./', '')), Date: { now: () => now }, URLSearchParams });
    cache.set(name, module.exports);
    return module.exports;
  };
  const lifecycle = load('app-resume-home');
  const storage = () => {
    const entries = new Map([['fixture-auth-session', 'preserved']]);
    return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  };
  const localStorage = storage(), sessionStorage = storage();
  if (record) (installed || ios ? localStorage : sessionStorage).setItem(lifecycle.APP_LIFECYCLE_STORAGE_KEY,
    JSON.stringify({ lastActiveAt: now - age, backgroundAt: now - age }));
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const browser = new EventTarget();
  const historyChanges = [], reloads = [], timers = new Map();
  const location = new URL(path, 'https://fixture.local');
  location.replace = destination => reloads.push(destination);
  Object.assign(browser, {
    document: doc, location, localStorage, sessionStorage,
    history: { state: { fixture: true }, replaceState(state, title, destination) {
      historyChanges.push(destination); location.href = new URL(destination, location).href;
    } },
    matchMedia: query => ({ matches: installed && query === `(display-mode: ${mode})` }),
    setInterval: callback => { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearInterval: id => timers.delete(id),
  });
  const navigation = load('app-resume-navigation').startAppResumeHome(browser, { standalone: ios });
  return { navigation, browser, doc, historyChanges, reloads, timers, localStorage, sessionStorage, location, lifecycle,
    advance: elapsed => { now += elapsed; },
    visibility(state) { doc.visibilityState = state; doc.dispatchEvent(new Event('visibilitychange')); },
  };
}

test('cold installed app returns to public home before mounting a restored private route', () => {
  const p = setup({ installed: true, age: 31 * 60_000 });
  assert.deepEqual(p.historyChanges, ['/auth?home=1']);
  assert.equal(p.location.pathname, '/auth');
  assert.equal(p.localStorage.getItem('fixture-auth-session'), 'preserved');
  assert.equal(p.sessionStorage.getItem('fixture-auth-session'), 'preserved');
  assert.deepEqual(p.reloads, []);
  p.navigation.stop(); assert.equal(p.timers.size, 0);
});

test('first installed launch and iOS standalone start at home; browser deep routes keep their destination', () => {
  assert.deepEqual(setup({ installed: true, record: false }).historyChanges, ['/auth?home=1']);
  assert.deepEqual(setup({ ios: true, record: false }).historyChanges, ['/auth?home=1']);
  assert.deepEqual(setup({ record: false }).historyChanges, []);
});

test('brief reload preserves the current route and uses browser-tab storage separately from PWA', () => {
  const p = setup({ age: 5 * 60_000 });
  assert.deepEqual(p.historyChanges, []);
  assert.equal(p.location.pathname, '/tesouraria');
  assert.equal(p.localStorage.getItem(p.lifecycle.APP_LIFECYCLE_STORAGE_KEY), null);
  assert.ok(p.sessionStorage.getItem(p.lifecycle.APP_LIFECYCLE_STORAGE_KEY));
});

test('live long resume refreshes public entry, also when already on a PIN at the home route', () => {
  const p = setup({ path: '/auth?home=1' });
  p.navigation.markMounted();
  p.visibility('hidden'); p.advance(5 * 60_000); p.visibility('visible');
  assert.deepEqual(p.reloads, []);
  p.visibility('hidden'); p.advance(30 * 60_000); p.visibility('visible');
  p.browser.dispatchEvent(new Event('pageshow'));
  assert.deepEqual(p.reloads, ['/auth?home=1']);
  assert.equal(p.sessionStorage.getItem('fixture-auth-session'), 'preserved');
});

test('fresh recovery and public election links keep their destination after an old app stamp', () => {
  for (const path of ['/reset-password#access_token=fixture', '/auth?code=fixture', '/auth#access_token=fixture', '/vote/fixture', '/eleicao/fixture/apresentar']) {
    const p = setup({ installed: true, age: 60 * 60_000, path });
    assert.deepEqual(p.historyChanges, [], path);
    assert.deepEqual(p.reloads, [], path);
  }
});

test('public home intent is explicit and never changes authorization', () => {
  const source = readFileSync(new URL('../src/lib/app-home.ts', import.meta.url), 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: module.exports, URLSearchParams });
  assert.equal(module.exports.requestsPublicHome('?home=1'), true);
  for (const search of ['', '?home=0', '?sociedade=fixture']) assert.equal(module.exports.requestsPublicHome(search), false);
});


test('fullscreen launch and resume preserve the home lifecycle without changing session credentials', () => {
  const cold = setup({ installed: true, mode: 'fullscreen', record: false });
  assert.deepEqual(cold.historyChanges, ['/auth?home=1']);
  assert.ok(cold.localStorage.getItem(cold.lifecycle.APP_LIFECYCLE_STORAGE_KEY));
  assert.equal(cold.localStorage.getItem('fixture-auth-session'), 'preserved');
  cold.navigation.stop();
  const live = setup({ installed: true, mode: 'fullscreen', age: 5 * 60_000 });
  assert.deepEqual(live.historyChanges, []);
  live.navigation.markMounted();
  live.visibility('hidden'); live.advance(30 * 60_000); live.visibility('visible');
  assert.deepEqual(live.reloads, ['/auth?home=1']);
  assert.equal(live.localStorage.getItem('fixture-auth-session'), 'preserved');
  live.navigation.stop();
});
