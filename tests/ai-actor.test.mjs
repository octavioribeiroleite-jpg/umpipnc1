import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAiActor } from '../supabase/functions/_shared/ai-actor.ts';

const userId = '11111111-1111-4111-8111-111111111111';
function client({ active = true, roles = ['visualizador'], authError = null, dbError = null } = {}) {
  return {
    auth: { getUser: async token => {
      assert.equal(token, 'fake-token');
      return { data: { user: { id: userId, user_metadata: { role: 'admin', society_id: 'attacker' } } }, error: authError };
    } },
    from(table) {
      const result = table === 'user_roles'
        ? { data: roles.map(role => ({role})), error: dbError }
        : { data: { active, society_id: 'real-society' }, error: dbError };
      return { select: () => ({ eq: (column,value) => {
        assert.equal(column,'user_id'); assert.equal(value,userId);
        return { ...Promise.resolve(result), then: Promise.resolve(result).then.bind(Promise.resolve(result)), maybeSingle: async () => result };
      } }) };
    },
  };
}
test('verified database roles override user-editable metadata', async () => {
  assert.deepEqual(await resolveAiActor(client(),'Bearer fake-token'), { userId, roles:['visualizador'], societyId:'real-society' });
});
test('missing or invalid auth, inactive profile and lookup failure deny AI', async () => {
  assert.equal(await resolveAiActor({},null),null);
  assert.equal(await resolveAiActor({},'Basic ignored'),null);
  for (const options of [{active:false},{authError:'invalid'},{dbError:'unavailable'}]) {
    assert.equal(await resolveAiActor(client(options),'Bearer fake-token'),null);
  }
});
