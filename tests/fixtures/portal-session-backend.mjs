import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { webcrypto } from 'node:crypto';

export async function loadEdgeSource(path) {
  const source = readFileSync(new URL(`../../supabase/functions/${path}`, import.meta.url), 'utf8');
  const compiled = await transform(source, { loader: 'ts', format: 'esm' });
  return compiled.code.replace(/^import .*;$/gm, '').replace(/export\s*\{[\s\S]*?\};?/g, '');
}

const portalSource = await loadEdgeSource('_shared/portal-account.ts');
const copy = value => structuredClone(value);

// No network or real Auth. Costs below are an explicit synthetic model, not
// production measurements or bcrypt benchmarks.
export const syntheticCosts = { 'profile-read': 60, 'auth-get': 100, 'auth-update-password': 240,
  'auth-update-metadata': 40, 'auth-create': 300, 'profile-write': 60, 'role-upsert': 60, 'sign-in': 200 };

export function portalFixture(options = {}) {
  const namespace = options.namespace ?? 'ebd', id = options.id ?? 'admin';
  const userId = options.userId ?? '11111111-1111-4111-8111-111111111111';
  const state = {
    url: 'https://synthetic-project.test', secret: 'synthetic-service-secret-at-least-thirty-two-characters',
    now: options.now ?? Math.floor(Date.now() / 1000),
    profile: options.newAccount ? null : { user_id: userId, active: true, society_id: null, ...options.profile },
    user: options.newAccount ? null : { id: userId, email: `portal-${namespace}-${id}@ipnc.local`,
      app_metadata: { ipnc_portal: { namespace, id, fingerprint: 'legacy', issued_at: 1 } }, ...options.user },
    ...options.state,
  };
  const calls = [];
  const record = (kind, details = {}) => { calls.push({ kind, ...copy(details) }); };
  const error = kind => options.fail === kind ? { message: `synthetic ${kind} failure` } : null;
  const admin = {
    from(table) {
      let columns = '', payload, operation = 'read';
      const query = {
        select(value) { columns = value; return query; }, eq() { return query; },
        update(value) { payload = value; operation = 'write'; return query; },
        upsert(value) { payload = value; operation = 'role'; return query; },
        async maybeSingle() {
          record('profile-read', { columns });
          const projected = state.profile && Object.fromEntries(columns.split(',').map(key => [key, state.profile[key]]));
          return { data: copy(projected), error: error('lookup') };
        },
        async single() {
          record('profile-write', { payload });
          if (!error('profile-write')) state.profile = { ...state.profile, user_id: userId, ...copy(payload) };
          return { data: { user_id: userId }, error: error('profile-write') };
        },
        then(resolve, reject) {
          record(operation === 'role' ? 'role-upsert' : `${table}-${operation}`, { payload });
          return Promise.resolve({ error: error('role-upsert') }).then(resolve, reject);
        },
      };
      return query;
    },
    auth: { admin: {
      async getUserById(id) { record('auth-get', { id }); return { data: { user: copy(state.user) }, error: error('auth-get') }; },
      async updateUserById(id, payload) {
        record('password' in payload ? 'auth-update-password' : 'auth-update-metadata', { id, payload });
        if (!error('auth-update')) state.user = { ...state.user, ...copy(payload) };
        return { data: { user: copy(state.user) }, error: error('auth-update') };
      },
      async createUser(payload) {
        record('auth-create', { payload });
        state.user = { id: userId, ...copy(payload) };
        state.profile = { user_id: userId, active: true, society_id: null };
        return { data: { user: copy(state.user) }, error: error('auth-create') };
      },
    } },
  };
  const login = { auth: { async signInWithPassword(payload) {
    record('sign-in', { payload });
    return { data: { session: error('sign-in') ? null : {
      access_token: `fixture.${Buffer.from(JSON.stringify({ sub: userId, app_metadata: state.user.app_metadata })).toString('base64url')}.unsigned`,
      refresh_token: 'synthetic-refresh-token',
    } }, error: error('sign-in') };
  } } };
  const createClient = (_url, key) => key === state.secret ? admin : login;
  const Deno = { env: { get: name => ({ SUPABASE_URL: state.url, SUPABASE_SERVICE_ROLE_KEY: state.secret, SUPABASE_ANON_KEY: 'synthetic-anon' })[name] } };
  const portalSession = new Function('createClient', 'Deno', 'crypto', 'Date', `${portalSource}; return portalSession;`)(createClient, Deno, webcrypto, { now: () => state.now * 1000 });
  const input = { namespace, id, name: 'Synthetic portal', credential: options.credential ?? 'synthetic-credential', ...options.input };
  return { state, calls, input, portalSession, run: (overrides = {}) => portalSession({ ...input, ...overrides }),
    cost: () => calls.reduce((sum, call) => sum + (syntheticCosts[call.kind] ?? 0), 0),
    reset: () => { calls.length = 0; } };
}
