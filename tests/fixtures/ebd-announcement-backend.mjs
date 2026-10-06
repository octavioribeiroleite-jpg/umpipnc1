import { createEbdBirthdayTokens } from '../../supabase/functions/_shared/ebd-birthday-token.ts';
import { loadEdgeSource } from './portal-session-backend.mjs';

const source = await loadEdgeSource('generate-birthday-announcement/index.ts');
const config = { issuer: 'https://synthetic-ebd.test', secret: 'synthetic-service-secret-at-least-thirty-two-characters' };
export const syntheticClassId = '22222222-2222-4222-8222-222222222222';

// Execute the real endpoint and real token verification with no HTTP Auth/AI,
// network, credentials or production records. `source` supports a read-only
// before/after reproduction using a separately supplied historical source.
export function announcementFixture(options = {}) {
  const state = { classActive: true, classExists: true, passwordActive: true,
    credential: 'synthetic-class-hash', adminCredential: 'synthetic-admin-credential', ...options.state };
  const calls = [];
  let handler;
  const admin = { from(table) {
    const filters = {}; let columns;
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filters[key] = value; return query; },
      async maybeSingle() {
        calls.push({ table, columns, filters });
        if (options.databaseError) return { data: null, error: { message: 'Synthetic database failure' } };
        if (table === 'settings') return { data: { value: state.adminCredential }, error: null };
        if (table !== 'ebd_class_passwords') throw Error('Unexpected synthetic table');
        const allowed = state.passwordActive && filters.class_id === syntheticClassId
          && (filters['ebd_classes.active'] !== true || (state.classExists && state.classActive));
        return { data: allowed ? { pin_hash: state.credential,
          ebd_classes: state.classExists ? { active: state.classActive } : null } : null, error: null };
      },
    };
    return query;
  } };
  const Deno = { env: { get: name => ({ SUPABASE_URL: config.issuer, SUPABASE_SERVICE_ROLE_KEY: config.secret })[name] } };
  const limiter = () => ({ async aiGeneration() { calls.push('limit'); return { allowed: true }; } });
  const ai = async () => { calls.push('ai'); return Response.json({ choices: [{ message: { content: 'Synthetic announcement' } }] }); };
  new Function('serve', 'Deno', 'createClient', 'createEbdBirthdayTokens', 'serverLimiter', 'openAIChat', options.source ?? source)(
    value => { handler = value; }, Deno, () => admin, createEbdBirthdayTokens, limiter, ai,
  );
  const tokens = createEbdBirthdayTokens(config);
  const issue = async (kind = 'class') => (await tokens.issue(kind === 'class'
    ? { kind, id: syntheticClassId } : { kind: 'admin', id: 'secretaria' },
    kind === 'class' ? state.credential : state.adminCredential)).token;
  const request = async token => handler(new Request('https://synthetic.test/announcement', { method: 'POST',
    body: JSON.stringify({ ebd_ai_token: token, birthdays: [{ nome: 'Synthetic Birthday', dia: 6, mes: 10 }] }) }));
  return { state, calls, issue, request };
}
