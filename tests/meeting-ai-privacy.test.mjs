import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { loadEdgeSource } from './fixtures/portal-session-backend.mjs';
import { resolveAiActor } from '../supabase/functions/_shared/ai-actor.ts';
import { canSummarizeStudy } from '../supabase/functions/_shared/ai-auth-policy.ts';
import { loadMeetingAiProfiles, resolveMeetingTaskAssigneeId } from '../supabase/functions/_shared/meeting-ai-profiles.ts';

// Real handler, authorization and minimization helpers; no network, real users,
// credentials, model requests or production records. The override reproduces
// the regression against an independently saved historical handler.
const source = process.env.IPNC_MEETING_AI_SOURCE
  ? (await transform(readFileSync(process.env.IPNC_MEETING_AI_SOURCE, 'utf8'), { loader: 'ts', format: 'esm' })).code
    .replace(/^import .*;$/gm, '').replace(/export\s*\{[\s\S]*?\};?/g, '')
  : await loadEdgeSource('auto-process-meeting/index.ts');
const ids = Array.from({ length: 11 }, (_, i) => `${(i + 1).toString(16).padStart(8, '0')}-1111-4111-8111-${(i + 1).toString(16).padStart(12, '0')}`);
const [actorId, societyA, societyB, foreignId, ownId, globalAdminId, globalPastorId, inactiveId, historicId, meetingId, inactiveAdminId] = ids;
const names = {
  actor: 'Synthetic moderator', own: 'Synthetic own assignee', foreign: 'Synthetic unrelated foreign profile',
  admin: 'Synthetic global administrator', pastor: 'Synthetic global pastor',
  inactive: 'Synthetic inactive unrelated profile', historic: 'Synthetic historical participant',
  inactiveAdmin: 'Synthetic inactive administrator',
};

async function fixture(options = {}) {
  const role = options.role ?? 'diretoria';
  const profiles = [
    { user_id: actorId, full_name: names.actor, active: true, society_id: societyA },
    { user_id: ownId, full_name: names.own, active: true, society_id: societyA },
    { user_id: foreignId, full_name: names.foreign, active: true, society_id: societyB },
    { user_id: globalAdminId, full_name: names.admin, active: true, society_id: null },
    { user_id: globalPastorId, full_name: names.pastor, active: true, society_id: societyB },
    { user_id: inactiveId, full_name: names.inactive, active: false, society_id: societyA },
    { user_id: historicId, full_name: names.historic, active: false, society_id: societyB },
    { user_id: inactiveAdminId, full_name: names.inactiveAdmin, active: false, society_id: null },
  ];
  const roles = [
    { user_id: actorId, role }, { user_id: globalAdminId, role: 'admin' },
    { user_id: globalPastorId, role: 'pastor' }, { user_id: inactiveAdminId, role: 'admin' },
  ];
  const meeting = { id: meetingId, society_id: options.foreignMeeting ? societyB : societyA,
    title: 'Synthetic authorized meeting', date: '2026-10-07T10:00:00Z', moderator_id: actorId,
    meeting_notes: options.legacy ? '' : 'Synthetic authorized notes' };
  const user = { id: actorId, app_metadata: {} };
  const calls = [], modelPayloads = [], taskRows = [];
  const admin = {
    auth: { getUser: async () => ({ data: { user: options.authDenied ? null : user }, error: null }) },
    from(table) {
      let operation = 'read', columns = '*', payload;
      const eq = {}, inside = {};
      const result = (single = false) => {
        calls.push({ table, operation, columns, eq: { ...eq }, inside: structuredClone(inside) });
        if (operation !== 'read') {
          if (table === 'tasks' && operation === 'insert') taskRows.push(structuredClone(payload));
          return { data: null, error: null };
        }
        if (options.failTable === table || (options.failGlobalRoles && table === 'user_roles' && inside.role)) return { data: null, error: { message: 'Synthetic private read failure' } };
        let data = table === 'profiles' ? profiles : table === 'user_roles' ? roles
          : table === 'meetings' ? [meeting] : table === 'meeting_participants' ? [{ user_id: actorId, meeting_id: meetingId }, { user_id: historicId, meeting_id: meetingId }]
          : table === 'contributions' ? [{ user_id: historicId, content: 'Synthetic historical contribution', meeting_id: meetingId, status: 'revealed' }]
          : [];
        data = data.filter(row => Object.entries(eq).every(([k, v]) => row[k] === v)
          && Object.entries(inside).every(([k, values]) => values.includes(row[k])));
        if (columns !== '*') data = data.map(row => Object.fromEntries(columns.split(',').map(k => k.trim()).map(k => [k, row[k]])));
        return { data: single ? data[0] ?? null : data, error: null };
      };
      const query = {
        select(value = '*') { columns = value; return query; },
        eq(k, v) { eq[k] = v; return query; }, in(k, values) { inside[k] = values; return query; },
        order() { return query; }, limit() { return query; }, gte() { return query; }, lte() { return query; },
        delete() { operation = 'delete'; return query; }, update(value) { operation = 'update'; payload = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        single: async () => result(true), maybeSingle: async () => result(true),
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return query;
    },
  };
  const caller = { auth: { getUser: admin.auth.getUser } };
  const ai = async input => {
    modelPayloads.push(input);
    const tool = input.tool_choice?.function?.name;
    const args = tool === 'extract_events' ? { events: [] } : { tasks: (options.taskAssignees ?? []).map((assignee_id, i) => ({ title: `Synthetic task ${i}`, priority: 'medium', assignee_id })) };
    const message = tool ? { tool_calls: [{ function: { name: tool, arguments: JSON.stringify(args) } }] }
      : { content: modelPayloads.length === 1 ? JSON.stringify({ items: [] }) : 'Synthetic minutes' };
    return Response.json({ choices: [{ message }] });
  };
  const Deno = { env: { get: name => ({ SUPABASE_URL: 'https://synthetic-only.test', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', SUPABASE_ANON_KEY: 'synthetic-anon' })[name] } };
  let handler;
  new Function('serve', 'Deno', 'createClient', 'resolveAiActor', 'canSummarizeStudy', 'loadMeetingAiProfiles', 'resolveMeetingTaskAssigneeId', 'serverLimiter', 'openAIChat', 'console', source)(
    value => { handler = value; }, Deno, (_url, key) => key === 'synthetic-service' ? admin : caller,
    resolveAiActor, canSummarizeStudy, loadMeetingAiProfiles, resolveMeetingTaskAssigneeId,
    () => ({ aiGeneration: async () => ({ allowed: true }) }), ai, { log() {}, error() {} },
  );
  const response = await handler(new Request('https://synthetic-only.test/auto-process-meeting', {
    method: 'POST', headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingId }),
  }));
  const roster = modelPayloads.find(p => p.tool_choice?.function?.name === 'extract_tasks')?.messages[0].content ?? '';
  return { response, calls, modelPayloads, roster, taskRows };
}

test('Diretoria sends only active same-society and global admin/pastor assignees to the model', async () => {
  const f = await fixture();
  assert.equal(f.response.status, 200);
  assert.equal(f.modelPayloads.length, 5);
  for (const name of [names.actor, names.own, names.admin, names.pastor]) assert.ok(f.roster.includes(name), name);
  for (const name of [names.foreign, names.inactive, names.historic, names.inactiveAdmin]) assert.ok(!f.roster.includes(name), name);
  const allPayloads = JSON.stringify(f.modelPayloads);
  assert.ok(!allPayloads.includes(names.foreign));
  assert.ok(!allPayloads.includes(foreignId));
  assert.ok(!allPayloads.includes(names.inactive));
  assert.ok(!allPayloads.includes(inactiveId));
  assert.ok(f.calls.filter(c => c.table === 'profiles').every(c => Object.keys(c.eq).length || Object.keys(c.inside).length), 'profile reads must have an explicit scope');
});

test('administrator preserves a global active assignee roster', async () => {
  const f = await fixture({ role: 'admin' });
  assert.equal(f.response.status, 200);
  for (const name of [names.own, names.foreign, names.admin, names.pastor]) assert.ok(f.roster.includes(name), name);
  for (const name of [names.inactive, names.historic, names.inactiveAdmin]) assert.ok(!f.roster.includes(name), name);
});

test('names of actual historical moderator/participants survive inactive or transferred profiles', async () => {
  const f = await fixture();
  const minutesInput = f.modelPayloads[1].messages[1].content;
  assert.ok(minutesInput.includes(names.actor));
  assert.ok(minutesInput.includes(names.historic));
  assert.ok(!f.roster.includes(names.historic));
  assert.ok(!JSON.stringify(f.modelPayloads).includes(names.foreign));
});

test('legacy revealed contributions retain actual author names without including unrelated profiles', async () => {
  const f = await fixture({ legacy: true });
  assert.equal(f.response.status, 200);
  assert.ok(f.modelPayloads[0].messages[1].content.includes(`[${names.historic}]: Synthetic historical contribution`));
  assert.ok(!JSON.stringify(f.modelPayloads).includes(names.foreign));
});

test('model-supplied foreign, inactive or malformed assignees are left null; valid assignees survive', async () => {
  const values = [ownId, globalAdminId, globalPastorId, foreignId, inactiveId, inactiveAdminId, 'not-a-uuid'];
  const f = await fixture({ taskAssignees: values });
  assert.equal(f.response.status, 200);
  assert.deepEqual(f.taskRows.map(row => row.assignee_id), [ownId, globalAdminId, globalPastorId, null, null, null, null]);
  assert.ok(f.taskRows.every(row => row.society_id === societyA && row.meeting_id === meetingId));
});

test('visualizador, Pastor, invalid Auth and foreign meeting cannot reach model calls or business writes', async () => {
  for (const options of [{ role: 'visualizador' }, { role: 'pastor' }, { authDenied: true }, { foreignMeeting: true }]) {
    const f = await fixture(options);
    assert.ok([401, 403].includes(f.response.status));
    assert.equal(f.modelPayloads.length, 0);
    assert.ok(f.calls.every(c => c.operation === 'read'));
  }
});

test('failed profile, participant or contribution lookups stop before model calls and business writes', async () => {
  for (const options of [{ failTable: 'profiles' }, { failGlobalRoles: true }, { failTable: 'meeting_participants' }, { legacy: true, failTable: 'contributions' }]) {
    const f = await fixture(options);
    assert.ok([403, 500].includes(f.response.status));
    assert.equal(f.modelPayloads.length, 0);
    assert.ok(f.calls.every(c => c.operation === 'read'));
    assert.ok(!(await f.response.text()).includes('Synthetic private read failure'));
  }
});
