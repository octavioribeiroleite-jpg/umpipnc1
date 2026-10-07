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

test('every new site or installed launch starts home before mounting any restored private route or session', () => {
  for (const installed of [false, true]) {
  for (const age of [0, 1_000, 5 * 60_000, 31 * 60_000]) {
    for (const path of ['/', '/reunioes', '/configuracoes', '/tesouraria?sociedade=fixture', '/auth', '/secretaria?view=chamada']) {
      const p = setup({ installed, age, path });
      assert.deepEqual(p.historyChanges, ['/auth?home=1'], `${path}, age ${age}`);
      assert.equal(p.location.pathname, '/auth');
      assert.equal(p.location.search, '?home=1');
      assert.equal(p.localStorage.getItem('fixture-auth-session'), 'preserved');
      assert.equal(p.sessionStorage.getItem('fixture-auth-session'), 'preserved');
      assert.ok(p.sessionStorage.getItem('diretoria_session'));
      assert.ok(p.localStorage.getItem('ebd_session'));
      assert.deepEqual(p.reloads, []);
      p.navigation.stop(); assert.equal(p.timers.size, 0);
    }
  }
  }
});

test('first browser, installed and iOS standalone openings all start at home', () => {
  assert.deepEqual(setup({ installed: true, record: false }).historyChanges, ['/auth?home=1']);
  assert.deepEqual(setup({ ios: true, record: false }).historyChanges, ['/auth?home=1']);
  assert.deepEqual(setup({ record: false }).historyChanges, ['/auth?home=1']);
});

test('new browser document opens Home even with a recent stamp and keeps tab storage separate from PWA', () => {
  const p = setup({ age: 5 * 60_000 });
  assert.deepEqual(p.historyChanges, ['/auth?home=1']);
  assert.equal(p.location.pathname, '/auth');
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
  for (const installed of [false, true]) {
  for (const path of ['/reset-password#access_token=fixture', '/auth?code=fixture', '/auth#access_token=fixture', '/vote/fixture', '/eleicao/fixture/apresentar']) {
    const p = setup({ installed, age: 60 * 60_000, path });
    assert.deepEqual(p.historyChanges, [], path);
    assert.deepEqual(p.reloads, [], path);
  }
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


test('fullscreen launch and immediate resume preserve the home lifecycle without changing session credentials', () => {
  const cold = setup({ installed: true, mode: 'fullscreen', record: false });
  assert.deepEqual(cold.historyChanges, ['/auth?home=1']);
  assert.ok(cold.localStorage.getItem(cold.lifecycle.APP_LIFECYCLE_STORAGE_KEY));
  assert.equal(cold.localStorage.getItem('fixture-auth-session'), 'preserved');
  cold.navigation.stop();
  const live = setup({ installed: true, mode: 'fullscreen', age: 5 * 60_000 });
  assert.deepEqual(live.historyChanges, ['/auth?home=1']);
  live.navigation.markMounted();
  live.route('/reunioes');
  live.visibility('hidden'); live.advance(1); live.visibility('visible');
  assert.deepEqual(live.reloads, ['/auth?home=1']);
  assert.equal(live.localStorage.getItem('fixture-auth-session'), 'preserved');
  live.navigation.stop();
});

test('retained installed process returns home immediately and duplicate lifecycle/launch events reload only once', () => {
  for (const ios of [false, true]) {
    const p = setup({ installed: !ios, ios });
    p.navigation.markMounted(); p.route('/reunioes');
    p.visibility('hidden'); p.advance(1); p.visibility('visible');
    p.browser.dispatchEvent(new Event('pageshow'));
    p.documentEvent('resume'); p.launch({ targetURL: 'https://fixture.local/auth?home=1' });
    assert.deepEqual(p.reloads, ['/auth?home=1']);
    assert.equal(p.sessionStorage.getItem('fixture-auth-session'), 'preserved');
    p.navigation.stop();
  }
});

test('a saved PIN screen at the home URL is also reset after installed background', () => {
  const p = setup({ installed: true, path: '/auth?home=1' });
  p.navigation.markMounted(); p.visibility('hidden'); p.visibility('visible');
  assert.deepEqual(p.reloads, ['/auth?home=1']);
});

test('late startup launch delivery never loops, but a later explicit app launch resets the entry', () => {
  const p = setup({ installed: true });
  p.navigation.markMounted(); p.route('/tarefas'); p.launch({ targetURL: 'https://fixture.local/auth?home=1' });
  assert.deepEqual(p.reloads, []);
  assert.equal(p.location.pathname, '/tarefas');
  p.route('/reunioes');
  p.launch({ targetURL: 'https://fixture.local/auth?home=1' });
  assert.deepEqual(p.reloads, ['/auth?home=1']);
});

test('file and external/recovery launch intents never reset an active document', () => {
  const p = setup({ installed: true });
  p.navigation.markMounted(); p.launch({ targetURL: 'https://fixture.local/auth?home=1' });
  p.route('/reunioes');
  for (const params of [
    { files: [{ name: 'fixture.png' }] },
    { targetURL: 'https://external.test/' },
    { targetURL: 'https://fixture.local/reset-password#access_token=fixture' },
    { targetURL: 'https://fixture.local/vote/fixture' },
  ]) p.launch(params);
  assert.deepEqual(p.reloads, []);
  assert.equal(p.location.pathname, '/reunioes');
});

test('file/camera picker background preserves the current form, whether change or cancel arrives before visibility', () => {
  const fileInput = { tagName: 'INPUT', type: 'file', disabled: false };
  for (const finished of ['change', 'cancel']) {
    const p = setup({ installed: true });
    p.navigation.markMounted(); p.route('/financas');
    p.documentEvent('click', fileInput);
    p.visibility('hidden'); p.advance(60_000);
    p.documentEvent(finished, fileInput); p.visibility('visible'); p.flushTimeouts();
    assert.deepEqual(p.reloads, [], finished);
    assert.equal(p.location.pathname, '/financas');
    p.visibility('hidden'); p.visibility('visible');
    assert.deepEqual(p.reloads, ['/auth?home=1'], `next real reopening after ${finished}`);
    p.navigation.stop();
  }
});

test('file picker latch clears after completion or focus even when the dialog never hid the document', () => {
  const fileInput = { tagName: 'INPUT', type: 'file', disabled: false };
  for (const finished of ['change', 'cancel', 'focus']) {
    const p = setup({ installed: true });
    p.navigation.markMounted(); p.route('/arquivos'); p.documentEvent('click', fileInput);
    if (finished === 'focus') p.browser.dispatchEvent(new Event('focus'));
    else p.documentEvent(finished, fileInput);
    p.flushTimeouts(); p.visibility('hidden'); p.visibility('visible');
    assert.deepEqual(p.reloads, ['/auth?home=1'], finished);
    p.navigation.stop();
  }
});

test('foreground navigation, keyboard resize and focus changes never count as reopening', () => {
  const p = setup({ installed: true });
  p.navigation.markMounted(); p.route('/tarefas');
  for (const type of ['blur', 'focus', 'resize', 'popstate', 'pageshow']) p.browser.dispatchEvent(new Event(type));
  p.documentEvent('keydown', { tagName: 'INPUT', type: 'text' });
  p.documentEvent('focusout', { tagName: 'INPUT', type: 'text' });
  p.advance(60 * 60_000); for (const callback of p.timers.values()) callback();
  assert.equal(p.location.pathname, '/tarefas');
  assert.deepEqual(p.reloads, []);
});

test('bfcache and frozen installed documents return home without requiring elapsed time', () => {
  for (const [hide, show, target] of [['pagehide', 'pageshow', 'window'], ['freeze', 'resume', 'document']]) {
    const p = setup({ installed: true });
    p.navigation.markMounted(); p.route('/reunioes');
    if (target === 'window') { p.browser.dispatchEvent(new Event(hide)); p.browser.dispatchEvent(new Event(show)); }
    else { p.documentEvent(hide); p.documentEvent(show); }
    assert.deepEqual(p.reloads, ['/auth?home=1'], hide);
    p.navigation.stop();
  }
});

test('installed launch works with blocked storage and initially hidden document', () => {
  const p = setup({ installed: true, storageBlocked: true, hidden: true, path: '/reunioes' });
  assert.deepEqual(p.historyChanges, ['/auth?home=1']);
  p.navigation.markMounted(); p.visibility('visible');
  assert.deepEqual(p.reloads, []);
  p.route('/reunioes'); p.visibility('hidden'); p.visibility('visible');
  assert.deepEqual(p.reloads, ['/auth?home=1']);
});

test('stopping launch handling cancels picker cleanup and all retained-process navigation', () => {
  const p = setup({ installed: true });
  p.navigation.markMounted(); p.documentEvent('click', { tagName: 'INPUT', type: 'file' });
  p.browser.dispatchEvent(new Event('focus')); assert.equal(p.timeouts.size, 1);
  p.navigation.stop(); assert.equal(p.timeouts.size, 0); assert.equal(p.timers.size, 0);
  p.visibility('hidden'); p.visibility('visible'); p.launch({ targetURL: 'https://fixture.local/auth?home=1' });
  assert.deepEqual(p.reloads, []);
});
