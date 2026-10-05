import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotRead } from '../src/lib/snapshot-read.ts';

test('an initial failed financial read has no confirmed zero or empty snapshot', async () => {
  const reader = createSnapshotRead();
  let committed = false;
  await reader.run(async () => { await Promise.reject(Error('fixture query denied')); return () => { committed = true; }; });
  assert.equal(committed, false);
  assert.deepEqual(reader.getSnapshot(), { loading: false, hasSnapshot: false, error: true });
});

test('a failed refresh preserves the last complete snapshot and retry can confirm a genuine zero', async () => {
  const reader = createSnapshotRead(); let amount: number | undefined;
  await reader.run(async () => () => { amount = 123; });
  await reader.run(async () => { await Promise.all([Promise.resolve(0), Promise.reject(Error('partial failure'))]); return () => { amount = 0; }; });
  assert.equal(amount, 123);
  assert.deepEqual(reader.getSnapshot(), { loading: false, hasSnapshot: true, error: true });
  await reader.run(async () => () => { amount = 0; });
  assert.equal(amount, 0);
  assert.deepEqual(reader.getSnapshot(), { loading: false, hasSnapshot: true, error: false });
});

test('late reads cannot overwrite a newer snapshot and a disposed scope cannot commit', async () => {
  const reader = createSnapshotRead(); let value = '';
  let release!: (commit: () => void) => void;
  const oldRead = reader.run(() => new Promise(resolve => { release = resolve; }));
  await reader.run(async () => () => { value = 'new'; });
  release(() => { value = 'old'; }); await oldRead;
  assert.equal(value, 'new');
  const pending = reader.run(() => new Promise(resolve => { release = resolve; }));
  reader.dispose(); release(() => { value = 'wrong scope'; }); await pending;
  assert.equal(value, 'new');
  assert.equal(createSnapshotRead().getSnapshot().hasSnapshot, false);
});
