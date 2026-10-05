import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAttendanceQueue,
  hasUnconfirmedAttendance,
  assertAttendanceConfirmed,
  verifyUnconfirmedAttendance,
  getPendingAttendanceSnapshot,
  subscribePendingAttendance,
  type AttendanceStudent,
} from '../src/lib/ebd-attendance-queue.ts';
import type { DayAttendance } from '../src/lib/ebd-roster.ts';

const date = '2026-10-04';
const student = (id: string, classId = 'class-a'): AttendanceStudent => ({ id, class_id: classId });
const row = (pupil: AttendanceStudent, present: boolean, day = date): DayAttendance => ({
  id: `persisted-${pupil.id}`, student_id: pupil.id, class_id: pupil.class_id, date: day, present,
});
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function harness(t: TestContext, config: { concurrency?: number; timeoutMs?: number } = {}) {
  const saves: Array<{ pupil: AttendanceStudent; day: string; desired: boolean; existing?: DayAttendance; result: ReturnType<typeof deferred<DayAttendance>> }> = [];
  const reads: Array<{ pupil: AttendanceStudent; day: string }> = [];
  const confirmed: DayAttendance[] = [];
  const rejected: unknown[] = [];
  let read: (pupil: AttendanceStudent, day: string) => Promise<DayAttendance | null> = async () => null;
  const queue = createAttendanceQueue({
    ...config,
    save(pupil, day, desired, existing) {
      const result = deferred<DayAttendance>(); saves.push({ pupil, day, desired, existing, result }); return result.promise;
    },
    read(pupil, day) { reads.push({ pupil, day }); return read(pupil, day); },
    onConfirmed: value => confirmed.push(value),
    onRejected: error => rejected.push(error),
  });
  t.after(async () => {
    queue.dispose();
    for (const save of saves) save.result.resolve(row(save.pupil, save.desired, save.day));
    await tick();
    read = async (pupil, day) => {
      const operation = queue.getSnapshot().find(op => op.student.id === pupil.id && op.date === day);
      return row(pupil, operation?.desired ?? false, day);
    };
    await queue.verifyUnknown();
  });
  return { queue, saves, reads, confirmed, rejected, setRead(fn: typeof read) { read = fn; } };
}

test('accepted mark/unmark exposes desired state synchronously before any save response', async t => {
  const h = harness(t), pupil = student('immediate');
  let notifications = 0; const unsubscribe = h.queue.subscribe(() => notifications++);
  t.after(unsubscribe);
  assert.equal(h.queue.submit(pupil, date, true), true);
  assert.equal(h.queue.getSnapshot()[0].desired, true);
  assert.equal(h.queue.getSnapshot()[0].state, 'saving');
  assert.equal(h.confirmed.length, 0);
  assert.ok(notifications > 0);
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  assert.equal(h.queue.getSnapshot()[0].state, 'confirmed');
  const persisted = h.confirmed[0];
  assert.equal(h.queue.submit(pupil, date, false, persisted), true);
  assert.equal(h.queue.getSnapshot()[0].desired, false);
  assert.equal(h.saves[1].existing?.id, persisted.id);
  h.saves[1].result.resolve(row(pupil, false)); await tick();
  assert.deepEqual(h.confirmed.map(item => item.present), [true, false]);
});

test('three independent saves run together and additional accepted pupils remain queued', async t => {
  const h = harness(t);
  for (let i = 0; i < 5; i++) assert.equal(h.queue.submit(student(`parallel-${i}`), date, true), true);
  assert.equal(h.saves.length, 3);
  assert.deepEqual(h.queue.getSnapshot().map(op => op.state), ['saving', 'saving', 'saving', 'queued', 'queued']);
  h.saves[1].result.resolve(row(h.saves[1].pupil, true)); await tick();
  assert.equal(h.saves.length, 4);
  assert.equal(h.saves[3].pupil.id, 'parallel-3');
  h.saves[0].result.resolve(row(h.saves[0].pupil, true)); await tick();
  assert.equal(h.saves.length, 5);
  assert.equal(h.saves[4].pupil.id, 'parallel-4');
});

test('repeated intent for the same pupil/date is refused until settlement; other dates/classes remain independent', async t => {
  const h = harness(t), pupil = student('ordered');
  assert.equal(h.queue.submit(pupil, date, true), true);
  assert.equal(h.queue.submit(pupil, date, false), false);
  assert.equal(h.queue.submit(pupil, '2026-09-27', false), true);
  assert.equal(h.queue.submit(student('other', 'class-b'), date, true), true);
  assert.equal(h.saves.length, 3);
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  assert.equal(h.queue.submit(pupil, date, false, row(pupil, true)), true);
  assert.equal(h.saves[3].desired, false);
});

test('confirmed rejection only rejects its own pupil and leaves another confirmation intact', async t => {
  const h = harness(t), first = student('reject-one'), second = student('keep-two');
  h.queue.submit(first, date, true); h.queue.submit(second, date, true);
  h.saves[1].result.resolve(row(second, true)); await tick();
  h.saves[0].result.reject(Object.assign(new Error('Dia fechado'), { attendanceRejected: true })); await tick();
  assert.equal(h.queue.getSnapshot().find(op => op.student.id === first.id)?.state, 'rejected');
  assert.equal(h.queue.getSnapshot().find(op => op.student.id === second.id)?.state, 'confirmed');
  assert.deepEqual(h.confirmed.map(item => item.student_id), [second.id]);
  assert.equal(h.rejected.length, 1);
  assert.equal(h.queue.hasPending(), false);
  assert.equal(h.reads.length, 0);
});

test('lost response reconciles the authorized desired row without another write or temporary persisted id', async t => {
  const h = harness(t), pupil = student('lost-response');
  h.setRead(async () => row(pupil, true));
  h.queue.submit(pupil, date, true);
  h.saves[0].result.reject(new Error('Network response lost')); await tick();
  assert.equal(h.reads.length, 1);
  assert.equal(h.saves.length, 1);
  assert.equal(h.queue.getSnapshot()[0].state, 'confirmed');
  assert.equal(h.confirmed[0].id, `persisted-${pupil.id}`);
});

test('unknown response with a differing read stays pending and blocks blind retry until a confirming read', async t => {
  const h = harness(t), pupil = student('unknown');
  h.setRead(async () => row(pupil, false));
  h.queue.submit(pupil, date, true);
  h.saves[0].result.reject(new Error('Response lost')); await tick();
  assert.equal(h.queue.getSnapshot()[0].state, 'unknown');
  assert.equal(h.queue.getSnapshot()[0].settled, true);
  assert.equal(h.queue.submit(pupil, date, true), false);
  assert.equal(h.queue.hasPending(date, 'class-a'), true);
  assert.equal(h.queue.hasPending(date, 'class-b'), false);
  assert.equal(h.confirmed.length, 0);
  h.setRead(async () => row(pupil, true));
  await verifyUnconfirmedAttendance(date);
  assert.equal(h.queue.getSnapshot()[0].state, 'confirmed');
  assert.equal(h.saves.length, 1);
});

test('read failure preserves unknown state and never reports saved', async t => {
  const h = harness(t), pupil = student('read-fails');
  h.setRead(async () => { throw new Error('Sessão expirada'); });
  h.queue.submit(pupil, date, true);
  h.saves[0].result.reject(new Error('Disconnected')); await tick();
  assert.equal(h.queue.getSnapshot()[0].state, 'unknown');
  assert.equal(h.confirmed.length, 0);
  assert.equal(h.rejected.length, 0);
  assert.match(h.queue.getSnapshot()[0].message, /renove o acesso/);
});

test('timeout leaves actual save running, refuses retry and does not read until that request settles', async t => {
  const h = harness(t, { timeoutMs: 10 }), pupil = student('timeout');
  h.queue.submit(pupil, date, true);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(h.queue.getSnapshot()[0].state, 'unknown');
  assert.equal(h.queue.getSnapshot()[0].settled, false);
  await h.queue.verifyUnknown();
  assert.equal(h.reads.length, 0);
  assert.equal(h.queue.submit(pupil, date, false), false);
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  assert.equal(h.queue.getSnapshot()[0].state, 'confirmed');
  assert.equal(h.confirmed.length, 1);
  assert.equal(h.saves.length, 1);
});

test('dispose discards unsent pupils and late results never call the departed screen', async t => {
  const h = harness(t, { concurrency: 1 }), first = student('departed'), queued = student('not-sent');
  h.queue.submit(first, date, true); h.queue.submit(queued, date, true);
  h.queue.dispose();
  assert.equal(h.saves.length, 1);
  assert.equal(h.queue.getSnapshot().length, 1);
  assert.equal(h.queue.submit(student('after-dispose'), date, true), false);
  assert.equal(hasUnconfirmedAttendance(date, 'class-a'), true);
  h.saves[0].result.resolve(row(first, true)); await tick();
  assert.equal(h.confirmed.length, 0);
  assert.equal(h.rejected.length, 0);
  assert.equal(h.saves.length, 1);
  assert.equal(hasUnconfirmedAttendance(date, 'class-a'), false);
});

test('old reads before/during a write preserve its confirmed row; a later read admits another device edit', async t => {
  const h = harness(t), pupil = student('reconcile');
  const before = h.queue.readVersion();
  h.queue.submit(pupil, date, true);
  const during = h.queue.readVersion();
  assert.equal(h.queue.reconcile([row(pupil, false)], before)[0].present, false, 'unconfirmed value is not included in report data');
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  assert.equal(h.queue.reconcile([row(pupil, false)], before)[0].present, true);
  assert.equal(h.queue.reconcile([row(pupil, false)], during)[0].present, true);
  const after = h.queue.readVersion();
  assert.equal(h.queue.reconcile([row(pupil, false)], after)[0].present, false, 'later authorized remote update wins');
});

test('a newer read finishing first must not allow an older response to resurrect pre-write data', async t => {
  const h = harness(t), pupil = student('out-of-order-read');
  const oldRead = h.queue.readVersion();
  h.queue.submit(pupil, date, true);
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  const newRead = h.queue.readVersion();
  assert.equal(h.queue.reconcile([row(pupil, true)], newRead)[0].present, true);
  assert.equal(h.queue.reconcile([row(pupil, false)], oldRead)[0].present, true);
});

test('closure/report barrier tracks pending date and class, including a disposed in-flight request', async t => {
  const h = harness(t), pupil = student('closure');
  assert.doesNotThrow(() => assertAttendanceConfirmed(date, pupil.class_id));
  h.queue.submit(pupil, date, true);
  assert.throws(() => assertAttendanceConfirmed(date), /presenças aguardando confirmação/);
  assert.throws(() => assertAttendanceConfirmed(date, pupil.class_id), /finalizar ou gerar o relatório/);
  assert.doesNotThrow(() => assertAttendanceConfirmed('2026-09-27'));
  assert.doesNotThrow(() => assertAttendanceConfirmed(date, 'another-class'));
  h.queue.dispose();
  assert.throws(() => assertAttendanceConfirmed(date), /confirmação/);
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  assert.doesNotThrow(() => assertAttendanceConfirmed(date));
});

test('remote closure discards unsent work in its class without cancelling other classes or in-flight writes', async t => {
  const h = harness(t, { concurrency: 1 });
  h.queue.submit(student('in-flight'), date, true);
  h.queue.submit(student('closed-class-queued'), date, true);
  h.queue.submit(student('another-class-queued', 'class-b'), date, true);
  h.queue.cancelQueued(date, 'class-a');
  assert.equal(h.queue.getSnapshot()[1].state, 'rejected');
  assert.equal(h.queue.getSnapshot()[2].state, 'queued');
  assert.equal(h.queue.getSnapshot()[0].state, 'saving');
  h.saves[0].result.resolve(row(h.saves[0].pupil, true)); await tick();
  assert.equal(h.saves.length, 2);
  assert.equal(h.saves[1].pupil.class_id, 'class-b');
});

test('late stale response cannot undo a remote edit already accepted from a newer read', async t => {
  const h = harness(t), pupil = student('remote-later-wins');
  h.queue.submit(pupil, date, true);
  h.saves[0].result.resolve(row(pupil, true)); await tick();
  const older = h.queue.readVersion(), newer = h.queue.readVersion();
  assert.equal(h.queue.reconcile([row(pupil, false)], newer)[0].present, false);
  assert.equal(h.queue.reconcile([row(pupil, true)], older)[0].present, false);
});

test('a delayed automatic verification cannot restart the save timeout after another verification confirms', async t => {
  const h = harness(t, { timeoutMs: 20 }), pupil = student('verification-timeout');
  const automaticRead = deferred<DayAttendance | null>();
  t.after(() => automaticRead.resolve(row(pupil, true)));
  let calls = 0;
  h.setRead(async () => ++calls === 1 ? automaticRead.promise : row(pupil, true));
  h.queue.submit(pupil, date, true);
  h.saves[0].result.reject(new Error('Response lost after commit'));
  await tick();
  assert.equal(h.queue.getSnapshot()[0].state, 'unknown');
  await h.queue.verifyUnknown();
  assert.equal(h.queue.getSnapshot()[0].state, 'confirmed');
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(h.queue.getSnapshot()[0].state, 'confirmed', 'The original save is settled; its timer must not demote a separately verified confirmation');
  const newerRead = h.queue.readVersion();
  assert.equal(h.queue.reconcile([row(pupil, false)], newerRead)[0].present, false);
  automaticRead.resolve(row(pupil, true));
  await tick();
  assert.equal(h.confirmed.length, 1, 'Late verification must not confirm twice or overwrite a newer authorized read');
  assert.equal(h.queue.reconcile([row(pupil, false)], newerRead)[0].present, false);
});

test('a remounted or renewed scope refuses a duplicate pupil while the disposed scope still has an in-flight write', async t => {
  const previous = harness(t), next = harness(t), pupil = student('scope-renewal');
  previous.queue.submit(pupil, date, true);
  previous.queue.dispose();
  assert.equal(hasUnconfirmedAttendance(date, pupil.class_id), true);
  assert.equal(next.queue.submit(pupil, date, false), false, 'Scope replacement must not let the same row race its previous unconfirmed request');
  assert.equal(next.saves.length, 0);
  assert.equal(next.queue.submit(student('independent-new-scope'), date, true), true);
  previous.saves[0].result.resolve(row(pupil, true)); await tick();
  assert.equal(next.queue.submit(pupil, date, false, row(pupil, true)), true);
});


test('pending snapshots survive unmount and authorized verification returns the old-scope row without its stale callback', async t => {
  const previous = harness(t), pupil = student('orphaned-unknown');
  let notices = 0;
  const unsubscribe = subscribePendingAttendance(() => notices++); t.after(unsubscribe);
  previous.queue.submit(pupil, date, true);
  previous.saves[0].result.reject(new Error('Lost response')); await tick();
  previous.queue.dispose();
  const pending = getPendingAttendanceSnapshot().filter(op => op.student.id === pupil.id);
  assert.equal(pending.length, 1); assert.equal(pending[0].state, 'unknown');
  previous.setRead(async () => row(pupil, true));
  const verified = await verifyUnconfirmedAttendance(date);
  assert.deepEqual(verified, [row(pupil, true)]);
  assert.equal(previous.confirmed.length, 0, 'The old scope must not receive callbacks');
  assert.equal(getPendingAttendanceSnapshot().some(op => op.student.id === pupil.id), false);
  assert.ok(notices >= 3);
});
