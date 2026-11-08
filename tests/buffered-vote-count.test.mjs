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
    rpc(name, params) {return new Promise(resolve=>reads.push({name,electionId:params.p_election_id,round:args[1] || 1,resolve}));},
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
    async respond(i, count, error = null) { reads[i].resolve({ data: count === null ? null : {election_id:reads[i].electionId,ballots:count,current_round:reads[i].round,total_present:150}, error }); return settle(); },
    async respondRows(i, data, error = null) { reads[i].resolve({ data, error }); return settle(); },
    unmount() { mounted = false; slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('anonymous participation is exact at 149 of 150 and preserves the last verified count on error', async () => {
  const h = harness(['a', 1]);
  assert.equal(h.value.hasSnapshot, false);
  await h.respond(0, null, { message: 'denied' });
  assert.equal(h.value.isError, true);
  assert.equal(h.value.hasSnapshot, false);
  h.value.retry(); await h.settle();
  await h.respond(1, 149);
  assert.equal(h.value.realCount, 149);
  assert.equal(h.value.displayedCount, 149, 'participation must never be rounded down to 145');
  assert.equal(h.reads[1].name, 'election_public_count', 'only request the public anonymous aggregate');
  h.emit(); await h.respond(2, null, { message: 'network' });
  assert.equal(h.value.isError, true);
  assert.equal(h.value.displayedCount, 149);
  h.emit(); await h.respond(3, 150);
  assert.equal(h.value.displayedCount, 150);
  h.emit(); await h.respond(4, null);
  assert.equal(h.value.isError, true, 'a missing count is unavailable, not a confirmed zero');
  assert.equal(h.value.displayedCount, 150);
  h.unmount();
});

test('real hook isolates election and round switches, coalesces in-flight events and rejects responses after cleanup', async () => {
  const h = harness(['a', 1]);
  await h.respond(0, 25);
  assert.equal(h.value.displayedCount, 25);
  h.emit();
  const switched = h.render(['b', 1]);
  assert.equal(switched.hasSnapshot, false);
  assert.equal(switched.displayedCount, 0);
  h.emit(); h.emit(); h.emit();
  await h.respond(1, 99);
  assert.equal(h.reads.length, 3, 'old completion must not release the new queue');
  assert.equal(h.value.hasSnapshot, false);
  await h.respond(2, 7);
  assert.equal(h.value.displayedCount, 7);
  assert.equal(h.reads.length, 4, 'three overlapping events become one reread');
  assert.equal(h.reads[3].electionId, 'b');
  const secondRound = h.render(['b', 2]);
  assert.equal(secondRound.hasSnapshot, false, 'the first round count must disappear synchronously');
  assert.equal(secondRound.displayedCount, 0);
  await h.respond(3, 8);
  assert.equal(h.value.hasSnapshot, false, 'a late first-round response cannot leak into the second round');
  assert.equal(h.reads[4].round, 2);
  await h.respond(4, 3);
  assert.equal(h.value.displayedCount, 3);
  h.emit();h.unmount();
  await h.respond(5, 99);
  assert.equal(h.value.displayedCount, 3);
  assert.equal(h.channels.size, 0);
  assert.equal(h.timers.size, 0);
});

test('public aggregate remains exact for multiple marks per ballot and rejects malformed or wrong-round responses',async()=>{
 const h=harness(['multi',2]);
 await h.respondRows(0,{election_id:'multi',ballots:400,current_round:2,total_present:400});
 assert.equal(h.value.displayedCount,400,'aggregate counts ballots instead of candidate and blank marks');
 h.emit();await h.respondRows(1,{election_id:'multi',ballots:1200,current_round:1,total_present:400});
 assert.equal(h.value.isError,true);assert.equal(h.value.displayedCount,400,'a previous-round count cannot overwrite current participation');
 h.emit();await h.respondRows(2,{election_id:'multi',ballots:-1,current_round:2,total_present:400});
 assert.equal(h.value.isError,true);assert.equal(h.value.displayedCount,400);
 h.emit();await h.respondRows(3,{election_id:'multi',ballots:1.5,current_round:2,total_present:400});
 assert.equal(h.value.isError,true);
 h.emit();await h.respondRows(4,{election_id:'multi',ballots:0,current_round:2,total_present:400});
 assert.equal(h.value.isError,false);assert.equal(h.value.displayedCount,0);assert.equal(h.value.hasSnapshot,true);
 h.unmount();
});
