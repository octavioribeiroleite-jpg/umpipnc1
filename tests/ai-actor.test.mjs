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

test('a server-verified user avoids a second Auth lookup and still requires the server profile and roles', async () => {
  const knownUser = { id: userId, app_metadata: {}, user_metadata: { role: 'admin' } };
  const verified = client();
  verified.auth.getUser = () => { throw Error('duplicate Auth lookup'); };
  assert.deepEqual(await resolveAiActor(verified, 'Bearer fake-token', knownUser), { userId, roles: ['visualizador'], societyId: 'real-society' });
  for (const options of [{ active: false }, { dbError: 'unavailable' }]) {
    const denied = client(options);
    denied.auth.getUser = verified.auth.getUser;
    assert.equal(await resolveAiActor(denied, 'Bearer fake-token', knownUser), null);
  }
  assert.equal(await resolveAiActor(verified, 'Basic ignored', knownUser), null);
});
