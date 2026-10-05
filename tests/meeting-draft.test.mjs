import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Run the actual hook with deterministic hook lifecycle and delayed persistence.
// The UI, focus and viewport transitions are checked separately in the isolated fixture.
const source = readFileSync(new URL('../src/components/reunioes/usePersistedTextDraft.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export function', 'function');
const compiled = ts.transpileModule(source + '\nreturn usePersistedTextDraft;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function harness(options) {
  let cursor = 0, changed = true, result, effects = [], counter = 0;
  const slots = [], timers = new Map();
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      slots[index] ||= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, next => { const value = typeof next === 'function' ? next(slots[index].value) : next; if (!Object.is(value, slots[index].value)) { slots[index].value = value; changed = true; } }];
    },
    useRef(initial) { const index = cursor++; slots[index] ||= { current: initial }; return slots[index]; },
    useCallback(callback, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, callback }; return slots[index].callback; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) { const cleanup = slots[index]?.cleanup; slots[index] = { deps, cleanup }; effects.push(() => { cleanup?.(); slots[index].cleanup = effect(); }); }
    },
    window: { setTimeout(callback) { const id = ++counter; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); } },
  };
  const useDraft = new Function(...Object.keys(hooks), compiled)(...Object.values(hooks));
  function flush() {
    let attempts = 0;
    while (changed) {
      assert.ok(attempts++ < 20, 'Hook render should settle');
      changed = false; cursor = 0; effects = []; result = useDraft(options);
      for (const effect of effects) effect();
    }
    return result;
  }
  flush();
  return {
    get draft() { return flush(); },
    update(next) { options = { ...options, ...next }; changed = true; return flush(); },
    timers,
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

test('a newer draft is serialized after an in-flight save and is never marked saved by the older response', async () => {
  const requests = [], saved = [];
  const h = harness({ initialValue: '', persist: value => { const request = deferred(); requests.push({ value, ...request }); return request.promise; }, onSaved: value => saved.push(value) });
  h.draft.setValue('A'); const pending = h.draft.save();
  h.draft.setValue('B'); h.draft.save();
  assert.deepEqual(requests.map(request => request.value), ['A']);
  requests[0].resolve(); await tick();
  assert.deepEqual(requests.map(request => request.value), ['A', 'B']);
  assert.equal(h.draft.value, 'B'); assert.equal(h.draft.savedValue, 'A'); assert.equal(h.draft.dirty, true);
  requests[1].resolve(); assert.equal(await pending, true);
  assert.equal(h.draft.value, 'B'); assert.equal(h.draft.dirty, false); assert.equal(h.draft.saving, false);
  assert.deepEqual(saved, ['A', 'B']); h.unmount();
});

test('failed save preserves text and reports failure until an explicit retry succeeds', async () => {
  let fail = true;
  const h = harness({ initialValue: 'Original', persist: async () => { if (fail) throw new Error('Synthetic offline'); } });
  h.draft.setValue('Rascunho');
  assert.equal(await h.draft.save(), false);
  assert.equal(h.draft.value, 'Rascunho'); assert.equal(h.draft.dirty, true); assert.match(h.draft.error, /preservado/);
  assert.equal(h.timers.size, 0, 'No endless retries after a failed save');
  fail = false; assert.equal(await h.draft.save(), true); assert.equal(h.draft.error, ''); assert.equal(h.draft.dirty, false); h.unmount();
});

test('background refresh preserves a dirty draft and refreshes a pristine editor', () => {
  const h = harness({ initialValue: 'Original', persist: async () => {} });
  h.update({ initialValue: 'Atualizado' }); assert.equal(h.draft.value, 'Atualizado');
  h.draft.setValue('Rascunho'); h.update({ initialValue: 'Outra versão no servidor' });
  assert.equal(h.draft.value, 'Rascunho'); assert.equal(h.draft.savedValue, 'Outra versão no servidor'); assert.equal(h.draft.dirty, true); h.unmount();
});

test('read-only and unmounted editors do not dispatch delayed writes', async () => {
  let calls = 0;
  const h = harness({ initialValue: '', enabled: false, persist: async () => { calls++; } });
  h.draft.setValue('Rascunho'); assert.equal(await h.draft.save(), false); assert.equal(h.timers.size, 0);
  h.update({ enabled: true }); assert.equal(h.timers.size, 1); h.unmount(); assert.equal(h.timers.size, 0); assert.equal(calls, 0);
});

test('an old route save cannot publish into an unmounted editor', async () => {
  const request = deferred(); let published = 0;
  const h = harness({ initialValue: '', persist: () => request.promise, onSaved: () => published++ });
  h.draft.setValue('Old meeting'); const pending = h.draft.save(); h.unmount(); request.resolve();
  assert.equal(await pending, false); assert.equal(published, 0);
});
