import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function setup({ installed = false, mode = 'standalone', ios = false, path = '/tesouraria?sociedade=fixture', age = 0, record = true, storageBlocked = false, hidden = false } = {}) {
  let now = Date.parse('2026-10-05T12:00:00Z');
  const cache = new Map();
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { exports: module.exports, require: id => load(id.replace('./', '')), Date: { now: () => now }, URLSearchParams, URL });
    cache.set(name, module.exports);
    return module.exports;
  };
  const lifecycle = load('app-resume-home');
  const storage = () => {
    const entries = new Map([
      ['fixture-auth-session', 'preserved'],
      ['diretoria_session', JSON.stringify({ societyId: 'fixture', societySlug: 'ump', societyName: 'Sociedade fictícia', societyColor: '#287e59', operatorName: 'Pessoa fictícia', operatorFunction: 'Outro' })],
      ['ebd_session', JSON.stringify({ accessLevel: 'admin', professorNome: 'Pessoa fictícia' })],
    ]);
    return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  };
  const localStorage = storage(), sessionStorage = storage();
  if (record) (installed || ios ? localStorage : sessionStorage).setItem(lifecycle.APP_LIFECYCLE_STORAGE_KEY,
    JSON.stringify({ lastActiveAt: now - age, backgroundAt: now - age }));
  const doc = Object.assign(new EventTarget(), { visibilityState: hidden ? 'hidden' : 'visible' });
  const browser = new EventTarget();
  const historyChanges = [], reloads = [], timers = new Map(), timeouts = new Map();
  let launchConsumer;
  const location = new URL(path, 'https://fixture.local');
  location.replace = destination => reloads.push(destination);
  location.assign = destination => reloads.push(destination);
  Object.assign(browser, {
    document: doc, location, localStorage, sessionStorage,
    history: { state: { fixture: true }, replaceState(state, title, destination) {
      historyChanges.push(destination); location.href = new URL(destination, location).href;
    } },
    matchMedia: query => ({ matches: installed && query === `(display-mode: ${mode})` }),
    setInterval: callback => { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearInterval: id => timers.delete(id),
    setTimeout: callback => { const id = timeouts.size + 1; timeouts.set(id, callback); return id; },
    clearTimeout: id => timeouts.delete(id),
    launchQueue: { setConsumer: consumer => { launchConsumer = consumer; } },
  });
  if (storageBlocked) Object.defineProperty(browser, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  const navigation = load('app-resume-navigation').startAppResumeHome(browser, { standalone: ios });
  return { navigation, browser, doc, historyChanges, reloads, timers, timeouts, localStorage, sessionStorage, location, lifecycle,
    advance: elapsed => { now += elapsed; },
    visibility(state) { doc.visibilityState = state; doc.dispatchEvent(new Event('visibilitychange')); },
    documentEvent(type, target) {
      const event = new Event(type);
      if (target) Object.defineProperty(event, 'target', { value: target });
      doc.dispatchEvent(event);
    },
    launch: params => launchConsumer?.(params),
    flushTimeouts() { for (const callback of timeouts.values()) callback(); timeouts.clear(); },
    route(path) { location.href = new URL(path, location).href; },
  };
}

test('restored rooms and public links retain their routes without touching credentials', () => {
  for (const installed of [false, true]) for (const ios of [false, true]) {
    for (const path of ['/', '/eleicoes/fixture', '/reunioes', '/tesouraria', '/vote/fixture', '/reset-password#access_token=fixture', '/auth?home=1']) {
      const p = setup({ installed, ios, path, age: 24 * 60 * 60_000 });
      assert.equal(p.location.pathname, new URL(path, 'https://fixture.local').pathname);
      assert.deepEqual(p.historyChanges, []);
      assert.deepEqual(p.reloads, []);
      assert.equal(p.localStorage.getItem('fixture-auth-session'), 'preserved');
      assert.equal(p.sessionStorage.getItem('fixture-auth-session'), 'preserved');
      p.navigation.stop();
    }
  }
});

test('switching to Chrome, returning after hours, freeze and bfcache never send the operator to login', () => {
  for (const installed of [false, true]) for (const ios of [false, true]) {
    const p = setup({ installed, ios, path: '/eleicoes/fixture' });
    p.navigation.markMounted();
    p.visibility('hidden'); p.advance(2 * 60 * 60_000);
    p.browser.dispatchEvent(new Event('pagehide')); p.documentEvent('freeze');
    p.visibility('visible'); p.documentEvent('resume'); p.browser.dispatchEvent(new Event('pageshow'));
    p.launch({ targetURL: 'https://fixture.local/auth?home=1' });
    assert.equal(p.location.pathname, '/eleicoes/fixture');
    assert.deepEqual(p.reloads, []);
    assert.equal(p.localStorage.getItem('fixture-auth-session'), 'preserved');
    p.navigation.stop();
    assert.equal(p.timers.size, 0);
  }
});

test('camera picker, focus, keyboard and unavailable storage preserve the active form', () => {
  const p = setup({ installed: true, storageBlocked: true });
  p.navigation.markMounted(); p.route('/eleicoes/fixture');
  p.documentEvent('click', { tagName: 'INPUT', type: 'file', disabled: false });
  p.visibility('hidden'); p.documentEvent('change'); p.visibility('visible');
  for (const event of ['focus', 'resize', 'popstate']) p.browser.dispatchEvent(new Event(event));
  assert.deepEqual(p.reloads, []);
  p.navigation.stop();
});

test('only deliberate same-origin public links navigate, and teardown cancels launch delivery', () => {
  const p = setup({ installed: true, path: '/eleicoes/fixture' });
  p.launch({ targetURL: 'https://fixture.local/vote/other' });
  assert.deepEqual(p.reloads, [], 'startup delivery must not race boot');
  p.navigation.markMounted();
  for (const params of [{}, {files: [{}]}, {targetURL: 'https://external.test/vote/other'}, {targetURL:'https://fixture.local/auth?home=1'}]) p.launch(params);
  assert.deepEqual(p.reloads, []);
  p.launch({ targetURL: 'https://fixture.local/vote/other' });
  assert.deepEqual(p.reloads, ['https://fixture.local/vote/other']);
  p.navigation.stop(); p.launch({ targetURL:'https://fixture.local/vote/another' });
  assert.equal(p.reloads.length, 1);
});
