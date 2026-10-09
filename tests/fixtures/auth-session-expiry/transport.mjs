import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
export const actorId = '00000000-0000-4000-8000-000000000001';
const societyId = '00000000-0000-4000-8000-000000000011';
export function createFixture({ session = true } = {}) {
  const store = new Map(), reads = [], requests = [], events = [];
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  const storageKey = 'isolated-ipnc-session-expiry';
  let user = { id: actorId, email: 'director.fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' };
  let refreshMode = 'missing';
  function makeSession(duration = 3600) {
    const now = Math.floor(Date.now()/1000);
    const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: now + duration, iat: now })).toString('base64url') + '.fixture';
    return { user, access_token: token, refresh_token: 'fixture-refresh-only', token_type: 'bearer', expires_at: now + duration, expires_in: duration };
  }
  if (session) storage.setItem(storageKey, JSON.stringify(makeSession()));
  const authClient = createClient('https://fixture.invalid', 'fixture-anon-only', { auth: { storage, storageKey, autoRefreshToken: false, detectSessionInUrl: false, persistSession: true, lock: async (_name, _timeout, work) => work() }, global: { fetch: async (input, init) => {
    const url = new URL(String(input)); requests.push({ path: url.pathname, method: init?.method ?? 'GET', grant: url.searchParams.get('grant_type') });
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' } });
    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'refresh_token') return refreshMode === 'missing' ? reply({ code: 'refresh_token_not_found', msg: 'Fixture refresh token not found' }, 400) : reply(makeSession(7200));
    if (url.pathname.endsWith('/user')) return reply(user);
    if (url.pathname.endsWith('/logout')) return reply({});
    throw new Error('Unexpected auth transport path');
  } } });
  const profile = { id: 'fixture-profile', user_id: actorId, full_name: 'Diretor fictício A', email: user.email, username: 'fixture-director', avatar_url: null, phone: null, active: true, society_id: societyId };
  const tables = { profiles: [profile], user_roles: [{ user_id: actorId, role: 'diretoria' }], societies: [{ id: societyId, name: 'Sociedade fictícia A', slug: 'ump', color: '#277463' }] };
  function from(table) {
    let single = false; const filters = [];
    const query = { select() { return query; }, eq(column, value) { filters.push([column, value]); return query; }, abortSignal() { return query; }, maybeSingle() { single = true; return query; }, then(resolve, reject) {
      const authorized = !!storage.getItem(storageKey); reads.push({ table, filters, authorized });
      if (!authorized) return Promise.resolve({ data: null, error: { code: '42501', message: 'Fixture RLS denies private reads without session' } }).then(resolve, reject);
      const rows = (tables[table] ?? []).filter(row => filters.every(([column, value]) => row[column] === value));
      return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
    } };
    return query;
  }
  authClient.auth.onAuthStateChange((event, nextSession) => { events.push({event, hasSession: !!nextSession}); });
  const client = { auth: authClient.auth, from, functions: { invoke: async () => { throw new Error('Function/model invocation forbidden in auth fixture'); } } };
  function setActor(nextId) {
    const nextSocietyId = '00000000-0000-4000-8000-000000000012';
    user = {...user, id: nextId, email: 'viewer.fixture@example.invalid'};
    tables.profiles = [{...profile, user_id: nextId, full_name: 'Visualizador fictício B', society_id: nextSocietyId}];
    tables.user_roles = [{user_id: nextId, role: 'visualizador'}];
    tables.societies = [{id: nextSocietyId, name: 'Sociedade fictícia B', slug: 'saf', color: '#277463'}];
  }
  return { client, storage, storageKey, profile, reads, requests, events, makeSession, setActor, setRefreshMode: mode => { refreshMode = mode; }, hasStoredSession: () => !!storage.getItem(storageKey) };
}
