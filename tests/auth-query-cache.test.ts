import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { createAuthQueryCacheBoundary } from '../src/lib/auth-query-cache.ts';

const createClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 300_000, gcTime: Infinity, retry: false } } });

test('reproduction: a fresh account-agnostic query otherwise survives a change of identity', async () => {
  const client = createClient();
  await client.fetchQuery({ queryKey: ['profiles'], queryFn: async () => ['Fictício A'] });
  const nextAccount = await client.fetchQuery({ queryKey: ['profiles'], queryFn: async () => ['Fictício B'] });
  assert.deepEqual(nextAccount, ['Fictício A']);
  client.clear();
});

for (const logoutFirst of [false, true]) {
  test(`account transition ${logoutFirst ? 'through logout' : 'directly'} cannot reuse the former fresh snapshot`, async () => {
    const client = createClient();
    const transition = createAuthQueryCacheBoundary(client);
    transition('fixture-user-a');
    await client.fetchQuery({ queryKey: ['profiles'], queryFn: async () => ['Fictício A'] });
    client.setQueryData(['tasks', 'same-society'], ['Tarefa fictícia A']);
    if (logoutFirst) transition(null);
    transition('fixture-user-b');
    assert.equal(client.getQueryData(['profiles']), undefined);
    assert.equal(client.getQueryData(['tasks', 'same-society']), undefined);
    assert.deepEqual(await client.fetchQuery({ queryKey: ['profiles'], queryFn: async () => ['Fictício B'] }), ['Fictício B']);
    client.clear();
  });
}

test('same-account refresh preserves its data and account changes preserve the independent treasury session', () => {
  const client = createClient();
  const transition = createAuthQueryCacheBoundary(client);
  transition('fixture-user-a');
  client.setQueryData(['profiles'], ['Fictício A']);
  client.setQueryData(['treasury', 'dashboard', 'fixture-treasurer'], { amount_cents: 123 });
  client.setQueryData(['treasury-directory'], ['Sociedade fictícia']);
  transition('fixture-user-a');
  assert.deepEqual(client.getQueryData(['profiles']), ['Fictício A']);
  transition(null);
  assert.equal(client.getQueryData(['profiles']), undefined);
  assert.deepEqual(client.getQueryData(['treasury', 'dashboard', 'fixture-treasurer']), { amount_cents: 123 });
  assert.deepEqual(client.getQueryData(['treasury-directory']), ['Sociedade fictícia']);
  client.clear();
});

test('late response from the previous account is cancelled and cannot repopulate the cache', async () => {
  const client = createClient();
  const transition = createAuthQueryCacheBoundary(client);
  transition('fixture-user-a');
  let release!: (value: string[]) => void;
  let aborted = false;
  const read = client.fetchQuery({ queryKey: ['files', {}, 'same-society'], queryFn: ({ signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Promise<string[]>(resolve => { release = resolve; });
  } });
  const rejected = assert.rejects(read);
  transition('fixture-user-b');
  release(['Arquivo fictício A']);
  await rejected;
  assert.equal(aborted, true);
  assert.equal(client.getQueryData(['files', {}, 'same-society']), undefined);
  client.clear();
});
