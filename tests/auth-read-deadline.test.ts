import test from 'node:test';
import assert from 'node:assert/strict';
import { withAuthReadDeadline } from '../src/lib/auth-read-deadline.ts';

test('principal reads work without AbortSignal.timeout and release the deadline after success', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
  Object.defineProperty(AbortSignal, 'timeout', {value:undefined, configurable:true});
  try {
    let usedSignal!: AbortSignal;
    assert.equal(await withAuthReadDeadline(async signal => {usedSignal=signal;return 'fixture-profile';},10),'fixture-profile');
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.equal(usedSignal.aborted,false);
  } finally {
    if (descriptor) Object.defineProperty(AbortSignal,'timeout',descriptor);
    else delete (AbortSignal as {timeout?: unknown}).timeout;
  }
});

test('a pending read still aborts at its deadline and cannot be treated as confirmed access', async () => {
  await assert.rejects(withAuthReadDeadline(signal => new Promise((resolve,reject) => {
    signal.addEventListener('abort',()=>reject(new Error('fixture-read-aborted')),{once:true});
  }),10),/fixture-read-aborted/);
});

test('failed reads release their timers without changing the original error', async () => {
  let usedSignal!: AbortSignal;
  await assert.rejects(withAuthReadDeadline(async signal => {usedSignal=signal;throw new Error('fixture-unavailable');},10),/fixture-unavailable/);
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(usedSignal.aborted,false);
  await assert.rejects(withAuthReadDeadline(() => {throw new Error('fixture-construction-failed');},10),/fixture-construction-failed/);
});
