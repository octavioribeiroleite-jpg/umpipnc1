import test from 'node:test';
import assert from 'node:assert/strict';

function fakeStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
async function withFixture(run) {
  const names = ['location', 'document', 'localStorage', 'sessionStorage'];
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperties(globalThis, {
    location: { configurable: true, value: { search: '?edge=0&auth=0&read=0&authfail=1' } },
    document: { configurable: true, value: { body: { dataset: { benchmarkRevision: 'fixture-unit', benchmarkSourceHash: 'synthetic' } } } },
    localStorage: { configurable: true, value: fakeStorage() },
    sessionStorage: { configurable: true, value: fakeStorage() },
  });
  try { await run(await import(`./fixtures/ebd-login/backend.ts?unit=${Math.random()}`)); }
  finally { for (const name of names) { if (previous[name]) Object.defineProperty(globalThis, name, previous[name]); else delete globalThis[name]; } }
}

test('isolated login transport rejects unauthenticated reads, wrong PIN and failed confirmation; retry accepts only synthetic access', async () => {
  await withFixture(async ({ supabase, fixture }) => {
    const forbidden = await supabase.rpc('list_birthdays');
    assert.equal(forbidden.status, 403);
    assert.equal(fixture.requests[0].authenticated, false);
    const wrong = await supabase.functions.invoke('manage-ebd-class-password', { body: { admin_pin: '000000' } });
    assert.equal(wrong.data.success, false);
    assert.equal(fixture.authenticated, false);
    assert.equal(fixture.requests.some(request => request.endpoint.startsWith('auth.')), false);
    const valid = await supabase.functions.invoke('ebd-class-login', { body: { pin: '123456', name: 'Synthetic Teacher' } });
    assert.equal(valid.data.teacher.name, 'Synthetic Teacher');
    const failed = await supabase.auth.setSession(valid.data.session);
    assert.equal(failed.error.code, 'FIXTURE_AUTH');
    assert.equal((await supabase.auth.getSession()).data.session, null);
    const retry = await supabase.auth.setSession(valid.data.session);
    assert.equal(retry.error, null);
    assert.equal(fixture.authenticated, true);
    const rows = await supabase.from('ebd_students').select('*').eq('active', true);
    assert.equal(rows.data.length, 8);
    assert.equal(fixture.requests.at(-1).authenticated, true);
    assert.ok(fixture.requests.every(request => request.ended >= request.started));
    for (const method of ['insert', 'update', 'delete', 'upsert']) assert.throws(() => supabase.from('ebd_students')[method]({}), /disallows data writes/);
  });
});
