import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real hook with a minimal hook dispatcher and controlled reads.
// No duplicated release formula, DOM, Supabase network, or timers are used.
function harness(initialArgs) {
  const slots = [], effects = [], reads = [], channels = new Set(), timers = new Set();
  let index = 0, dirty = false, args = initialArgs, output, mounted = true;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const slotIndex = index++;
      if (!slots[slotIndex]) slots[slotIndex] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[slotIndex].value, next => {
        const value = typeof next === 'function' ? next(slots[slotIndex].value) : next;
        if (!Object.is(value, slots[slotIndex].value)) { slots[slotIndex].value = value; dirty = true; }
      }];
    },
    useCallback(callback, deps) {
      const i = index++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: callback };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = index++;
      if (!slots[i] || !same(slots[i].deps, deps)) {
        const previous = slots[i]; slots[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
  };
  const supabase = {
    from() { return { select() { return this; }, eq(_key, electionId) {
      return new Promise(resolve => reads.push({ electionId, resolve }));
    } }; },
    channel() {
      const channel = { on(_type, _filter, callback) { this.callback = callback; return this; }, subscribe() { channels.add(this); return this; } };
      return channel;
    },
    removeChannel(channel) { channels.delete(channel); },
  };
  const source = readFileSync(new URL('../src/hooks/useBufferedVoteCount.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require(name) { if (name === 'react') return react; if (name === '@/integrations/supabase/client') return { supabase }; throw Error(name); },
    setInterval(callback) { timers.add(callback); return callback; }, clearInterval(callback) { timers.delete(callback); },
  });
  function render(nextArgs = args) {
    assert.equal(mounted, true); args = nextArgs; index = 0; dirty = false;
    output = exports.useBufferedVoteCount(...args);
    effects.splice(0).forEach(effect => effect());
    return output;
  }
  async function settle() {
    for (let i = 0; i < 8; i++) { await Promise.resolve(); if (mounted && dirty) render(); }
    return output;
  }
  render();
  return { reads, timers, channels, render, settle, get value() { return output; },
    emit() { [...channels].forEach(channel => channel.callback()); },
    async respond(i, count, error = null) { reads[i].resolve({ count, error }); return settle(); },
    unmount() { mounted = false; slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('real buffered-count hook exposes initial failure, preserves confirmed counts on error and retains exact release rules', async () => {
  const h = harness(['a', 20, false]);
  assert.equal(h.value.hasSnapshot, false);
  await h.respond(0, null, { message: 'denied' });
  assert.equal(h.value.isError, true);
  assert.equal(h.value.hasSnapshot, false);
  h.value.retry(); await h.settle();
  await h.respond(1, 7);
  assert.equal(h.value.realCount, 7);
  assert.equal(h.value.displayedCount, 5);
  h.emit(); await h.respond(2, null, { message: 'network' });
  assert.equal(h.value.isError, true);
  assert.equal(h.value.realCount, 7);
  assert.equal(h.value.displayedCount, 5);
  h.emit(); await h.respond(3, 12);
  assert.equal(h.value.displayedCount, 10);
  h.render(['a', 20, true]); await h.settle();
  assert.equal(h.value.displayedCount, 12, 'force releases the exact count');
  h.render(['a', 20, false]); h.emit(); await h.respond(4, 8);
  assert.equal(h.value.displayedCount, 12, 'an unforced lower batch does not retract a released count');
  h.render(['a', 8, false]); await h.settle();
  assert.equal(h.value.displayedCount, 8, 'capacity releases the exact count as before');
  h.emit(); await h.respond(5, null);
  assert.equal(h.value.isError, true, 'a missing count is unavailable, not a confirmed zero');
  h.unmount();
});

test('real hook isolates election switches, coalesces in-flight events and rejects responses after cleanup', async () => {
  const h = harness(['a', 100, false]);
  await h.respond(0, 25);
  assert.equal(h.value.displayedCount, 25);
  h.emit(); // second A read stays pending
  const switched = h.render(['b', 100, false]);
  assert.equal(switched.hasSnapshot, false, 'the old election is hidden before effects commit');
  assert.equal(switched.displayedCount, 0);
  h.emit(); h.emit(); h.emit(); // B must queue at most one reread
  await h.respond(1, 99);
  assert.equal(h.reads.length, 3, 'old completion must not release the new queue');
  assert.equal(h.value.hasSnapshot, false);
  await h.respond(2, 7);
  assert.equal(h.value.displayedCount, 5, 'last released A batch cannot leak into B');
  assert.equal(h.reads.length, 4, 'three overlapping events become one reread');
  assert.equal(h.reads[3].electionId, 'b');
  h.unmount();
  await h.respond(3, 99);
  assert.equal(h.value.displayedCount, 5);
  assert.equal(h.channels.size, 0);
  assert.equal(h.timers.size, 0);
});
