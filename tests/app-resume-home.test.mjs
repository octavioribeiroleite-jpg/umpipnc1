import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_BACKGROUND_TIMEOUT_MS,
  APP_LIFECYCLE_STORAGE_KEY,
  createAppResumeHomeController,
} from '../src/lib/app-resume-home.ts';

const MINUTE = 60 * 1000;
const INITIAL_TIME = Date.parse('2026-10-05T12:00:00Z');

function events() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    emit(type) { for (const listener of listeners.get(type) ?? []) listener(); },
    count() { return [...listeners.values()].reduce((sum, group) => sum + group.size, 0); },
  };
}

function memoryStorage(initial = []) {
  const data = new Map(initial);
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

function fixture({ storage = memoryStorage(), hidden = false } = {}) {
  let now = INITIAL_TIME;
  let nextTimer = 0;
  const timers = new Map();
  const document = { ...events(), visibilityState: hidden ? 'hidden' : 'visible' };
  const window = events();
  const returned = [];
  const environment = {
    now: () => now,
    document,
    window,
    getStorage: () => storage,
    setInterval: (listener, milliseconds) => {
      const id = ++nextTimer;
      timers.set(id, { listener, milliseconds });
      return id;
    },
    clearInterval: id => timers.delete(id),
  };
  const controller = createAppResumeHomeController(environment, { onReturnHome: event => returned.push(event) });
  return {
    environment, controller, document, window, storage, returned, timers,
    advance(milliseconds) { now += milliseconds; },
    heartbeat() { for (const timer of timers.values()) timer.listener(); },
    visibility(state) { document.visibilityState = state; document.emit('visibilitychange'); },
    stamp() { return JSON.parse(storage.getItem(APP_LIFECYCLE_STORAGE_KEY)); },
    reopen(options = {}) { return createAppResumeHomeController(environment, { onReturnHome: event => returned.push(event), ...options }); },
  };
}

test('brief background preserves navigation; 30 minutes returns home once on resume', () => {
  const page = fixture();
  page.controller.start();
  page.visibility('hidden');
  page.advance(APP_BACKGROUND_TIMEOUT_MS - 1);
  page.visibility('visible');
  assert.deepEqual(page.returned, []);

  page.visibility('hidden');
  page.advance(APP_BACKGROUND_TIMEOUT_MS);
  page.visibility('visible');
  page.window.emit('pageshow');
  assert.deepEqual(page.returned, [{ reason: 'resume', elapsedMs: APP_BACKGROUND_TIMEOUT_MS }]);
  assert.equal(page.stamp().backgroundAt, null);
});

test('duplicate hidden and pagehide events do not postpone the return deadline', () => {
  const page = fixture();
  page.controller.start();
  page.visibility('hidden');
  const backgroundAt = page.stamp().backgroundAt;
  page.advance(20 * MINUTE);
  page.visibility('hidden');
  page.window.emit('pagehide');
  page.heartbeat();
  assert.equal(page.stamp().backgroundAt, backgroundAt);
  page.advance(10 * MINUTE);
  page.visibility('visible');
  assert.equal(page.returned.length, 1);
  assert.equal(page.returned[0].elapsedMs, 30 * MINUTE);
});

test('pagehide/pageshow handles a restored page even without visibilitychange', () => {
  const page = fixture();
  page.controller.start();
  page.window.emit('pagehide');
  page.advance(31 * MINUTE);
  page.heartbeat();
  page.window.emit('pageshow');
  page.window.emit('pageshow');
  assert.deepEqual(page.returned, [{ reason: 'resume', elapsedMs: 31 * MINUTE }]);
});

test('foreground idleness never navigates, and heartbeat protects a quick cold restart', () => {
  const page = fixture();
  page.controller.start();
  for (let minute = 0; minute < 120; minute++) {
    page.advance(MINUTE);
    page.heartbeat();
  }
  assert.deepEqual(page.returned, []);
  assert.equal([...page.timers.values()][0].milliseconds, MINUTE);
  page.controller.stop();
  page.advance(2 * MINUTE);
  const reopened = page.reopen();
  reopened.start();
  assert.deepEqual(page.returned, []);
  reopened.stop();
});

test('cold restart after process termination uses the last active heartbeat', () => {
  const page = fixture();
  page.controller.start();
  page.advance(10 * MINUTE);
  page.heartbeat();
  page.controller.stop(); // Simulates termination without a pagehide event.
  page.advance(31 * MINUTE);
  const reopened = page.reopen();
  reopened.start();
  assert.deepEqual(page.returned, [{ reason: 'cold-start', elapsedMs: 31 * MINUTE }]);
  reopened.stop();
});

test('cold restart uses explicit background time rather than the earlier heartbeat', () => {
  const page = fixture();
  page.controller.start();
  page.advance(5 * MINUTE);
  page.visibility('hidden');
  page.controller.stop();
  page.advance(28 * MINUTE);
  page.document.visibilityState = 'visible';
  const reopened = page.reopen();
  reopened.start();
  assert.deepEqual(page.returned, []); // 33 minutes since launch, only 28 away.
  reopened.stop();
});

test('initial hidden launch preserves an expired absence until it becomes visible', () => {
  const storage = memoryStorage([[APP_LIFECYCLE_STORAGE_KEY, JSON.stringify({
    lastActiveAt: INITIAL_TIME - 40 * MINUTE,
    backgroundAt: INITIAL_TIME - 35 * MINUTE,
  })]]);
  const page = fixture({ storage, hidden: true });
  page.controller.start();
  page.heartbeat();
  assert.deepEqual(page.returned, []);
  assert.equal(page.stamp().backgroundAt, INITIAL_TIME - 35 * MINUTE);
  page.advance(MINUTE);
  page.window.emit('pageshow');
  assert.deepEqual(page.returned, []);
  page.visibility('visible');
  assert.deepEqual(page.returned, [{ reason: 'cold-start', elapsedMs: 36 * MINUTE }]);
});

test('blocked or unavailable storage still supports live resume without exceptions', () => {
  for (const storage of [null, {
    getItem() { throw new Error('Storage blocked'); },
    setItem() { throw new Error('Quota exceeded'); },
  }]) {
    const page = fixture({ storage });
    page.controller.start();
    page.visibility('hidden');
    page.advance(40 * MINUTE);
    page.visibility('visible');
    assert.deepEqual(page.returned, [{ reason: 'resume', elapsedMs: 40 * MINUTE }]);
    page.controller.stop();
  }
});

test('a throwing storage getter degrades to the in-memory lifecycle', () => {
  const page = fixture();
  page.environment.getStorage = () => { throw new Error('Storage disabled'); };
  page.controller.start();
  page.window.emit('pagehide');
  page.advance(30 * MINUTE);
  page.window.emit('pageshow');
  assert.equal(page.returned[0].reason, 'resume');
});

test('invalid or future timestamps do not navigate or produce repeated redirects', () => {
  const records = [
    'broken JSON',
    'null',
    JSON.stringify({ lastActiveAt: 'yesterday', backgroundAt: null }),
    JSON.stringify({ lastActiveAt: INITIAL_TIME, backgroundAt: -1 }),
    JSON.stringify({ lastActiveAt: INITIAL_TIME + 60 * MINUTE, backgroundAt: INITIAL_TIME + 40 * MINUTE }),
  ];
  for (const record of records) {
    const page = fixture({ storage: memoryStorage([[APP_LIFECYCLE_STORAGE_KEY, record]]) });
    page.controller.start();
    page.window.emit('pageshow');
    assert.deepEqual(page.returned, []);
    assert.deepEqual(page.stamp(), { lastActiveAt: INITIAL_TIME, backgroundAt: null });
  }
});

test('clock rollback during absence recovers and later resumes retain normal timing', () => {
  const page = fixture();
  page.controller.start();
  page.visibility('hidden');
  page.advance(-60 * MINUTE);
  page.visibility('visible');
  assert.deepEqual(page.returned, []);
  page.visibility('hidden');
  page.advance(APP_BACKGROUND_TIMEOUT_MS);
  page.visibility('visible');
  assert.deepEqual(page.returned, [{ reason: 'resume', elapsedMs: APP_BACKGROUND_TIMEOUT_MS }]);
});

test('start is idempotent and stop removes listeners and timers without touching sessions', () => {
  const authRecord = ['synthetic-auth-session', 'fictitious-token'];
  const page = fixture({ storage: memoryStorage([authRecord]) });
  page.controller.start();
  page.controller.start();
  assert.equal(page.document.count() + page.window.count(), 3);
  assert.equal(page.timers.size, 1);
  page.controller.stop();
  page.controller.stop();
  assert.equal(page.document.count() + page.window.count(), 0);
  assert.equal(page.timers.size, 0);
  page.advance(60 * MINUTE);
  page.visibility('hidden');
  page.visibility('visible');
  page.window.emit('pageshow');
  assert.deepEqual(page.returned, []);
  assert.equal(page.storage.getItem(authRecord[0]), authRecord[1]);
  assert.deepEqual([...page.storage.data.keys()].sort(), [APP_LIFECYCLE_STORAGE_KEY, authRecord[0]].sort());
});
