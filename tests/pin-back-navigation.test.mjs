import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinBackGuard } from '../src/lib/pin-back-navigation.ts';

function fixture(options = {}) {
  let index = 1, backs = 0, privatePops = 0, busy = false, accept = true;
  const entries = [
    { state: { idx: 3, key: 'private', usr: { previous: true } }, url: 'https://fixture.local/secretaria?view=chamada' },
    { state: { idx: 4, key: 'access', usr: { skipSplash: true } }, url: 'https://fixture.local/auth?home=1#access' },
  ];
  if (options.forwardEntry) entries.push({ state: { idx: 5, key: 'forward', usr: null }, url: 'https://fixture.local/secretaria?view=turmas' });
  const listeners = [];
  const location = { get href() { return entries[index].url; } };
  const history = {
    get state() { return entries[index].state; },
    pushState(state, title, url) { entries.splice(index + 1); entries.push({ state: structuredClone(state), url }); index++; },
    replaceState(state, title, url) { entries[index] = { state: structuredClone(state), url }; },
  };
  const browser = { location, history,
    addEventListener(type, listener, capture) { listeners.push({ listener, capture }); },
    removeEventListener(type, listener) { const i = listeners.findIndex(item => item.listener === listener); if (i >= 0) listeners.splice(i, 1); },
  };
  // Router/workspace listener was registered earlier. Capture must still win.
  browser.addEventListener('popstate', () => { privatePops++; }, false);
  const guard = createPinBackGuard(browser, { onBack: () => { if (!accept) return false; backs++; }, isBusy: () => busy }, options);
  const traverse = (delta) => {
    index += delta;
    let stopped = false;
    const event = { state: history.state, stopImmediatePropagation() { stopped = true; } };
    for (const item of [...listeners].sort((a, b) => Number(Boolean(b.capture)) - Number(Boolean(a.capture)))) {
      if (stopped) break;
      item.listener(event);
    }
  };
  guard.start();
  return { guard, browser, history, entries, set busy(value) { busy = value; }, set accept(value) { accept = value; }, get backs() { return backs; }, get privatePops() { return privatePops; },
    nativeBack() { traverse(-1); },
    nativeForward() { traverse(1); },
  };
}

test('native PIN Back uses the visible return action without reaching earlier private history', () => {
  const f = fixture(); f.nativeBack();
  assert.equal(f.backs, 1); assert.equal(f.privatePops, 0);
  assert.equal(f.browser.location.href, 'https://fixture.local/auth?home=1#access');
  assert.deepEqual(f.history.state, { idx: 4, key: 'access', usr: { skipSplash: true } });
});

test('pending PIN blocks repeated native and visible Back then allows one idle return', () => {
  const f = fixture(); f.busy = true;
  f.nativeBack(); f.nativeBack(); f.guard.back();
  assert.equal(f.backs, 0); assert.equal(f.privatePops, 0);
  f.busy = false; f.nativeBack();
  assert.equal(f.backs, 1); assert.equal(f.privatePops, 0);
});

test('a request ref can reject cancellation before the busy prop renders without disabling the guard', () => {
  const f = fixture(); f.accept = false;
  f.guard.back(); f.nativeBack(); f.nativeBack();
  assert.equal(f.backs, 0); assert.equal(f.privatePops, 0);
  f.accept = true; f.nativeBack();
  assert.equal(f.backs, 1); assert.equal(f.privatePops, 0);
});

test('visible Back and native Back leave the same location and router state', () => {
  const visible = fixture(), native = fixture(); visible.guard.back(); native.nativeBack();
  assert.equal(visible.backs, 1); assert.equal(native.backs, 1);
  assert.deepEqual(visible.history.state, native.history.state);
  assert.equal(visible.browser.location.href, native.browser.location.href);
});

test('cleanup is synchronous and never traverses history after Home navigation', () => {
  const f = fixture();
  f.history.replaceState({ idx: 5, key: 'home', usr: null }, '', 'https://fixture.local/auth?home=1');
  f.guard.stop(); f.guard.stop();
  assert.equal(f.browser.location.href, 'https://fixture.local/auth?home=1');
  assert.deepEqual(f.history.state, { idx: 5, key: 'home', usr: null });
  assert.equal(f.backs, 0);
});

test('PIN error remounts do not accumulate active listeners or expose private history', () => {
  const f = fixture(); f.guard.stop();
  const replacement = createPinBackGuard(f.browser, { isBusy: () => false, onBack: () => f.guard.back() });
  replacement.start(); replacement.stop();
  assert.deepEqual(f.history.state, { idx: 4, key: 'access', usr: { skipSplash: true } });
  assert.equal(f.privatePops, 0);
});

test('successful renewal reuses its EBD entry so the first Back reaches the previous screen', () => {
  const f = fixture({ reuseCurrentEntry: true });
  assert.equal(f.entries.length, 2);
  f.guard.stop(); f.nativeBack();
  assert.equal(f.browser.location.href, 'https://fixture.local/secretaria?view=chamada');
  assert.equal(f.privatePops, 1); assert.equal(f.backs, 0);
});

test('successful renewal preserves an existing Forward destination', () => {
  const f = fixture({ reuseCurrentEntry: true, forwardEntry: true });
  assert.equal(f.entries.length, 3);
  f.guard.stop(); f.nativeForward();
  assert.equal(f.browser.location.href, 'https://fixture.local/secretaria?view=turmas');
  assert.equal(f.privatePops, 1); assert.equal(f.backs, 0);
});

test('reused EBD entry still captures repeated pending Back and accepts idle cancellation', () => {
  const f = fixture({ reuseCurrentEntry: true }); f.busy = true;
  f.nativeBack(); f.nativeBack(); f.guard.back();
  assert.equal(f.entries.length, 2);
  assert.equal(f.backs, 0); assert.equal(f.privatePops, 0);
  f.busy = false; f.nativeBack();
  assert.equal(f.backs, 1); assert.equal(f.privatePops, 0);
  assert.deepEqual(f.history.state, { idx: 4, key: 'access', usr: { skipSplash: true } });
});
