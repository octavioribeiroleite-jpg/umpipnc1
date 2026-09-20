import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRefreshQueue } from '../src/lib/refresh-queue.ts';
import { refreshSite } from '../src/lib/refresh-site.ts';

test('changes during a read are reconciled afterward, without overlapping reads', async () => {
  let reads = 0, active = 0, maximum = 0;
  const releases = [];
  const queue = createRefreshQueue(async () => {
    reads++; maximum = Math.max(maximum, ++active);
    await new Promise(resolve => releases.push(resolve));
    active--;
  });
  const first = queue.request();
  assert.equal(reads, 1);
  const second = queue.request();
  queue.request();
  assert.equal(reads, 1);
  releases.shift()();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 2);
  releases.shift()();
  await Promise.all([first, second]);
  assert.equal(maximum, 1);
  assert.equal(reads, 2);
});

test('failed reads can be retried and disposal cancels queued work', async () => {
  let reads = 0;
  const queue = createRefreshQueue(async () => { if (++reads === 1) throw Error('offline'); });
  await assert.rejects(queue.request(), /offline/);
  await queue.request();
  queue.dispose();
  await queue.request();
  assert.equal(reads, 2);
  queue.resume(); // React StrictMode mounts the same effect again.
  await queue.request();
  assert.equal(reads, 3);
});

test('disposing while reading prevents a pending follow-up read', async () => {
  let reads = 0, release;
  const queue = createRefreshQueue(async () => { reads++; await new Promise(resolve => { release = resolve; }); });
  const pending = queue.request();
  queue.request();
  queue.dispose();
  release();
  await pending;
  assert.equal(reads, 1);
});

test('manual update verifies network, clears workers/caches and preserves route and login storage', async t => {
  const actions = [];
  const page = {
    location: { href: 'https://example.test/secretaria?view=chamada#turma', replace: url => actions.push(['navigate', url]) },
    caches: { keys: async () => ['ump-cache-v7', 'ump-cache-v8'], delete: async key => { actions.push(['delete', key]); return true; } },
    get localStorage() { throw Error('must preserve login'); },
    get sessionStorage() { throw Error('must preserve login'); },
  };
  const device = { onLine: true, serviceWorker: { getRegistrations: async () => [{ unregister: async () => { actions.push(['unregister']); return true; } }] } };
  t.mock.method(globalThis, 'fetch', async (url, options) => { actions.push(['fetch', url, options.cache]); return { ok: true }; });
  await refreshSite(page, device);
  assert.deepEqual(actions.map(action => action[0]), ['fetch', 'unregister', 'delete', 'delete', 'navigate']);
  assert.equal(actions[0][2], 'no-store');
  const target = new URL(actions.at(-1)[1]);
  assert.equal(target.pathname, '/secretaria');
  assert.equal(target.searchParams.get('view'), 'chamada');
  assert.equal(target.hash, '#turma');
  assert.ok(target.searchParams.get('__refresh'));
});

test('offline or failed updates keep the current page and caches intact', async t => {
  const page = {
    location: { href: 'https://example.test/secretaria', replace: () => assert.fail('must not navigate') },
    caches: { keys: () => assert.fail('must not clear caches') },
  };
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }));
  await assert.rejects(refreshSite(page, { onLine: false }), /internet/);
  await assert.rejects(refreshSite(page, { onLine: true }), /não respondeu/);
});
